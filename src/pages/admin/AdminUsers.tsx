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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  User, 
  Shield, 
  MoreVertical,
  UserX,
  Mail,
  Key,
  Eye,
  Crown,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { StatsCard } from '@/components/admin/StatsCard';

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

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ user: UserProfile | null; action: 'add' | 'remove' }>({ 
    user: null, 
    action: 'add' 
  });
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-users', typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('user_type', typeFilter as 'candidate' | 'employer');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
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
        p_details: { role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setRoleDialog({ user: null, action: 'add' });
      toast.success('Role added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add role: ' + error.message);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' | 'user' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'remove_role',
        p_target_type: 'user',
        p_target_id: userId,
        p_details: { role }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('Role removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove role: ' + error.message);
    },
  });

  const getUserRoles = (userId: string) => {
    return roles?.filter(r => r.user_id === userId).map(r => r.role) || [];
  };

  const filteredUsers = profiles?.filter((user) =>
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers?.map(u => u.id) || []);
    }
  };

  // Stats
  const totalUsers = profiles?.length || 0;
  const candidates = profiles?.filter(p => p.user_type === 'candidate').length || 0;
  const employers = profiles?.filter(p => p.user_type === 'employer').length || 0;
  const admins = roles?.filter(r => r.role === 'admin').length || 0;

  return (
    <AdminLayout title="User Management">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Users" value={totalUsers} icon={Users} />
        <StatsCard title="Candidates" value={candidates} icon={User} />
        <StatsCard title="Employers" value={employers} icon={User} variant="success" />
        <StatsCard title="Admins" value={admins} icon={Crown} variant="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="User Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="candidate">Candidates</SelectItem>
            <SelectItem value="employer">Employers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers?.length && filteredUsers.length > 0}
                      onCheckedChange={toggleAllUsers}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const userRoles = getUserRoles(user.user_id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_type === 'employer' ? 'default' : 'secondary'}>
                          {user.user_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {userRoles.map(role => (
                            <Badge 
                              key={role} 
                              variant="outline"
                              className={role === 'admin' ? 'border-warning text-warning' : 'border-primary text-primary'}
                            >
                              {role}
                            </Badge>
                          ))}
                          {userRoles.length === 0 && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.last_login_at 
                          ? format(new Date(user.last_login_at), 'MMM d, HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setRoleDialog({ user, action: 'add' })}
                              disabled={userRoles.includes('admin')}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Add Role
                            </DropdownMenuItem>
                            {userRoles.length > 0 && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  const roleToRemove = userRoles[0];
                                  removeRoleMutation.mutate({ userId: user.user_id, role: roleToRemove as 'admin' | 'moderator' | 'user' });
                                }}
                                className="text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove Role
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedUsers.length}
        onClear={() => setSelectedUsers([])}
        entityType="user"
      />

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedUser.full_name}</p>
                  <Badge variant="outline">{selectedUser.user_type}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs truncate">{selectedUser.user_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Status</p>
                  <p>Active</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registered</p>
                  <p>{format(new Date(selectedUser.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p>{selectedUser.last_login_at 
                    ? format(new Date(selectedUser.last_login_at), 'PPP')
                    : 'Never'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={!!roleDialog.user} onOpenChange={() => setRoleDialog({ user: null, action: 'add' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Assign a role to {roleDialog.user?.full_name}
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'moderator')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ user: null, action: 'add' })}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (roleDialog.user) {
                  addRoleMutation.mutate({ userId: roleDialog.user.user_id, role: selectedRole });
                }
              }}
              disabled={addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
