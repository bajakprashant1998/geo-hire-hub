import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { UserPlus, Shield, Trash2, Mail, Clock, CheckCircle2, Users, Crown, Eye, Briefcase, Calendar } from 'lucide-react';

type TeamRole = 'owner' | 'hiring_manager' | 'recruiter' | 'interviewer' | 'viewer';

interface TeamMember {
  id: string;
  employer_id: string;
  profile_id: string;
  team_role: TeamRole;
  invited_email: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean;
  permissions: {
    can_post_jobs: boolean;
    can_manage_candidates: boolean;
    can_schedule_interviews: boolean;
    can_manage_team: boolean;
    can_approve_offers: boolean;
  };
  created_at: string;
  // joined from profiles
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface TeamManagementProps {
  employerId: string;
}

const ROLE_CONFIG: Record<TeamRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20', description: 'Full access to everything' },
  hiring_manager: { label: 'Hiring Manager', icon: Briefcase, color: 'bg-primary/15 text-primary border-primary/20', description: 'Manage jobs, candidates & offers' },
  recruiter: { label: 'Recruiter', icon: Users, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20', description: 'Source & screen candidates' },
  interviewer: { label: 'Interviewer', icon: Calendar, color: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20', description: 'Conduct interviews & feedback' },
  viewer: { label: 'Viewer', icon: Eye, color: 'bg-muted text-muted-foreground border-border', description: 'Read-only access' },
};

const DEFAULT_PERMISSIONS: Record<TeamRole, TeamMember['permissions']> = {
  owner: { can_post_jobs: true, can_manage_candidates: true, can_schedule_interviews: true, can_manage_team: true, can_approve_offers: true },
  hiring_manager: { can_post_jobs: true, can_manage_candidates: true, can_schedule_interviews: true, can_manage_team: false, can_approve_offers: true },
  recruiter: { can_post_jobs: false, can_manage_candidates: true, can_schedule_interviews: true, can_manage_team: false, can_approve_offers: false },
  interviewer: { can_post_jobs: false, can_manage_candidates: false, can_schedule_interviews: true, can_manage_team: false, can_approve_offers: false },
  viewer: { can_post_jobs: false, can_manage_candidates: false, can_schedule_interviews: false, can_manage_team: false, can_approve_offers: false },
};

export const TeamManagement = ({ employerId }: TeamManagementProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('employer_team_members')
      .select('*, profile:profiles(full_name, avatar_url)')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team:', error);
      toast.error('Failed to load team members');
    } else {
      setMembers((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [employerId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      // Check if this email is already a member
      const existing = members.find(m => m.invited_email?.toLowerCase() === inviteEmail.toLowerCase());
      if (existing) {
        toast.error('This person is already on your team');
        setInviting(false);
        return;
      }

      // Look up the profile by email through auth — we'll use invited_email as a placeholder
      // The profile_id will need to be linked when they accept
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', inviteEmail) // fallback lookup
        .limit(1);

      // For now, create with a placeholder — the invite is email-based
      const { error } = await supabase
        .from('employer_team_members')
        .insert({
          employer_id: employerId,
          profile_id: profiles?.[0]?.id || employerId, // placeholder if no profile found yet
          team_role: inviteRole,
          invited_email: inviteEmail.trim().toLowerCase(),
          permissions: DEFAULT_PERMISSIONS[inviteRole],
          is_active: false,
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('viewer');
      setInviteOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    }
    setInviting(false);
  };

  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    if (member.team_role === 'owner') {
      toast.error('Cannot change the owner role');
      return;
    }

    const { error } = await supabase
      .from('employer_team_members')
      .update({
        team_role: newRole,
        permissions: DEFAULT_PERMISSIONS[newRole],
      })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated');
      fetchMembers();
      setEditingMember(null);
    }
  };

  const handlePermissionToggle = async (member: TeamMember, key: keyof TeamMember['permissions'], value: boolean) => {
    const newPermissions = { ...member.permissions, [key]: value };
    const { error } = await supabase
      .from('employer_team_members')
      .update({ permissions: newPermissions })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to update permission');
    } else {
      toast.success('Permission updated');
      fetchMembers();
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (member.team_role === 'owner') {
      toast.error('Cannot remove the owner');
      return;
    }

    const { error } = await supabase
      .from('employer_team_members')
      .delete()
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to remove member');
    } else {
      toast.success('Team member removed');
      fetchMembers();
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    if (member.team_role === 'owner') return;
    const { error } = await supabase
      .from('employer_team_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(member.is_active ? 'Member deactivated' : 'Member activated');
      fetchMembers();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const activeCount = members.filter(m => m.is_active).length;
  const pendingCount = members.filter(m => !m.accepted_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Team Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''} · {activeCount} active · {pendingCount} pending
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-sm">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team. They'll get access based on the role you assign.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['hiring_manager', 'recruiter', 'interviewer', 'viewer'] as TeamRole[]).map(role => {
                      const config = ROLE_CONFIG[role];
                      return (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <config.icon className="w-4 h-4" />
                            <div>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-muted-foreground text-xs ml-2">— {config.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {/* Role permissions preview */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</p>
                {Object.entries(DEFAULT_PERMISSIONS[inviteRole]).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <Badge variant={val ? 'default' : 'outline'} className="text-[10px]">
                      {val ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">No team members yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Invite colleagues to collaborate on hiring. Assign roles to control what they can access.
              </p>
              <Button className="mt-4 gap-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4" />
                Invite Your First Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          members.map((member) => {
            const roleConfig = ROLE_CONFIG[member.team_role];
            const RoleIcon = roleConfig.icon;
            const isPending = !member.accepted_at;
            const name = member.profile?.full_name || member.invited_email || 'Unknown';

            return (
              <Card key={member.id} className={`transition-all hover:shadow-md ${!member.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="w-11 h-11 ring-2 ring-border">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.is_active && member.accepted_at && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm truncate">{name}</span>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 font-semibold gap-1 ${roleConfig.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </Badge>
                        {isPending && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                        {!member.is_active && !isPending && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground gap-1">
                            Deactivated
                          </Badge>
                        )}
                      </div>
                      {member.invited_email && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.invited_email}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {isPending
                          ? `Invited ${member.invited_at ? new Date(member.invited_at).toLocaleDateString() : ''}`
                          : `Joined ${member.accepted_at ? new Date(member.accepted_at).toLocaleDateString() : ''}`
                        }
                      </p>
                    </div>

                    {/* Actions */}
                    {member.team_role !== 'owner' && (
                      <div className="flex items-center gap-1.5">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-primary/10"
                              onClick={() => setEditingMember(member)}
                            >
                              <Shield className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Role & Permissions</DialogTitle>
                              <DialogDescription>
                                Manage {name}'s access level and specific permissions.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={member.team_role}
                                  onValueChange={(v) => handleRoleChange(member, v as TeamRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(['hiring_manager', 'recruiter', 'interviewer', 'viewer'] as TeamRole[]).map(role => (
                                      <SelectItem key={role} value={role}>
                                        {ROLE_CONFIG[role].label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Separator />
                              <div className="space-y-3">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Custom Permissions</Label>
                                {Object.entries(member.permissions).map(([key, val]) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                    <Switch
                                      checked={val}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(member, key as keyof TeamMember['permissions'], checked)
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Active Status</p>
                                  <p className="text-xs text-muted-foreground">Deactivated members lose all access</p>
                                </div>
                                <Switch
                                  checked={member.is_active}
                                  onCheckedChange={() => handleToggleActive(member)}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Remove ${name} from the team?`)) {
                              handleRemove(member);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive/70" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Role Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Role Reference</CardTitle>
          <CardDescription className="text-xs">What each role can do by default</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => {
              const Icon = config.icon;
              return (
                <div key={role} className={`rounded-xl border p-3 ${config.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{config.label}</span>
                  </div>
                  <p className="text-xs opacity-80">{config.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
