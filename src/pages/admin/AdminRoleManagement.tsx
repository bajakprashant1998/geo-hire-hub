import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/admin/StatsCard';
import { Shield, Crown, UserX, Plus, Clock, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

const PERMISSION_SCOPES: Record<string, string[]> = {
  admin: ['All modules — full access'],
  moderator: ['Moderation', 'Reports', 'Messages', 'Notifications'],
};

export default function AdminRoleManagement() {
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data: roleUsers, isLoading } = useQuery({
    queryKey: ['admin-role-users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for these users
      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, user_type')
        .in('user_id', userIds);

      return roles.map(r => ({
        ...r,
        profile: profiles?.find(p => p.user_id === r.user_id),
      })) as RoleUser[];
    },
  });

  // Audit trail from admin_action_logs
  const { data: auditLogs } = useQuery({
    queryKey: ['admin-role-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .in('action_type', ['add_role', 'remove_role'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, user_type')
        .ilike('full_name', `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSearchResults(data || []);
      setSearchLoading(false);
    },
    onError: () => setSearchLoading(false),
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'add_role',
        p_target_type: 'user',
        p_target_id: userId,
        p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-audit'] });
      setAddDialog(false);
      setSearchResults([]);
      setSearchUserId('');
      toast.success('Role assigned successfully');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'remove_role',
        p_target_type: 'user',
        p_target_id: userId,
        p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-audit'] });
      toast.success('Role removed');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const admins = roleUsers?.filter(r => r.role === 'admin') || [];
  const moderators = roleUsers?.filter(r => r.role === 'moderator') || [];

  return (
    <AdminLayout title="Role Management">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Admins" value={admins.length} icon={Crown} variant="warning" />
        <StatsCard title="Moderators" value={moderators.length} icon={Shield} />
        <StatsCard title="Total Roles" value={roleUsers?.length || 0} icon={Users} />
      </div>

      {/* Permission Scopes Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(PERMISSION_SCOPES).map(([role, scopes]) => (
          <Card key={role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize flex items-center gap-2">
                {role === 'admin' ? <Crown className="h-4 w-4 text-warning" /> : <Shield className="h-4 w-4 text-primary" />}
                {role}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {scopes.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Holders Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Role Assignments</CardTitle>
            <CardDescription>Users with admin or moderator privileges</CardDescription>
          </div>
          <Button onClick={() => setAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Assign Role
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleUsers?.map(ru => (
                  <TableRow key={`${ru.user_id}-${ru.role}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={ru.profile?.avatar_url || undefined} />
                          <AvatarFallback>{ru.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{ru.profile?.full_name || ru.user_id.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ru.role === 'admin' ? 'border-warning text-warning' : 'border-primary text-primary'} variant="outline">
                        {ru.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{ru.profile?.user_type || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(ru.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeRoleMutation.mutate({ userId: ru.user_id, role: ru.role })}
                        disabled={removeRoleMutation.isPending}
                      >
                        <UserX className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!roleUsers || roleUsers.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No roles assigned</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Role Change Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={log.action_type === 'add_role' ? 'default' : 'destructive'}>
                      {log.action_type === 'add_role' ? 'Added' : 'Removed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.target_id.slice(0, 8)}...</TableCell>
                  <TableCell className="text-sm">{(log.details as any)?.role || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(log.created_at!), 'MMM d, HH:mm')}</TableCell>
                </TableRow>
              ))}
              {(!auditLogs || auditLogs.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No role changes recorded</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>Search for a user and assign a role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchUserId}
                  onChange={e => setSearchUserId(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => searchUsersMutation.mutate(searchUserId)} disabled={!searchUserId || searchLoading}>
                Search
              </Button>
            </div>
            <Select value={selectedRole} onValueChange={v => setSelectedRole(v as 'admin' | 'moderator')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                {searchResults.map(user => (
                  <button
                    key={user.user_id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left"
                    onClick={() => addRoleMutation.mutate({ userId: user.user_id, role: selectedRole })}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.user_type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
