-- Create calculation type enum
CREATE TYPE public.calculation_type AS ENUM ('beam', 'slab', 'continuous_beam');

-- Create calculations table
CREATE TABLE public.calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_type calculation_type NOT NULL,
  title TEXT NOT NULL,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_calculations_user_id ON public.calculations(user_id);
CREATE INDEX idx_calculations_user_favorite ON public.calculations(user_id, is_favorite);
CREATE INDEX idx_calculations_session ON public.calculations(user_id, session_id);

-- Enable Row Level Security
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

-- Users can view their own calculations
CREATE POLICY "Users can view their own calculations"
ON public.calculations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own calculations
CREATE POLICY "Users can insert their own calculations"
ON public.calculations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own calculations
CREATE POLICY "Users can update their own calculations"
ON public.calculations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own calculations
CREATE POLICY "Users can delete their own calculations"
ON public.calculations
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all favorite calculations
CREATE POLICY "Admins can view all favorite calculations"
ON public.calculations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') AND is_favorite = true);

-- Create trigger for updated_at
CREATE TRIGGER update_calculations_updated_at
BEFORE UPDATE ON public.calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check favorite limit (max 5)
CREATE OR REPLACE FUNCTION public.check_favorite_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  favorite_count INTEGER;
BEGIN
  IF NEW.is_favorite = true AND (OLD IS NULL OR OLD.is_favorite = false) THEN
    SELECT COUNT(*) INTO favorite_count
    FROM public.calculations
    WHERE user_id = NEW.user_id AND is_favorite = true;
    
    IF favorite_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 favorites allowed. Please remove a favorite first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for favorite limit
CREATE TRIGGER check_favorite_limit_trigger
BEFORE INSERT OR UPDATE ON public.calculations
FOR EACH ROW
EXECUTE FUNCTION public.check_favorite_limit();

-- Function to clean up non-favorite calculations for a user
CREATE OR REPLACE FUNCTION public.cleanup_temporary_calculations(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.calculations
  WHERE user_id = _user_id AND is_favorite = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (_user_id, 'temporary_calculations_cleaned', 
    jsonb_build_object('deleted_count', deleted_count));
  
  RETURN deleted_count;
END;
$$;

-- Function to get user's favorite count
CREATE OR REPLACE FUNCTION public.get_favorite_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.calculations
  WHERE user_id = _user_id AND is_favorite = true;
$$;