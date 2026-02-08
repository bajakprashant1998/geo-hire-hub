import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  MessageSquare, 
  Trash2, 
  Eye,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { StatsCard } from '@/components/admin/StatsCard';
import { PaginationControls } from '@/components/admin/PaginationControls';

const PAGE_SIZE = 20;

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  message_count?: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

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

  const { data: messages } = useQuery({
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
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      const { count: todayMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      const { count: oldMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

      return {
        total: totalMessages || 0,
        today: todayMessages || 0,
        old: oldMessages || 0,
        conversations: conversations?.length || 0
      };
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete all messages first
      await supabase.from('messages').delete().eq('conversation_id', id);
      // Then delete conversation
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'delete',
        p_target_type: 'conversation',
        p_target_id: id,
        p_details: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      setDeleteDialog(null);
      setSelectedConversation(null);
      toast.success('Conversation deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const cleanupOldMessagesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_old_messages');
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'cleanup',
        p_target_type: 'messages',
        p_target_id: 'all',
        p_details: { type: 'old_messages' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-stats'] });
      setDeleteDialog(null);
      toast.success('Old messages cleaned up');
    },
    onError: (error) => {
      toast.error('Failed to cleanup: ' + error.message);
    },
  });

  const filteredConversations = conversations?.filter((conv) =>
    conv.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Message Moderation">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Messages" value={stats?.total || 0} icon={MessageSquare} />
        <StatsCard title="Today" value={stats?.today || 0} icon={Clock} variant="success" />
        <StatsCard title="Conversations" value={stats?.conversations || 0} icon={MessageSquare} />
        <StatsCard title="Old (60+ days)" value={stats?.old || 0} icon={AlertTriangle} variant="warning" />
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Maintenance Actions</CardTitle>
          <CardDescription>Manage message storage and cleanup</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button 
            variant="outline"
            onClick={() => setDeleteDialog({ type: 'old' })}
            disabled={cleanupOldMessagesMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Old Messages (60+ days)
          </Button>
        </CardContent>
      </Card>

      {/* Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredConversations?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No conversations</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conversation</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConversations?.map((conv) => (
                      <TableRow 
                        key={conv.id}
                        className={selectedConversation?.id === conv.id ? 'bg-muted' : ''}
                      >
                        <TableCell className="font-mono text-xs">
                          {conv.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedConversation(conv)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ type: 'conversation', id: conv.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </Card>

        {/* Message Preview */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedConversation ? 'Conversation Messages' : 'Select a Conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {messages?.map((msg) => (
                    <div 
                      key={msg.id}
                      className="p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {msg.sender_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                  {messages?.length === 0 && (
                    <p className="text-center text-muted-foreground">No messages</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.type === 'old' ? 'Cleanup Old Messages' : 'Delete Conversation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'old' 
                ? 'This will permanently delete all messages older than 60 days. This action cannot be undone.'
                : 'This will permanently delete this conversation and all its messages. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog?.type === 'old') {
                  cleanupOldMessagesMutation.mutate();
                } else if (deleteDialog?.id) {
                  deleteConversationMutation.mutate(deleteDialog.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
