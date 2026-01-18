import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  CheckCircle2,
  XCircle,
  Trophy,
  Mail,
  MessageSquare,
  StickyNote,
  Eye,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Applicant {
  id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  candidates: {
    id: string;
    job_title: string;
    experience_years: number;
    skills: string[];
    profiles: {
      full_name: string;
      avatar_url: string | null;
      user_id: string;
    };
  };
  notes?: Array<{ id: string; note: string; created_at: string }>;
}

interface ApplicantTabsProps {
  jobId: string;
  employerId: string;
}

const statusConfig = {
  pending: { label: 'New', icon: Users, color: 'bg-primary/10 text-primary' },
  shortlisted: { label: 'Shortlisted', icon: CheckCircle2, color: 'bg-success/10 text-success' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
  hired: { label: 'Hired', icon: Trophy, color: 'bg-warning/10 text-warning' },
};

export const ApplicantTabs = ({ jobId, employerId }: ApplicantTabsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidates (
            id,
            job_title,
            experience_years,
            skills,
            profiles (
              full_name,
              avatar_url,
              user_id
            )
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch notes for each application
      const applicantsWithNotes = await Promise.all(
        (data || []).map(async (app) => {
          const { data: notes } = await supabase
            .from('application_notes')
            .select('id, note, created_at')
            .eq('application_id', app.id)
            .order('created_at', { ascending: false });
          
          return { ...app, notes: notes || [] };
        })
      );

      setApplicants(applicantsWithNotes as Applicant[]);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId);

      if (error) throw error;

      setApplicants((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status } : app))
      );
      toast.success(`Application ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const saveNote = async () => {
    if (!selectedApplicant || !newNote.trim()) return;

    setSavingNote(true);
    try {
      const { data, error } = await supabase
        .from('application_notes')
        .insert({
          application_id: selectedApplicant.id,
          employer_id: employerId,
          note: newNote.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setApplicants((prev) =>
        prev.map((app) =>
          app.id === selectedApplicant.id
            ? { ...app, notes: [data, ...(app.notes || [])] }
            : app
        )
      );
      
      setNewNote('');
      setNoteDialogOpen(false);
      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        navigate(`/messages/${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: user.id,
            participant_2: otherUserId,
            job_id: jobId,
          })
          .select()
          .single();

        if (newConv && !error) {
          navigate(`/messages/${newConv.id}`);
        }
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const getCounts = () => ({
    pending: applicants.filter((a) => a.status === 'pending' || a.status === 'reviewed').length,
    shortlisted: applicants.filter((a) => a.status === 'shortlisted').length,
    rejected: applicants.filter((a) => a.status === 'rejected').length,
    hired: applicants.filter((a) => a.status === 'hired').length,
  });

  const counts = getCounts();

  const filteredApplicants = applicants.filter((a) => {
    if (activeTab === 'pending') return a.status === 'pending' || a.status === 'reviewed';
    return a.status === activeTab;
  });

  const renderApplicantCard = (applicant: Applicant) => (
    <Card key={applicant.id} className="shadow-google">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Applicant Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={applicant.candidates?.profiles?.avatar_url || ''} />
              <AvatarFallback>
                <Users className="w-6 h-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{applicant.candidates?.profiles?.full_name || 'Unknown'}</h4>
              <p className="text-sm text-muted-foreground">
                {applicant.candidates?.job_title} • {applicant.candidates?.experience_years}y exp
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {applicant.candidates?.skills?.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
              {applicant.notes && applicant.notes.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <StickyNote className="w-3 h-3" />
                  {applicant.notes.length} note{applicant.notes.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Profile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/candidates/${applicant.candidates?.id}`)}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>

            {/* Message */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startConversation(applicant.candidates?.profiles?.user_id)}
            >
              <Mail className="w-4 h-4 mr-1" />
              Message
            </Button>

            {/* Add Note */}
            <Dialog open={noteDialogOpen && selectedApplicant?.id === applicant.id} onOpenChange={(open) => {
              setNoteDialogOpen(open);
              if (open) setSelectedApplicant(applicant);
            }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setSelectedApplicant(applicant)}>
                  <StickyNote className="w-4 h-4 mr-1" />
                  Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Private Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Add a private note about this candidate..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                  />
                  {applicant.notes && applicant.notes.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium">Previous Notes:</p>
                      {applicant.notes.map((note) => (
                        <div key={note.id} className="p-2 bg-muted rounded text-sm">
                          <p>{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button onClick={saveNote} disabled={savingNote || !newNote.trim()}>
                    {savingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Status Actions */}
            {(applicant.status === 'pending' || applicant.status === 'reviewed') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-success"
                  onClick={() => updateStatus(applicant.id, 'shortlisted')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Shortlist
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => updateStatus(applicant.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {applicant.status === 'shortlisted' && (
              <Button
                size="sm"
                className="bg-success hover:bg-success/90"
                onClick={() => updateStatus(applicant.id, 'hired')}
              >
                <Trophy className="w-4 h-4 mr-1" />
                Hire
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-4 w-full">
        {Object.entries(statusConfig).map(([status, config]) => (
          <TabsTrigger key={status} value={status} className="relative">
            <config.icon className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{config.label}</span>
            {counts[status as keyof typeof counts] > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 min-w-[20px] px-1.5"
              >
                {counts[status as keyof typeof counts]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.keys(statusConfig).map((status) => (
        <TabsContent key={status} value={status} className="mt-4 space-y-4">
          {filteredApplicants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {statusConfig[status as keyof typeof statusConfig].label.toLowerCase()} applicants</p>
            </div>
          ) : (
            filteredApplicants.map(renderApplicantCard)
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
