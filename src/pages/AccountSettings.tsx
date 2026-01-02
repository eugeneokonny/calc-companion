import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  LogOut,
  Trash2,
  Power,
  RefreshCw,
  Loader2,
  History
} from 'lucide-react';

interface LoginHistoryEntry {
  id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  success: boolean;
}

const AccountSettings = () => {
  const { 
    user, 
    profile, 
    accountStatus, 
    signOut, 
    deactivateAccount, 
    reactivateAccount, 
    requestAccountDeletion, 
    cancelAccountDeletion,
    logoutAllDevices,
    refreshProfile
  } = useAuth();
  const { toast } = useToast();
  
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLoginHistory();
    }
  }, [user]);

  const fetchLoginHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.id)
      .order('login_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setLoginHistory(data as LoginHistoryEntry[]);
    }
    setIsLoading(false);
  };

  const handleDeactivate = async () => {
    setActionLoading('deactivate');
    const { error } = await deactivateAccount();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Account Deactivated',
        description: 'Your account has been deactivated. You can reactivate it anytime.'
      });
    }
    setActionLoading(null);
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    const { error } = await reactivateAccount();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Account Reactivated',
        description: 'Welcome back! Your account is now active.'
      });
    }
    setActionLoading(null);
  };

  const handleRequestDeletion = async () => {
    setActionLoading('delete');
    const { error } = await requestAccountDeletion();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Deletion Scheduled',
        description: 'Your account will be permanently deleted in 7 days. You can cancel this anytime before then.'
      });
    }
    setActionLoading(null);
  };

  const handleCancelDeletion = async () => {
    setActionLoading('cancel');
    const { error } = await cancelAccountDeletion();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Deletion Cancelled',
        description: 'Your account deletion has been cancelled.'
      });
    }
    setActionLoading(null);
  };

  const handleLogoutAll = async () => {
    setActionLoading('logout');
    const { error } = await logoutAllDevices();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Logged Out',
        description: 'You have been logged out from all devices.'
      });
    }
    setActionLoading(null);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      active: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" />, label: 'Active' },
      suspended: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'Suspended' },
      deactivated: { variant: 'secondary', icon: <Power className="h-3 w-3 mr-1" />, label: 'Deactivated' },
      pending_deletion: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3 mr-1" />, label: 'Pending Deletion' }
    };
    
    const config = configs[status] || configs.active;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account and security preferences</p>
        </div>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{profile?.username || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  {getStatusBadge(accountStatus)}
                </div>
              </div>
            </div>

            {accountStatus === 'pending_deletion' && profile?.deletion_scheduled_for && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Account Scheduled for Deletion</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account will be permanently deleted on{' '}
                  <strong>{new Date(profile.deletion_scheduled_for).toLocaleDateString()}</strong>.
                  You can cancel this before then.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleCancelDeletion}
                  disabled={actionLoading === 'cancel'}
                >
                  {actionLoading === 'cancel' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Cancel Deletion
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login History */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Login History
                </CardTitle>
                <CardDescription>Your recent login activity</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={fetchLoginHistory}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : loginHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No login history available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {entry.success ? (
                          <Badge variant="default" className="bg-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(entry.login_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {entry.user_agent || 'Unknown device'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Security Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Logout from all devices</p>
                <p className="text-sm text-muted-foreground">
                  Sign out from all active sessions on other devices
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogoutAll}
                disabled={actionLoading === 'logout'}
              >
                {actionLoading === 'logout' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <LogOut className="h-4 w-4 mr-2" />
                Logout All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible account actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountStatus === 'active' && (
              <>
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                  <div>
                    <p className="font-medium">Deactivate Account</p>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable your account. You can reactivate anytime.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Power className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your account will be temporarily disabled. You won't be able to log in until you reactivate it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivate}>
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data. 7-day grace period.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your account will be scheduled for permanent deletion. You'll have 7 days to cancel this action. After that, all your data will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleRequestDeletion}
                        >
                          Schedule Deletion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}

            {accountStatus === 'deactivated' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Reactivate Account</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is currently deactivated. Reactivate to regain access.
                  </p>
                </div>
                <Button
                  onClick={handleReactivate}
                  disabled={actionLoading === 'reactivate'}
                >
                  {actionLoading === 'reactivate' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reactivate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AccountSettings;
