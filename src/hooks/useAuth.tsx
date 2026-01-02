import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * SECURITY NOTE: The isAdmin flag in this context is for UX purposes only.
 * It controls UI visibility (e.g., showing admin menus, enabling admin routes).
 * 
 * This is NOT a security control - all security-critical operations MUST verify
 * admin status server-side via:
 * - RLS policies using has_role(auth.uid(), 'admin')
 * - Server-side checks in edge functions
 * 
 * The has_role() RPC is SECURITY DEFINER with proper search_path, preventing
 * manipulation. Client-side state can be tampered with but won't bypass RLS.
 */

export type AccountStatus = 'active' | 'deactivated' | 'suspended' | 'pending_deletion';

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  account_status: AccountStatus;
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  last_login_at: string | null;
  lockout_until: string | null;
  failed_login_attempts: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** UX-only flag for admin UI visibility. NOT a security control. */
  isAdmin: boolean;
  isLoading: boolean;
  isLocked: boolean;
  lockoutUntil: Date | null;
  accountStatus: AccountStatus | null;
  needsPolicyAcceptance: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  deactivateAccount: () => Promise<{ error: Error | null }>;
  reactivateAccount: () => Promise<{ error: Error | null }>;
  requestAccountDeletion: () => Promise<{ error: Error | null }>;
  cancelAccountDeletion: () => Promise<{ error: Error | null }>;
  acceptPolicies: () => Promise<{ error: Error | null }>;
  logoutAllDevices: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // NOTE: isAdmin is for UX only - server-side RLS enforces actual security
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [needsPolicyAcceptance, setNeedsPolicyAcceptance] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role check with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setProfile(null);
          setAccountStatus(null);
          setIsLocked(false);
          setLockoutUntil(null);
          setNeedsPolicyAcceptance(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
      if (!error) {
        setIsAdmin(data === true);
      }
    } catch (err) {
      console.error('Error checking admin role:', err);
      setIsAdmin(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
        setAccountStatus(data.account_status as AccountStatus);
        
        // Check lockout
        if (data.lockout_until) {
          const lockoutDate = new Date(data.lockout_until);
          if (lockoutDate > new Date()) {
            setIsLocked(true);
            setLockoutUntil(lockoutDate);
          } else {
            setIsLocked(false);
            setLockoutUntil(null);
          }
        } else {
          setIsLocked(false);
          setLockoutUntil(null);
        }

        // Check if policies need acceptance
        setNeedsPolicyAcceptance(!data.terms_accepted_at || !data.privacy_accepted_at);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username
        }
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    // First check if account is locked
    const { data: profile } = await supabase
      .from('profiles')
      .select('lockout_until, account_status')
      .eq('email', email)
      .maybeSingle();

    if (profile?.lockout_until) {
      const lockoutDate = new Date(profile.lockout_until);
      if (lockoutDate > new Date()) {
        const minutesLeft = Math.ceil((lockoutDate.getTime() - Date.now()) / 60000);
        return { 
          error: new Error(`Account is locked. Try again in ${minutesLeft} minutes.`) 
        };
      }
    }

    if (profile?.account_status === 'suspended') {
      return { 
        error: new Error('Account is suspended. Please contact support.') 
      };
    }

    if (profile?.account_status === 'deactivated') {
      return { 
        error: new Error('Account is deactivated. Please reactivate your account.') 
      };
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Record login attempt
    if (data?.user) {
      await supabase.rpc('record_login', {
        _user_id: data.user.id,
        _success: !error,
        _ip_address: null,
        _user_agent: navigator.userAgent,
        _device_info: null
      });
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setProfile(null);
    setAccountStatus(null);
    setIsLocked(false);
    setLockoutUntil(null);
    setNeedsPolicyAcceptance(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error: error as Error | null };
  };

  const deactivateAccount = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('deactivate_account', {
      _user_id: user.id
    });
    
    if (!error) {
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const reactivateAccount = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('reactivate_account', {
      _user_id: user.id
    });
    
    if (!error) {
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const requestAccountDeletion = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('request_account_deletion', {
      _user_id: user.id
    });
    
    if (!error) {
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const cancelAccountDeletion = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('cancel_account_deletion', {
      _user_id: user.id
    });
    
    if (!error) {
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const acceptPolicies = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('accept_policies', {
      _user_id: user.id
    });
    
    if (!error) {
      setNeedsPolicyAcceptance(false);
      await refreshProfile();
    }
    
    return { error: error as Error | null };
  };

  const logoutAllDevices = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.rpc('invalidate_all_sessions', {
      _user_id: user.id
    });
    
    if (!error) {
      await signOut();
    }
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      isLoading,
      isLocked,
      lockoutUntil,
      accountStatus,
      needsPolicyAcceptance,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      deactivateAccount,
      reactivateAccount,
      requestAccountDeletion,
      cancelAccountDeletion,
      acceptPolicies,
      logoutAllDevices,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
