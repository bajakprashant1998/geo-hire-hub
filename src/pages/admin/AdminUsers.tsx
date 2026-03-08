import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search, User, Shield, MoreVertical, UserX, Eye, Crown, Users, ExternalLink, Download,
  ShieldCheck, Briefcase, Mail, Clock, CalendarDays, CheckCircle, XCircle, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { exportToCSV } from '@/lib/adminExport';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: 'candidate' | 'employer';
  created_at: string;
  custom_email_verified: boolean;
  last_login_at: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
}

/* ─── KPI Card ─── */
function KPICard({ index, title, value, icon: Icon, gradient, subtitle }: {
  index: number; title: string; value: string | number; icon: React.ElementType; gradient: string; subtitle?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.35 }}>
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={cn('absolute inset-0 opacity-[0.08] bg-gradient-to-br', gradient)} />
        <CardContent className="p-5 flex items-center gap-4 relative">
          <div className={cn('rounded-xl p-2.5 bg-gradient-to-br text-white shadow-md', gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Quick Filter Chip ─── */
function FilterChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
      active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
    )}>
      {label}
      {count !== undefined && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center',
          active ? 'bg-primary-foreground/20' : 'bg-background'
        )}>{count}</span>
      )}
    </button>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ user: UserProfile | null; action: 'add' | 'remove' }>({ user: null, action: 'add' });
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', typeFilter, page, dateRange],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
      if (typeFilter !== 'all') query = query.eq('user_type', typeFilter as 'candidate' | 'employer');
      if (dateRange) {
        query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { profiles: data as UserProfile[], total: count || 0 };
    },
  });

  const profiles = data?.profiles;
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const { data: roles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: 'add_role', p_target_type: 'user', p_target_id: userId, p_details: { role } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] }); setRoleDialog({ user: null, action: 'add' }); toast.success('Role added successfully'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'user' }) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: 'remove_role', p_target_type: 'user', p_target_id: userId, p_details: { role } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] }); toast.success('Role removed'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const getUserRoles = (userId: string) => roles?.filter(r => r.user_id === userId).map(r => r.role) || [];

  const filteredUsers = profiles?.filter((user) => user.full_name?.toLowerCase().includes(search.toLowerCase()));

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleAllUsers = () => {
    selectedUsers.length === filteredUsers?.length ? setSelectedUsers([]) : setSelectedUsers(filteredUsers?.map(u => u.id) || []);
  };

  const handleExport = () => {
    if (!filteredUsers?.length) return;
    exportToCSV(
      filteredUsers.map(u => ({ name: u.full_name, type: u.user_type, roles: getUserRoles(u.user_id).join(', ') || '-', registered: u.created_at, last_login: u.last_login_at || 'Never' })),
      'admin-users',
      [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'roles', label: 'Roles' }, { key: 'registered', label: 'Registered' }, { key: 'last_login', label: 'Last Login' }]
    );
    toast.success('Users exported');
  };

  const totalUsers = data?.total || 0;
  const candidateCount = profiles?.filter(p => p.user_type === 'candidate').length || 0;
  const employerCount = profiles?.filter(p => p.user_type === 'employer').length || 0;
  const adminCount = roles?.filter(r => r.role === 'admin').length || 0;
  const verifiedCount = profiles?.filter(p => p.custom_email_verified).length || 0;

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge key={role} className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]"><Crown className="h-3 w-3" />{role}</Badge>;
    if (role === 'moderator') return <Badge key={role} className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />{role}</Badge>;
    return <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === 'employer') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]"><Briefcase className="h-3 w-3" />Employer</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 text-[10px]"><User className="h-3 w-3" />Candidate</Badge>;
  };

  return (
    <AdminLayout title="User Management">
      <TooltipProvider>
        {/* ─── Hero ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">User Management</h1>
                <p className="text-sm text-muted-foreground">Monitor, manage roles, and oversee all platform users</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleExport}>
              <Download className="h-4 w-4" />Export CSV
            </Button>
          </div>
        </motion.div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard index={0} title="Total Users" value={totalUsers} icon={Users} gradient="from-primary to-primary/70" subtitle={`Page ${page} of ${totalPages || 1}`} />
          <KPICard index={1} title="Candidates" value={candidateCount} icon={User} gradient="from-blue-500 to-blue-400" subtitle="On this page" />
          <KPICard index={2} title="Employers" value={employerCount} icon={Briefcase} gradient="from-emerald-500 to-green-400" subtitle="On this page" />
          <KPICard index={3} title="Admins" value={adminCount} icon={Crown} gradient="from-amber-500 to-yellow-400" subtitle="Platform-wide" />
          <KPICard index={4} title="Verified" value={verifiedCount} icon={Mail} gradient="from-violet-500 to-purple-400" subtitle="Email confirmed" />
        </div>

        {/* ─── Filters ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5 space-y-3">
          {/* Quick filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip label="All" count={totalUsers} active={typeFilter === 'all'} onClick={() => { setTypeFilter('all'); setPage(1); }} />
            <FilterChip label="Candidates" count={candidateCount} active={typeFilter === 'candidate'} onClick={() => { setTypeFilter('candidate'); setPage(1); }} />
            <FilterChip label="Employers" count={employerCount} active={typeFilter === 'employer'} onClick={() => { setTypeFilter('employer'); setPage(1); }} />
          </div>

          {/* Search + Date */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </motion.div>

        {/* ─── User Table ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
              ) : !filteredUsers?.length ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No users found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search term</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-12">
                        <Checkbox checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleAllUsers} />
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">User</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Type</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Roles</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Email</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Registered</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Last Active</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, idx) => {
                      const userRoles = getUserRoles(user.user_id);
                      const isSelected = selectedUsers.includes(user.id);
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className={cn(
                            'border-b transition-colors hover:bg-muted/30 cursor-pointer group',
                            isSelected && 'bg-primary/5'
                          )}
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleUserSelection(user.id)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="bg-muted text-xs font-bold">{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                {userRoles.includes('admin') && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
                                    <Crown className="h-2 w-2 text-white" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{user.full_name || 'Unnamed User'}</p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">{user.user_id.slice(0, 8)}…</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(user.user_type)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {userRoles.length > 0 ? userRoles.map(r => getRoleBadge(r)) : <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.custom_email_verified ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]">
                                <CheckCircle className="h-3 w-3" />Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]">
                                <XCircle className="h-3 w-3" />Unverified
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">{format(new Date(user.created_at), 'PPPp')}</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {user.last_login_at ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">{format(new Date(user.last_login_at), 'PPPp')}</p></TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => setSelectedUser(user)} className="gap-2">
                                  <Eye className="h-4 w-4" />View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="gap-2">
                                  <Link to={user.user_type === 'employer' ? `/employers/${user.id}` : `/candidates/${user.id}`}>
                                    <ExternalLink className="h-4 w-4" />View Profile
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setRoleDialog({ user, action: 'add' })} disabled={userRoles.includes('admin')} className="gap-2">
                                  <Shield className="h-4 w-4" />Add Role
                                </DropdownMenuItem>
                                {userRoles.length > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => removeRoleMutation.mutate({ userId: user.user_id, role: userRoles[0] as 'admin' | 'moderator' | 'user' })}
                                    className="text-destructive gap-2"
                                  >
                                    <UserX className="h-4 w-4" />Remove Role ({userRoles[0]})
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        <BulkActionsBar selectedCount={selectedUsers.length} onClear={() => setSelectedUsers([])} onExport={handleExport} entityType="user" />

        {/* ─── User Detail Dialog ─── */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (() => {
              const userRoles = getUserRoles(selectedUser.user_id);
              return (
                <div className="space-y-5">
                  {/* Profile header */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback className="text-lg font-bold">{selectedUser.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-lg">{selectedUser.full_name || 'Unnamed User'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getTypeBadge(selectedUser.user_type)}
                        {userRoles.map(r => getRoleBadge(r))}
                        {selectedUser.custom_email_verified ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]">
                            <CheckCircle className="h-3 w-3" />Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" />Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'User ID', value: selectedUser.user_id, icon: User, mono: true },
                      { label: 'Profile ID', value: selectedUser.id, icon: Shield, mono: true },
                      { label: 'Registered', value: format(new Date(selectedUser.created_at), 'PPP'), icon: CalendarDays },
                      { label: 'Last Active', value: selectedUser.last_login_at ? formatDistanceToNow(new Date(selectedUser.last_login_at), { addSuffix: true }) : 'Never', icon: Clock },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/20 border space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          <item.icon className="h-3 w-3" />{item.label}
                        </div>
                        <p className={cn('text-sm truncate', item.mono && 'font-mono text-xs')}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                      <Link to={selectedUser.user_type === 'employer' ? `/employers/${selectedUser.id}` : `/candidates/${selectedUser.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />View Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl"
                      onClick={() => { setSelectedUser(null); setRoleDialog({ user: selectedUser, action: 'add' }); }}
                      disabled={userRoles.includes('admin')}
                    >
                      <UserPlus className="h-3.5 w-3.5" />Assign Role
                    </Button>
                    {userRoles.length > 0 && (
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-destructive hover:text-destructive"
                        onClick={() => { removeRoleMutation.mutate({ userId: selectedUser.user_id, role: userRoles[0] as any }); setSelectedUser(null); }}
                      >
                        <UserX className="h-3.5 w-3.5" />Remove {userRoles[0]}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ─── Role Dialog ─── */}
        <Dialog open={!!roleDialog.user} onOpenChange={() => setRoleDialog({ user: null, action: 'add' })}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Assign Role</DialogTitle>
              <DialogDescription>Add a role to <span className="font-semibold text-foreground">{roleDialog.user?.full_name}</span></DialogDescription>
            </DialogHeader>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'moderator')}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Moderator</span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" />Admin</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRoleDialog({ user: null, action: 'add' })} className="rounded-xl">Cancel</Button>
              <Button
                onClick={() => { if (roleDialog.user) addRoleMutation.mutate({ userId: roleDialog.user.user_id, role: selectedRole }); }}
                disabled={addRoleMutation.isPending}
                className="rounded-xl shadow-md"
              >
                {addRoleMutation.isPending ? 'Adding…' : 'Add Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AdminLayout>
  );
}
