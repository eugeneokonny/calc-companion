import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { 
  Users, 
  Activity, 
  Shield, 
  Search, 
  Ban, 
  Unlock, 
  Trash2, 
  RefreshCw,
  UserX,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  email: string | null;
  account_status: string;
  created_at: string;
  last_login_at: string | null;
  failed_login_attempts: number;
  lockout_until: string | null;
}

interface LoginHistoryEntry {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  profiles?: { username: string } | null;
}

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchLoginHistory(), fetchAuditLogs()]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as UserData[]);
    }
  };

  const fetchLoginHistory = async () => {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      // Get usernames for each entry
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      
      const enrichedData = data.map(entry => ({
        ...entry,
        profiles: { username: profileMap.get(entry.user_id) || 'Unknown' }
      }));
      
      setLoginHistory(enrichedData as LoginHistoryEntry[]);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setAuditLogs(data as AuditLogEntry[]);
    }
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_suspend_user', {
      _target_user_id: userId,
      _reason: reason
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'User Suspended',
        description: 'The user account has been suspended.'
      });
      fetchUsers();
    }
    setActionLoading(null);
    setSuspendReason('');
    setSelectedUser(null);
  };

  const handleUnsuspendUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_unsuspend_user', {
      _target_user_id: userId
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'User Reactivated',
        description: 'The user account has been reactivated.'
      });
      fetchUsers();
    }
    setActionLoading(null);
  };

  const handleUnlockAccount = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_unlock_account', {
      _target_user_id: userId
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'Account Unlocked',
        description: 'The user account has been unlocked.'
      });
      fetchUsers();
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.rpc('admin_delete_user', {
      _target_user_id: userId,
      _reason: 'Admin deletion'
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    } else {
      toast({
        title: 'User Deleted',
        description: 'The user account has been permanently deleted.'
      });
      fetchUsers();
    }
    setActionLoading(null);
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      active: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      suspended: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      deactivated: { variant: 'secondary', icon: <UserX className="h-3 w-3 mr-1" /> },
      pending_deletion: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> }
    };
    const config = variants[status] || variants.active;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.account_status === 'active').length,
    suspendedUsers: users.filter(u => u.account_status === 'suspended').length,
    lockedUsers: users.filter(u => u.lockout_until && new Date(u.lockout_until) > new Date()).length
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-8 px-4">
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-3 py-8">
              <Shield className="h-8 w-8 text-destructive" />
              <div>
                <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground">You do not have permission to access this page.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, monitor activity, and view audit logs</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-success/10">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold">{stats.suspendedUsers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locked</p>
                <p className="text-2xl font-bold">{stats.lockedUsers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Login Activity
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all user accounts</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchUsers}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Failed Attempts</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.username || 'N/A'}</TableCell>
                          <TableCell>{u.email || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(u.account_status)}</TableCell>
                          <TableCell>
                            {u.last_login_at 
                              ? new Date(u.last_login_at).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <span className={u.failed_login_attempts > 0 ? 'text-destructive font-medium' : ''}>
                              {u.failed_login_attempts}
                            </span>
                            {u.lockout_until && new Date(u.lockout_until) > new Date() && (
                              <Badge variant="destructive" className="ml-2">Locked</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.lockout_until && new Date(u.lockout_until) > new Date() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnlockAccount(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  <Unlock className="h-4 w-4 mr-1" />
                                  Unlock
                                </Button>
                              )}
                              
                              {u.account_status === 'suspended' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnsuspendUser(u.id)}
                                  disabled={actionLoading === u.id}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Unsuspend
                                </Button>
                              ) : u.account_status === 'active' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedUser(u)}
                                    >
                                      <Ban className="h-4 w-4 mr-1" />
                                      Suspend
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Suspend User</DialogTitle>
                                      <DialogDescription>
                                        Suspending {selectedUser?.username} will prevent them from accessing their account.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <Input
                                        placeholder="Reason for suspension (optional)"
                                        value={suspendReason}
                                        onChange={(e) => setSuspendReason(e.target.value)}
                                      />
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        variant="destructive"
                                        onClick={() => selectedUser && handleSuspendUser(selectedUser.id, suspendReason)}
                                        disabled={actionLoading === selectedUser?.id}
                                      >
                                        {actionLoading === selectedUser?.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : null}
                                        Suspend User
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={u.id === user?.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the user account and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteUser(u.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Login Activity</CardTitle>
                    <CardDescription>Recent login attempts across all users</CardDescription>
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
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.profiles?.username || 'Unknown'}
                          </TableCell>
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
                          <TableCell className="font-mono text-sm">
                            {entry.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {entry.user_agent || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>System events and admin actions</CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchAuditLogs}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.user_id?.slice(0, 8) || 'System'}...
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.target_user_id?.slice(0, 8) || '-'}...
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
