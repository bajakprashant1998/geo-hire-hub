import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  CalendarPlus,
  CheckCircle,
  XCircle,
  Building2,
  Loader2,
  CalendarDays,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InterviewCalendar } from './InterviewCalendar';

interface CandidateInterviewManagerProps {
  candidateId: string;
}

interface InterviewRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  interview_type: string;
  meeting_link: string | null;
  location: string | null;
  status: string;
  requested_by: string;
  candidate_message: string | null;
  confirmed_by_candidate: boolean;
  confirmed_by_employer: boolean;
  cancel_reason: string | null;
  completed_at: string | null;
  job_id: string;
  employer_id: string;
  created_at: string;
  jobs: { title: string; job_address: string | null };
  employers: { company_name: string; profile_id: string };
}

interface AppliedJob {
  id: string;
  job_id: string;
  job: { id: string; title: string; employer_id: string; employers: { company_name: string } };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  requested: { label: 'Requested', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Send },
  pending_confirmation: { label: 'Pending', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CalendarDays },
  confirmed: { label: 'Confirmed', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  rescheduled: { label: 'Rescheduled', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: RefreshCw },
  rejected: { label: 'Declined', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

export const CandidateInterviewManager = ({ candidateId }: CandidateInterviewManagerProps) => {
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    applicationId: '',
    jobId: '',
    employerId: '',
    date: '',
    time: '',
    type: 'video',
    message: '',
  });

  useEffect(() => {
    fetchData();
    // Realtime subscription
    const channel = supabase
      .channel('candidate-interviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews', filter: `candidate_id=eq.${candidateId}` }, () => {
        fetchInterviews();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [candidateId]);

  const fetchData = async () => {
    await Promise.all([fetchInterviews(), fetchAppliedJobs()]);
    setLoading(false);
  };

  const fetchInterviews = async () => {
    const { data } = await supabase
      .from('interviews')
      .select(`
        id, scheduled_date, scheduled_time, interview_type, meeting_link, location, status,
        requested_by, candidate_message, confirmed_by_candidate, confirmed_by_employer,
        cancel_reason, completed_at, job_id, employer_id, created_at,
        jobs!inner(title, job_address),
        employers!inner(company_name, profile_id)
      `)
      .eq('candidate_id', candidateId)
      .order('scheduled_date', { ascending: true });

    setInterviews((data as any) || []);
  };

  const fetchAppliedJobs = async () => {
    const { data } = await supabase
      .from('applications')
      .select(`id, job_id, job:jobs!inner(id, title, employer_id, employers:employers!inner(company_name))`)
      .eq('candidate_id', candidateId)
      .in('status', ['pending', 'reviewing', 'shortlisted']);
    setAppliedJobs((data as any) || []);
  };

  const upcoming = useMemo(() => interviews.filter(i =>
    ['scheduled', 'confirmed', 'pending_confirmation'].includes(i.status) &&
    !isBefore(new Date(i.scheduled_date), new Date(new Date().toDateString()))
  ), [interviews]);

  const requested = useMemo(() => interviews.filter(i =>
    i.status === 'requested' || (i.status === 'scheduled' && i.requested_by === 'employer' && !i.confirmed_by_candidate)
  ), [interviews]);

  const past = useMemo(() => interviews.filter(i =>
    ['completed', 'cancelled', 'rejected'].includes(i.status) ||
    (isBefore(new Date(i.scheduled_date), new Date(new Date().toDateString())) && i.status !== 'requested')
  ), [interviews]);

  const handleRequestInterview = async () => {
    if (!requestForm.jobId || !requestForm.date || !requestForm.time) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('interviews').insert({
        candidate_id: candidateId,
        job_id: requestForm.jobId,
        employer_id: requestForm.employerId,
        application_id: requestForm.applicationId,
        scheduled_date: requestForm.date,
        scheduled_time: requestForm.time,
        interview_type: requestForm.type,
        requested_by: 'candidate',
        candidate_message: requestForm.message || null,
        status: 'requested',
      });
      if (error) throw error;
      toast.success('Interview request sent!');
      setRequestDialogOpen(false);
      setRequestForm({ applicationId: '', jobId: '', employerId: '', date: '', time: '', type: 'video', message: '' });
      fetchInterviews();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (interviewId: string) => {
    const { error } = await supabase.from('interviews').update({
      confirmed_by_candidate: true,
      status: 'confirmed',
    }).eq('id', interviewId);
    if (error) toast.error(error.message);
    else { toast.success('Interview confirmed!'); fetchInterviews(); }
  };

  const handleCancel = async (interviewId: string) => {
    const { error } = await supabase.from('interviews').update({
      status: 'cancelled',
      cancelled_by: 'candidate',
      cancel_reason: 'Cancelled by candidate',
    }).eq('id', interviewId);
    if (error) toast.error(error.message);
    else { toast.success('Interview cancelled'); fetchInterviews(); }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-3.5 h-3.5" />;
      case 'in-person': return <MapPin className="w-3.5 h-3.5" />;
      case 'phone': return <Phone className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video Call';
      case 'in-person': return 'In Person';
      case 'phone': return 'Phone';
      case 'assessment': return 'Assessment';
      default: return type;
    }
  };

  const renderInterviewCard = (interview: InterviewRow, showActions = false) => {
    const sc = statusConfig[interview.status] || statusConfig.requested;
    const StatusIcon = sc.icon;
    const needsConfirmation = interview.requested_by === 'employer' && !interview.confirmed_by_candidate && interview.status === 'scheduled';

    return (
      <motion.div
        key={interview.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border hover:shadow-md transition-all bg-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="text-center p-2 bg-primary/5 rounded-lg min-w-14">
              <p className="text-xl font-bold text-primary">{format(new Date(interview.scheduled_date), 'd')}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(interview.scheduled_date), 'MMM')}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{interview.jobs.title}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {interview.employers.company_name}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge variant="outline" className={cn("text-[10px] gap-1", sc.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {getTypeIcon(interview.interview_type)}
                  {getTypeLabel(interview.interview_type)}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {interview.scheduled_time}
                </span>
              </div>
              {interview.candidate_message && (
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">"{interview.candidate_message}"</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {(needsConfirmation || showActions) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            {needsConfirmation && (
              <>
                <Button size="sm" className="flex-1 text-xs" onClick={() => handleConfirm(interview.id)}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleCancel(interview.id)}>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                </Button>
              </>
            )}
            {interview.interview_type === 'video' && interview.meeting_link && interview.status === 'confirmed' && (
              <Button size="sm" className="text-xs" onClick={() => window.open(interview.meeting_link!, '_blank')}>
                <Video className="w-3.5 h-3.5 mr-1" /> Join
              </Button>
            )}
            {['scheduled', 'confirmed', 'requested'].includes(interview.status) && !needsConfirmation && (
              <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => handleCancel(interview.id)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Upcoming', value: upcoming.length, icon: CalendarDays, color: 'text-primary bg-primary/10' },
          { label: 'Pending', value: requested.length, icon: AlertCircle, color: 'text-amber-600 bg-amber-500/10' },
          { label: 'Completed', value: past.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'text-green-600 bg-green-500/10' },
          { label: 'Total', value: interviews.length, icon: Calendar, color: 'text-blue-600 bg-blue-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Request Interview Button */}
      {appliedJobs.length > 0 && (
        <Button onClick={() => setRequestDialogOpen(true)} className="w-full sm:w-auto gap-2">
          <CalendarPlus className="w-4 h-4" /> Request Interview
        </Button>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="upcoming" className="gap-1.5 text-xs sm:text-sm">
                <CalendarDays className="w-3.5 h-3.5" /> Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
                <Send className="w-3.5 h-3.5" /> Requests ({requested.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-1.5 text-xs sm:text-sm">
                <CheckCircle className="w-3.5 h-3.5" /> Past ({past.length})
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
                <Calendar className="w-3.5 h-3.5" /> Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {upcoming.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No upcoming interviews</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(i => renderInterviewCard(i, true))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              {requested.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No pending requests</p>
                  {appliedJobs.length > 0 && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setRequestDialogOpen(true)}>
                      <CalendarPlus className="w-4 h-4 mr-1" /> Request Interview
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {requested.map(i => renderInterviewCard(i, true))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {past.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No past interviews</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {past.map(i => renderInterviewCard(i))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar">
              <InterviewCalendar candidateId={candidateId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Interview Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Interview</DialogTitle>
            <DialogDescription>
              Choose a job you've applied to and propose an interview time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Job</Label>
              <Select
                value={requestForm.applicationId}
                onValueChange={(val) => {
                  const app = appliedJobs.find(a => a.id === val);
                  if (app) {
                    setRequestForm(prev => ({
                      ...prev,
                      applicationId: app.id,
                      jobId: app.job.id,
                      employerId: app.job.employer_id,
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {appliedJobs.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.job.title} — {app.job.employers.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Date</Label>
                <Input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Select value={requestForm.time} onValueChange={(v) => setRequestForm(prev => ({ ...prev, time: v }))}>
                  <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                      <SelectItem key={t} value={t}>
                        {parseInt(t) > 12 ? `${parseInt(t) - 12}:00 PM` : `${parseInt(t)}:00 AM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select value={requestForm.type} onValueChange={(v) => setRequestForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Call</div></SelectItem>
                  <SelectItem value="phone"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Call</div></SelectItem>
                  <SelectItem value="in-person"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> In-Person</div></SelectItem>
                  <SelectItem value="assessment"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Assessment</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Add a note for the employer..."
                value={requestForm.message}
                onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestInterview} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Request</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
