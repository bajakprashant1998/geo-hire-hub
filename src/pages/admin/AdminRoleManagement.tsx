import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Shield, Crown, UserX, Plus, Clock, Search, Users, CheckCircle,
  ShieldCheck, ShieldAlert, Eye, Megaphone, MessageSquare, Bell,
  FileText, BarChart3, Settings, Briefcase, ArrowUpRight, History,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RoleUser {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    user_type: string;
  };
}

const ROLE_CONFIG = {
  admin: {
    icon: Crown,
    label: 'Administrator',
    gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'Full platform access — manage users, content, settings, and all modules.',
    permissions: [
      { icon: Settings, label: 'System Settings' },
      { icon: Users, label: 'User Management' },
      { icon: BarChart3, label: 'Analytics & Revenue' },
      { icon: ShieldCheck, label: 'All Moderator Access' },
    ],
  },
  moderator: {
    icon: Shield,
    label: 'Moderator',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    description: 'Content oversight — review reports, moderate content, and manage notifications.',
    permissions: [
      { icon: Eye, label: 'Content Moderation' },
      { icon: FileText, label: 'Reports Review' },
      { icon: MessageSquare, label: 'Message Oversight' },
      { icon: Bell, label: 'Notifications' },
    ],
  },
};

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, gradient, sub }: {
  icon: React.ElementType; label: string; value: number; gradient: string; sub?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={`absolute inset-0 ${gradient} opacity-[0.07]`} />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminRoleManagement() {
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<RoleUser | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'moderator'>('all');
  const [searchTable, setSearchTable] = useState('');

  const { data: roleUsers, isLoading } = useQuery({
    queryKey: ['admin-role-users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name, avatar_url, user_type').in('user_id', userIds);
      return roles.map(r => ({
        ...r,
        profile: profiles?.find(p => p.user_id === r.user_id),
      })) as RoleUser[];
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-role-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_action_logs').select('*')
        .in('action_type', ['add_role', 'remove_role'])
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('profiles').select('user_id, full_name, avatar_url, user_type')
        .ilike('full_name', `%${query}%`).limit(10);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { setSearchResults(data || []); setSearchLoading(false); },
    onError: () => setSearchLoading(false),
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'add_role', p_target_type: 'user', p_target_id: userId, p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-audit'] });
      setAddDialog(false); setSearchResults([]); setSearchUserId('');
      toast.success('Role assigned successfully');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from('user_roles').delete()
        .eq('user_id', userId).eq('role', role as any);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'remove_role', p_target_type: 'user', p_target_id: userId, p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-audit'] });
      setRemoveConfirm(null);
      toast.success('Role removed');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const admins = roleUsers?.filter(r => r.role === 'admin') || [];
  const moderators = roleUsers?.filter(r => r.role === 'moderator') || [];

  const filteredRoleUsers = roleUsers?.filter(r => {
    const matchRole = filterRole === 'all' || r.role === filterRole;
    const matchSearch = !searchTable || r.profile?.full_name?.toLowerCase().includes(searchTable.toLowerCase());
    return matchRole && matchSearch;
  }) || [];

  // Check if user already has a role
  const existingUserIds = new Set(roleUsers?.map(r => r.user_id) || []);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchUserId) searchUsersMutation.mutate(searchUserId);
  };

  return (
    <AdminLayout title="Role Management">
      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Crown} label="Administrators" value={admins.length}
          sub="Full platform access" gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
        <StatCard icon={Shield} label="Moderators" value={moderators.length}
          sub="Content & reports access" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard icon={Users} label="Total Privileged Users" value={roleUsers?.length || 0}
          sub={`${auditLogs?.length || 0} role changes logged`} gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4" />Role Assignments
            <Badge variant="secondary" className="text-xs ml-1">{roleUsers?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Eye className="h-4 w-4" />Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4" />Audit Trail
            {auditLogs && auditLogs.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{auditLogs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Roles Tab ─── */}
        <TabsContent value="roles">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Role Assignments</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Users with elevated platform privileges</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchTable}
                    onChange={e => setSearchTable(e.target.value)} className="pl-9 w-full sm:w-48" />
                </div>
                <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="moderator">Moderators</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setAddDialog(true)} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />Assign Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : filteredRoleUsers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No role assignments found</p>
                  <p className="text-sm">Click "Assign Role" to grant privileges to a user.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredRoleUsers.map((ru, i) => {
                          const config = ROLE_CONFIG[ru.role as keyof typeof ROLE_CONFIG];
                          return (
                            <motion.tr key={`${ru.user_id}-${ru.role}`}
                              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={ru.profile?.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                      {ru.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-foreground">{ru.profile?.full_name || 'Unknown User'}</p>
                                    <p className="text-[11px] text-muted-foreground font-mono">{ru.user_id.slice(0, 12)}…</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {config ? (
                                  <Badge className={cn("gap-1.5", config.badgeClass)}>
                                    <config.icon className="h-3 w-3" />
                                    {config.label}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="capitalize">{ru.role}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize font-normal gap-1">
                                  {ru.profile?.user_type === 'employer' ? (
                                    <><Briefcase className="h-3 w-3" />Employer</>
                                  ) : (
                                    <><Users className="h-3 w-3" />Candidate</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm text-foreground">{format(new Date(ru.created_at), 'MMM d, yyyy')}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(ru.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 text-xs"
                                  onClick={() => setRemoveConfirm(ru)}
                                  disabled={removeRoleMutation.isPending}>
                                  <UserX className="h-3.5 w-3.5" />Remove
                                </Button>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredRoleUsers.length > 0 && (
                <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                  Showing {filteredRoleUsers.length} of {roleUsers?.length || 0} role assignments
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Permissions Tab ─── */}
        <TabsContent value="permissions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG]][]).map(([role, config]) => (
              <motion.div key={role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border shadow-sm overflow-hidden h-full">
                  <div className={`h-1.5 ${config.gradient}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${config.gradient} text-white shadow-md`}>
                        <config.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{config.label}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</p>
                    <div className="space-y-2">
                      {config.permissions.map(perm => (
                        <div key={perm.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-transparent hover:border-border/50 transition-colors">
                          <div className="p-1.5 rounded-md bg-background shadow-sm">
                            <perm.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{perm.label}</span>
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {role === 'admin' ? admins.length : moderators.length} users
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Audit Trail Tab ─── */}
        <TabsContent value="audit">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />Role Change Audit Trail
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Recent role additions and removals across the platform</p>
            </CardHeader>
            <CardContent className="p-0">
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No role changes recorded</p>
                  <p className="text-sm">Changes will appear here when roles are assigned or removed.</p>
                </div>
              ) : (
                <div className="divide-y">
                  <AnimatePresence>
                    {auditLogs.map((log, i) => {
                      const isAdd = log.action_type === 'add_role';
                      const roleName = (log.details as any)?.role || 'unknown';
                      const roleConfig = ROLE_CONFIG[roleName as keyof typeof ROLE_CONFIG];
                      return (
                        <motion.div key={log.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className={cn("p-2 rounded-lg shrink-0",
                            isAdd ? "bg-emerald-500/10" : "bg-destructive/10"
                          )}>
                            {isAdd ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <UserX className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs",
                                isAdd ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                              )}>
                                {isAdd ? 'Assigned' : 'Removed'}
                              </Badge>
                              {roleConfig && (
                                <Badge className={cn("gap-1 text-xs", roleConfig.badgeClass)}>
                                  <roleConfig.icon className="h-2.5 w-2.5" />{roleConfig.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                              User: {log.target_id.slice(0, 16)}…
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-foreground">{format(new Date(log.created_at!), 'MMM d, yyyy')}</p>
                            <p className="text-[11px] text-muted-foreground">{format(new Date(log.created_at!), 'HH:mm')}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Assign Role Dialog ─── */}
      <Dialog open={addDialog} onOpenChange={(open) => { setAddDialog(open); if (!open) { setSearchResults([]); setSearchUserId(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Assign Role</DialogTitle>
            <DialogDescription>Search for a user by name and assign a platform role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role to Assign</label>
              <Select value={selectedRole} onValueChange={v => setSelectedRole(v as 'admin' | 'moderator')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-500" />Moderator</div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-amber-500" />Administrator</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search User</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name..." value={searchUserId}
                    onChange={e => setSearchUserId(e.target.value)}
                    onKeyDown={handleSearchKeyDown} className="pl-9" />
                </div>
                <Button variant="outline" onClick={() => searchUsersMutation.mutate(searchUserId)}
                  disabled={!searchUserId || searchLoading}>
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{searchResults.length} result{searchResults.length > 1 ? 's' : ''} found</p>
                <div className="border rounded-lg divide-y max-h-52 overflow-auto">
                  {searchResults.map(user => {
                    const hasRole = existingUserIds.has(user.user_id);
                    return (
                      <button key={user.user_id}
                        className={cn("w-full flex items-center gap-3 p-3 text-left transition-colors",
                          hasRole ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/50"
                        )}
                        onClick={() => !hasRole && addRoleMutation.mutate({ userId: user.user_id, role: selectedRole })}
                        disabled={hasRole || addRoleMutation.isPending}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {user.full_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.user_type}</p>
                        </div>
                        {hasRole ? (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Has Role</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                            <Plus className="h-2.5 w-2.5" />Assign
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {searchUserId && searchResults.length === 0 && !searchLoading && searchUsersMutation.isSuccess && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No users found matching "{searchUserId}"</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Remove Role Confirmation ─── */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeConfirm?.role} role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke <span className="font-medium text-foreground">{removeConfirm?.profile?.full_name || 'this user'}'s</span> {removeConfirm?.role} privileges. They will lose access to all associated admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeConfirm && removeRoleMutation.mutate({ userId: removeConfirm.user_id, role: removeConfirm.role })}
            >
              {removeRoleMutation.isPending ? 'Removing...' : 'Remove Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
