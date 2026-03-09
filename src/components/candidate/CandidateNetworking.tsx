import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, UserPlus, UserCheck, Search, MessageSquare, Clock, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CandidateNetworkingProps {
  candidateId: string;
}

interface ConnectionWithProfile {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  message: string | null;
  created_at: string;
  peer_name: string;
  peer_title: string;
  peer_avatar: string | null;
  peer_skills: string[];
  peer_candidate_id: string;
}

export const CandidateNetworking = ({ candidateId }: CandidateNetworkingProps) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [discoverList, setDiscoverList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectDialog, setConnectDialog] = useState<{ open: boolean; targetId: string; targetName: string }>({ open: false, targetId: '', targetName: '' });
  const [connectMessage, setConnectMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('connections');

  useEffect(() => { fetchConnections(); }, [candidateId]);
  useEffect(() => { if (tab === 'discover') fetchDiscoverCandidates(); }, [tab, searchQuery]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_connections')
        .select('*')
        .or(`requester_id.eq.${candidateId},receiver_id.eq.${candidateId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with profile data
      const peerIds = (data || []).map(c => c.requester_id === candidateId ? c.receiver_id : c.requester_id);
      if (peerIds.length === 0) { setConnections([]); setLoading(false); return; }

      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, job_title, skills, profiles:profile_id(full_name, avatar_url)')
        .in('id', peerIds);

      const candidateMap = new Map((candidates || []).map(c => [c.id, c]));

      const enriched: ConnectionWithProfile[] = (data || []).map(conn => {
        const peerId = conn.requester_id === candidateId ? conn.receiver_id : conn.requester_id;
        const peer = candidateMap.get(peerId) as any;
        return {
          ...conn,
          peer_candidate_id: peerId,
          peer_name: peer?.profiles?.full_name || 'Unknown',
          peer_title: peer?.job_title || '',
          peer_avatar: peer?.profiles?.avatar_url || null,
          peer_skills: peer?.skills || [],
        };
      });

      setConnections(enriched);
    } catch { toast.error('Failed to load connections'); }
    finally { setLoading(false); }
  };

  const fetchDiscoverCandidates = async () => {
    try {
      let query = supabase
        .from('candidates')
        .select('id, job_title, skills, profiles:profile_id(full_name, avatar_url)')
        .neq('id', candidateId)
        .limit(20);

      if (searchQuery.trim()) {
        query = query.or(`job_title.ilike.%${searchQuery}%,skills.cs.{${searchQuery}}`);
      }

      const { data } = await query;
      // Filter out already connected
      const connectedIds = new Set(connections.map(c => c.peer_candidate_id));
      setDiscoverList((data || []).filter(c => !connectedIds.has(c.id)));
    } catch { /* silent */ }
  };

  const sendConnectionRequest = async () => {
    setSending(true);
    try {
      const { error } = await supabase.from('candidate_connections').insert({
        requester_id: candidateId,
        receiver_id: connectDialog.targetId,
        message: connectMessage.trim() || null,
      });
      if (error) throw error;
      toast.success(`Connection request sent to ${connectDialog.targetName}`);
      setConnectDialog({ open: false, targetId: '', targetName: '' });
      setConnectMessage('');
      fetchConnections();
    } catch (e: any) {
      toast.error(e.message?.includes('duplicate') ? 'Connection already exists' : 'Failed to send request');
    } finally { setSending(false); }
  };

  const respondToRequest = async (connectionId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('candidate_connections')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', connectionId);
      if (error) throw error;
      toast.success(status === 'accepted' ? 'Connection accepted!' : 'Request declined');
      fetchConnections();
    } catch { toast.error('Failed to update request'); }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase.from('candidate_connections').delete().eq('id', connectionId);
      if (error) throw error;
      toast.success('Connection removed');
      fetchConnections();
    } catch { toast.error('Failed to remove connection'); }
  };

  const pendingReceived = connections.filter(c => c.status === 'pending' && c.receiver_id === candidateId);
  const pendingSent = connections.filter(c => c.status === 'pending' && c.requester_id === candidateId);
  const accepted = connections.filter(c => c.status === 'accepted');

  const PeerCard = ({ name, title, avatar, skills, actions }: { name: string; title: string; avatar: string | null; skills: string[]; actions: React.ReactNode }) => (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback className="bg-primary/10 text-primary">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skills.slice(0, 3).map(s => (
                <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
              ))}
              {skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{skills.length - 3}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Networking
          </h2>
          <p className="text-sm text-muted-foreground">{accepted.length} connection{accepted.length !== 1 ? 's' : ''} · {pendingReceived.length} pending</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="connections" className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Connections
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending
            {pendingReceived.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{pendingReceived.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : accepted.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No connections yet. Discover peers to grow your network!</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setTab('discover')}>
                  <UserPlus className="w-4 h-4 mr-1.5" /> Find Peers
                </Button>
              </CardContent>
            </Card>
          ) : accepted.map(conn => (
            <PeerCard key={conn.id} name={conn.peer_name} title={conn.peer_title} avatar={conn.peer_avatar} skills={conn.peer_skills}
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/candidates/${conn.peer_candidate_id}`, '_blank')}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeConnection(conn.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingReceived.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Received Requests</h3>
              {pendingReceived.map(conn => (
                <PeerCard key={conn.id} name={conn.peer_name} title={conn.peer_title} avatar={conn.peer_avatar} skills={conn.peer_skills}
                  actions={
                    <>
                      <Button size="sm" onClick={() => respondToRequest(conn.id, 'accepted')}>Accept</Button>
                      <Button variant="ghost" size="sm" onClick={() => respondToRequest(conn.id, 'rejected')}>Decline</Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
          {pendingSent.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Sent Requests</h3>
              {pendingSent.map(conn => (
                <PeerCard key={conn.id} name={conn.peer_name} title={conn.peer_title} avatar={conn.peer_avatar} skills={conn.peer_skills}
                  actions={
                    <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                  }
                />
              ))}
            </div>
          )}
          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No pending requests</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by job title or skill..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-3">
            {discoverList.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">No candidates found. Try a different search.</p>
            ) : discoverList.map((c: any) => (
              <PeerCard key={c.id} name={c.profiles?.full_name || 'Unknown'} title={c.job_title} avatar={c.profiles?.avatar_url} skills={c.skills || []}
                actions={
                  <Button size="sm" variant="outline" onClick={() => setConnectDialog({ open: true, targetId: c.id, targetName: c.profiles?.full_name || 'this candidate' })}>
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Connect
                  </Button>
                }
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={connectDialog.open} onOpenChange={open => { if (!open) setConnectDialog({ open: false, targetId: '', targetName: '' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect with {connectDialog.targetName}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Add a short message (optional)..." value={connectMessage} onChange={e => setConnectMessage(e.target.value)} rows={3} maxLength={300} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog({ open: false, targetId: '', targetName: '' })}>Cancel</Button>
            <Button onClick={sendConnectionRequest} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
