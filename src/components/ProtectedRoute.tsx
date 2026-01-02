import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * SECURITY NOTE: This component provides client-side route protection for UX purposes only.
 * It is NOT a security control - users can bypass this with browser DevTools.
 * 
 * All security-critical operations MUST verify permissions server-side via:
 * - RLS policies on database tables
 * - The has_role() function in edge functions/RPCs
 * 
 * This client-side check only controls UI visibility and navigation flow.
 */
export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // NOTE: This is a UX control only. Server-side RLS policies enforce actual security.
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
