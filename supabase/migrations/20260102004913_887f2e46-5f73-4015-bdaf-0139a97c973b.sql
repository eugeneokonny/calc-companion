-- Create account_status enum
CREATE TYPE public.account_status AS ENUM ('active', 'deactivated', 'suspended', 'pending_deletion');

-- Update profiles table with new fields
ALTER TABLE public.profiles 
ADD COLUMN email TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN account_status public.account_status NOT NULL DEFAULT 'active',
ADD COLUMN deletion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deletion_scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN privacy_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN lockout_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_failed_login_at TIMESTAMP WITH TIME ZONE;

-- Create login_history table
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_sessions table for managing active sessions
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Create login_attempts table for brute-force protection
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on all new tables
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_history
CREATE POLICY "Users can view their own login history"
ON public.login_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert login history"
ON public.login_history FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all login history"
ON public.login_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions"
ON public.user_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
ON public.user_sessions FOR ALL
WITH CHECK (true);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for login_attempts (admin only for viewing)
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert login attempts"
ON public.login_attempts FOR INSERT
WITH CHECK (true);

-- Updated profiles policies for admins
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_login_at ON public.login_history(login_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at DESC);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND lockout_until IS NOT NULL
      AND lockout_until > now()
  )
$$;

-- Function to check failed login attempts and lock if needed (1 hour lockout after 5 attempts)
CREATE OR REPLACE FUNCTION public.check_and_update_login_attempts(_user_id uuid, _success boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INTEGER;
  lockout_time TIMESTAMP WITH TIME ZONE;
BEGIN
  IF _success THEN
    -- Reset on successful login
    UPDATE public.profiles 
    SET failed_login_attempts = 0, 
        lockout_until = NULL,
        last_login_at = now()
    WHERE id = _user_id;
    RETURN true;
  ELSE
    -- Increment failed attempts
    UPDATE public.profiles 
    SET failed_login_attempts = failed_login_attempts + 1,
        last_failed_login_at = now()
    WHERE id = _user_id
    RETURNING failed_login_attempts INTO current_attempts;
    
    -- Lock account after 5 failed attempts for 1 hour
    IF current_attempts >= 5 THEN
      lockout_time := now() + interval '1 hour';
      UPDATE public.profiles 
      SET lockout_until = lockout_time
      WHERE id = _user_id;
    END IF;
    
    RETURN false;
  END IF;
END;
$$;

-- Function to get account status
CREATE OR REPLACE FUNCTION public.get_account_status(_user_id uuid)
RETURNS public.account_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_status
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Function to deactivate account
CREATE OR REPLACE FUNCTION public.deactivate_account(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET account_status = 'deactivated'
  WHERE id = _user_id AND id = auth.uid();
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'account_deactivated', _user_id, '{"initiated_by": "user"}'::jsonb);
  
  RETURN true;
END;
$$;

-- Function to reactivate account
CREATE OR REPLACE FUNCTION public.reactivate_account(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET account_status = 'active'
  WHERE id = _user_id AND id = auth.uid() AND account_status = 'deactivated';
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'account_reactivated', _user_id, '{"initiated_by": "user"}'::jsonb);
  
  RETURN true;
END;
$$;

-- Function to request account deletion (7 day grace period)
CREATE OR REPLACE FUNCTION public.request_account_deletion(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET account_status = 'pending_deletion',
      deletion_requested_at = now(),
      deletion_scheduled_for = now() + interval '7 days'
  WHERE id = _user_id AND id = auth.uid();
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'deletion_requested', _user_id, 
    jsonb_build_object('scheduled_for', now() + interval '7 days'));
  
  RETURN true;
END;
$$;

-- Function to cancel account deletion
CREATE OR REPLACE FUNCTION public.cancel_account_deletion(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET account_status = 'active',
      deletion_requested_at = NULL,
      deletion_scheduled_for = NULL
  WHERE id = _user_id 
    AND id = auth.uid() 
    AND account_status = 'pending_deletion';
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'deletion_cancelled', _user_id, '{"initiated_by": "user"}'::jsonb);
  
  RETURN true;
END;
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details, ip_address, user_agent)
  VALUES (auth.uid(), _action, _target_user_id, _details, _ip_address, _user_agent)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login(_user_id uuid, _success boolean, _ip_address text DEFAULT NULL, _user_agent text DEFAULT NULL, _device_info text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_history (user_id, ip_address, user_agent, device_info, success)
  VALUES (_user_id, _ip_address, _user_agent, _device_info, _success);
  
  PERFORM public.check_and_update_login_attempts(_user_id, _success);
END;
$$;

-- Admin function to suspend user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(_target_user_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.profiles 
  SET account_status = 'suspended'
  WHERE id = _target_user_id;
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'admin_suspended_user', _target_user_id, 
    jsonb_build_object('reason', _reason));
  
  RETURN true;
END;
$$;

-- Admin function to unsuspend user
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.profiles 
  SET account_status = 'active'
  WHERE id = _target_user_id AND account_status = 'suspended';
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'admin_unsuspended_user', _target_user_id, '{}'::jsonb);
  
  RETURN true;
END;
$$;

-- Admin function to delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'admin_deleted_user', _target_user_id, 
    jsonb_build_object('reason', _reason));
  
  -- Delete from profiles (will cascade to user_roles, login_history, etc.)
  DELETE FROM public.profiles WHERE id = _target_user_id;
  
  RETURN true;
END;
$$;

-- Admin function to unlock user account
CREATE OR REPLACE FUNCTION public.admin_unlock_account(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE public.profiles 
  SET lockout_until = NULL,
      failed_login_attempts = 0
  WHERE id = _target_user_id;
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'admin_unlocked_account', _target_user_id, '{}'::jsonb);
  
  RETURN true;
END;
$$;

-- Function to accept terms and privacy policy
CREATE OR REPLACE FUNCTION public.accept_policies(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET terms_accepted_at = now(),
      privacy_accepted_at = now()
  WHERE id = _user_id AND id = auth.uid();
  
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (auth.uid(), 'policies_accepted', 
    jsonb_build_object('terms_accepted', true, 'privacy_accepted', true));
  
  RETURN true;
END;
$$;

-- Function to invalidate all sessions for a user
CREATE OR REPLACE FUNCTION public.invalidate_all_sessions(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE public.user_sessions 
  SET revoked_at = now()
  WHERE user_id = _user_id 
    AND (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  INSERT INTO public.audit_logs (user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'all_sessions_invalidated', _user_id, 
    jsonb_build_object('sessions_revoked', revoked_count));
  
  RETURN revoked_count;
END;
$$;

-- Update handle_new_user trigger to sync email from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, account_status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'username',
    NEW.email,
    'active'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (NEW.id, 'account_created', 
    jsonb_build_object('email', NEW.email, 'username', NEW.raw_user_meta_data ->> 'username'));
  
  RETURN NEW;
END;
$$;