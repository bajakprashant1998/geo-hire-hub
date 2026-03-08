import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageCircle, Send, Loader2, Clock, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCollaborationNotesProps {
  employerId: string;
}

interface Note {
  id: string;
  note: string;
  created_at: string;
  employer_id: string;
  application_id: string;
}

export const TeamCollaborationNotes = ({ employerId }: TeamCollaborationNotesProps) => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });
      setJobs(data || []);
    };
    fetchJobs();
  }, [employerId]);

  useEffect(() => {
    if (!selectedJobId) return;
    const fetchApplications = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('applications')
        .select(`
          id, status, kanban_stage,
          candidates!applications_candidate_id_fkey (
            profiles!candidates_profile_id_fkey (full_name, avatar_url)
          )
        `)
        .eq('job_id', selectedJobId);

      setApplications(
        (data || []).map((a: any) => ({
          id: a.id,
          name: a.candidates?.profiles?.full_name || 'Unknown',
          avatar: a.candidates?.profiles?.avatar_url,
          stage: a.kanban_stage,
        }))
      );
      setSelectedAppId('');
      setNotes([]);
      setLoading(false);
    };
    fetchApplications();
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedAppId) return;
    const fetchNotes = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('application_notes')
        .select('*')
        .eq('application_id', selectedAppId)
        .order('created_at', { ascending: true });
      setNotes(data || []);
      setLoading(false);
    };
    fetchNotes();
  }, [selectedAppId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedAppId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('application_notes')
        .insert({
          application_id: selectedAppId,
          employer_id: employerId,
          note: newNote.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setNotes([...notes, data]);
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Team Collaboration Notes</h2>
          <p className="text-sm text-muted-foreground">Add comments and notes on candidates for your hiring team</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select a job" />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedAppId} onValueChange={setSelectedAppId} disabled={!selectedJobId}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select a candidate" />
          </SelectTrigger>
          <SelectContent>
            {applications.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.stage})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAppId && (
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {notes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet. Be the first to add one!</p>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">{profile?.full_name || 'Hiring Manager'}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{note.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-border/20">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this candidate..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={submitting || !newNote.trim()}
                    size="icon"
                    className="shrink-0 self-end rounded-xl h-10 w-10"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedJobId && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select a job and candidate to view and add collaboration notes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
