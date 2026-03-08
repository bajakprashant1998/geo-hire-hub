import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MessageSquare, Trash2, Eye, AlertTriangle, Clock, Users, Send, Calendar, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

// --- Sub-components ---

function KPICard({ title, value, icon: Icon, gradient, delay }: { title: string; value: number | string; icon: React.ElementType; gradient: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <Card className={cn('relative overflow-hidden border-0 shadow-lg', gradient)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MessageBubble({ msg, isAlt }: { msg: Message; isAlt: boolean }) {
  return (
    <div className={cn('flex', isAlt ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isAlt ? 'bg-primary/10 text-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
      )}>
        <p>{msg.content}</p>
        <div className={cn('flex items-center gap-2 mt-1.5', isAlt ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground font-mono">{msg.sender_id.slice(0, 8)}…</span>
          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), 'MMM d, HH:mm')}</span>
          {msg.is_read && <span className="text-[10px] text-primary">✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// --- Main ---

export default function AdminMessages() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'conversation' | 'old'; id?: string } | null>(null);

  const { data: convData, isLoading } = useQuery({
    queryKey: ['admin-conversations', page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .order('last_message_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { conversations: data as Conversation[], total: count || 0 };
    },
  });

  const conversations = convData?.conversations;
  const totalPages = Math.ceil((convData?.total || 0) / PAGE_SIZE);

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ['admin-conversation-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-message-stats'],
    queryFn: async () => {
      const [totalRes, todayRes, oldRes, convRes] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('messages').select('id', { count: 'exact', head: true }).lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
      ]);
      return { total: totalRes.count || 0, today: todayRes.count || 0, old: oldRes.count || 0, conversations: convRes.count || 0 };
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('messages').delete().eq('conversation_id', id);
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: 'delete', p_target_type: 'conversation', p_target_id: id, p_details: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-stats'] });
      setDeleteDialog(null);
      setSelectedConversation(null);
      toast.success('Conversation deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const cleanupOldMessagesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_old_messages');
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: 'cleanup', p_target_type: 'messages', p_target_id: 'all', p_details: { type: 'old_messages' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-stats'] });
      setDeleteDialog(null);
      toast.success('Old messages cleaned up');
    },
    onError: (error) => toast.error('Failed to cleanup: ' + error.message),
  });

  const filteredConversations = conversations?.filter((conv) =>
    conv.id.toLowerCase().includes(search.toLowerCase()) ||
    conv.participant_1?.toLowerCase().includes(search.toLowerCase()) ||
    conv.participant_2?.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = deleteConversationMutation.isPending || cleanupOldMessagesMutation.isPending;

  return (
    <AdminLayout title="Message Moderation">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total Messages" value={stats?.total || 0} icon={MessageSquare} gradient="bg-gradient-to-br from-primary to-primary/70" delay={0} />
        <KPICard title="Today" value={stats?.today || 0} icon={Send} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" delay={0.05} />
        <KPICard title="Conversations" value={stats?.conversations || 0} icon={Users} gradient="bg-gradient-to-br from-sky-600 to-sky-500" delay={0.1} />
        <KPICard title="Old (60+ days)" value={stats?.old || 0} icon={Archive} gradient="bg-gradient-to-br from-amber-600 to-amber-500" delay={0.15} />
      </div>

      {/* Maintenance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Storage Maintenance</p>
                <p className="text-xs text-muted-foreground">{stats?.old || 0} messages older than 60 days can be cleaned up to free storage.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setDeleteDialog({ type: 'old' })}
              disabled={isPending || !stats?.old}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cleanup Old Messages
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-pane Layout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Conversations List */}
        <Card className="lg:col-span-2 rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-3">Conversations</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID or participant…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-muted/40" />
            </div>
          </div>
          <ScrollArea className="flex-1 max-h-[500px]">
            {isLoading ? (
              <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : !filteredConversations?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No conversations</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors group',
                      selectedConversation?.id === conv.id ? 'bg-primary/10' : 'hover:bg-muted/60'
                    )}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-mono truncate">{conv.id.slice(0, 12)}…</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                            onClick={(e) => { e.stopPropagation(); setDeleteDialog({ type: 'conversation', id: conv.id }); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Delete conversation</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2">
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </Card>

        {/* Message Preview */}
        <Card className="lg:col-span-3 rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 opacity-40" />
              </div>
              <p className="font-medium">Select a Conversation</p>
              <p className="text-sm mt-1">Click on a conversation to view its messages</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Conversation</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedConversation.id.slice(0, 16)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-lg">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(selectedConversation.created_at), 'MMM d, yyyy')}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Conversation started</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="text-[11px] gap-1">
                    {messages?.length || 0} messages
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog({ type: 'conversation', id: selectedConversation.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 max-h-[450px]">
                <div className="p-5 space-y-3">
                  {msgsLoading ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-3/4 rounded-xl" style={{ marginLeft: i % 2 ? 'auto' : 0 }} />)}</div>
                  ) : !messages?.length ? (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-sm">No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <MessageBubble key={msg.id} msg={msg} isAlt={msg.sender_id === selectedConversation.participant_2} />
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Participants Footer */}
              <div className="px-5 py-3 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">Participants:</span>
                <span className="font-mono">{selectedConversation.participant_1.slice(0, 10)}…</span>
                <span>↔</span>
                <span className="font-mono">{selectedConversation.participant_2.slice(0, 10)}…</span>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteDialog?.type === 'old' ? <Archive className="h-5 w-5 text-amber-600" /> : <Trash2 className="h-5 w-5 text-destructive" />}
              {deleteDialog?.type === 'old' ? 'Cleanup Old Messages' : 'Delete Conversation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'old'
                ? `This will permanently delete ${stats?.old || 0} messages older than 60 days. This action cannot be undone.`
                : 'This will permanently delete this conversation and all its messages. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog?.type === 'old') cleanupOldMessagesMutation.mutate();
                else if (deleteDialog?.id) deleteConversationMutation.mutate(deleteDialog.id);
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Processing…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
