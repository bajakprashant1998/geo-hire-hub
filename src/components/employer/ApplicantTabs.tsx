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
  StickyNote,
  Eye,
  Loader2,
  Briefcase,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
  pending: { label: 'New', icon: Users, color: 'text-primary' },
  shortlisted: { label: 'Shortlisted', icon: CheckCircle2, color: 'text-success' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-destructive' },
  hired: { label: 'Hired', icon: Trophy, color: 'text-warning' },
};

export const ApplicantTabs = ({ jobId, employerId }: ApplicantTabsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
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

  const handleBulkAction = async (status: string) => {
    if (selectedApplicants.length === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .in('id', selectedApplicants);

      if (error) throw error;

      setApplicants(prev => prev.map(app =>
        selectedApplicants.includes(app.id) ? { ...app, status } : app
      ));
      setSelectedApplicants([]);
      toast.success(`${selectedApplicants.length} applications updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update applications');
    } finally {
      setBulkActionLoading(false);
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

  const toggleSelectAll = () => {
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(filteredApplicants.map(a => a.id));
    }
  };

  const renderApplicantCard = (applicant: Applicant, index: number) => {
    const candidate = applicant.candidates;
    const profile = candidate?.profiles;
    const initials = (profile?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
      <motion.div
        key={applicant.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Card className="group hover:shadow-md transition-all duration-200 border-border/60">
          <CardContent className="p-4 sm:p-5">
            {/* Top row: checkbox + avatar + name/meta + actions */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedApplicants.includes(applicant.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedApplicants([...selectedApplicants, applicant.id]);
                  else setSelectedApplicants(selectedApplicants.filter(id => id !== applicant.id));
                }}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary mt-1 shrink-0"
              />

              <Avatar className="w-11 h-11 shrink-0 ring-2 ring-background shadow-sm">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Name + inline meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground text-sm leading-tight truncate max-w-[180px] sm:max-w-none">
                    {profile?.full_name || 'Unknown'}
                  </h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Briefcase className="w-3 h-3" />
                    {candidate?.job_title || 'N/A'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {candidate?.experience_years || 0}y exp
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(applicant.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Skills as inline badges - max 4 visible */}
                {candidate?.skills && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {candidate.skills.slice(0, 4).map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-[10px] font-normal px-1.5 py-0 h-5 max-w-[120px] truncate"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 4 && (
                      <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-5">
                        +{candidate.skills.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Notes indicator */}
                {applicant.notes && applicant.notes.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <StickyNote className="w-2.5 h-2.5" />
                    {applicant.notes.length} note{applicant.notes.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-1 mt-3 ml-[68px] flex-wrap">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] px-2" onClick={() => navigate(`/candidates/${candidate?.id}`)}>
                <Eye className="w-3 h-3" /> View
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] px-2" onClick={() => startConversation(profile?.user_id)}>
                <Mail className="w-3 h-3" /> Message
              </Button>

              <Dialog open={noteDialogOpen && selectedApplicant?.id === applicant.id} onOpenChange={(open) => {
                setNoteDialogOpen(open);
                if (open) setSelectedApplicant(applicant);
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] px-2" onClick={() => setSelectedApplicant(applicant)}>
                    <StickyNote className="w-3 h-3" /> Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notes for {profile?.full_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea placeholder="Add a private note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={4} />
                    {applicant.notes && applicant.notes.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium text-muted-foreground">Previous Notes</p>
                        {applicant.notes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted/50 rounded-lg text-sm border border-border/50">
                            <p className="text-foreground">{note.note}</p>
                            <p className="text-xs text-muted-foreground mt-1.5">{new Date(note.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button onClick={saveNote} disabled={savingNote || !newNote.trim()} className="w-full">
                      {savingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex-1" />

              {(applicant.status === 'pending' || applicant.status === 'reviewed') && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px] px-2 text-success hover:text-success hover:bg-success/10" onClick={() => updateStatus(applicant.id, 'shortlisted')}>
                    <CheckCircle2 className="w-3 h-3" /> Shortlist
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => updateStatus(applicant.id, 'rejected')}>
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                </>
              )}
              {applicant.status === 'shortlisted' && (
                <Button size="sm" className="h-7 gap-1 text-[11px] px-2 bg-success hover:bg-success/90 text-success-foreground" onClick={() => updateStatus(applicant.id, 'hired')}>
                  <Trophy className="w-3 h-3" /> Hire
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

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
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedApplicants([]); }}>
      <TabsList className="grid grid-cols-4 w-full h-11 bg-muted/50">
        {Object.entries(statusConfig).map(([status, config]) => (
          <TabsTrigger
            key={status}
            value={status}
            className="relative gap-1.5 data-[state=active]:shadow-sm text-xs sm:text-sm"
          >
            <config.icon className={`w-4 h-4 ${config.color}`} />
            <span className="hidden sm:inline">{config.label}</span>
            {counts[status as keyof typeof counts] > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
              >
                {counts[status as keyof typeof counts]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.keys(statusConfig).map((status) => (
        <TabsContent key={status} value={status} className="mt-4 space-y-3">
          {/* Bulk actions bar */}
          <AnimatePresence>
            {selectedApplicants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3">
                  <input
                    type="checkbox"
                    checked={selectedApplicants.length === filteredApplicants.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-foreground">{selectedApplicants.length} selected</span>
                  <div className="flex-1" />
                  {activeTab === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleBulkAction('shortlisted')} disabled={bulkActionLoading}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30" onClick={() => handleBulkAction('rejected')} disabled={bulkActionLoading}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {activeTab === 'shortlisted' && (
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90" onClick={() => handleBulkAction('hired')} disabled={bulkActionLoading}>
                      <Trophy className="w-3.5 h-3.5" /> Hire All
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Select all toggle when there are applicants */}
          {filteredApplicants.length > 1 && selectedApplicants.length === 0 && (
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Select all ({filteredApplicants.length})
              </button>
            </div>
          )}

          {filteredApplicants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-14 h-14 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No {statusConfig[status as keyof typeof statusConfig].label.toLowerCase()} applicants</p>
              <p className="text-sm mt-1 opacity-70">Applications will appear here when candidates apply</p>
            </div>
          ) : (
            filteredApplicants.map((applicant, index) => renderApplicantCard(applicant, index))
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
