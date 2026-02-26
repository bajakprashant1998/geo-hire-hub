import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  CalendarPlus,
  CheckCircle,
  XCircle,
  User,
  Loader2,
  ChevronRight,
  Send,
  Phone,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface InterviewSchedulerProps {
  employerId: string;
}

interface Applicant {
  id: string;
  candidate_id: string;
  job_id: string;
  status: string;
  created_at: string;
  candidate?: {
    job_title: string;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  job?: {
    title: string;
  };
}

export const InterviewScheduler = ({ employerId }: InterviewSchedulerProps) => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean;
    applicant: Applicant | null;
  }>({ open: false, applicant: null });
  const [scheduling, setScheduling] = useState(false);
  const [interviewDetails, setInterviewDetails] = useState({
    date: '',
    time: '',
    type: 'video',
    location: '',
    meetingLink: '',
    notes: '',
  });
  const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);
  const [candidateRequests, setCandidateRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('employer-interviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews', filter: `employer_id=eq.${employerId}` }, () => {
        fetchScheduledInterviews();
        fetchCandidateRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [employerId]);

  const fetchAll = async () => {
    await Promise.all([fetchApplicants(), fetchScheduledInterviews(), fetchCandidateRequests()]);
    setLoading(false);
  };

  const fetchApplicants = async () => {
    const { data: jobs } = await supabase.from('jobs').select('id').eq('employer_id', employerId);
    if (jobs && jobs.length > 0) {
      const jobIds = jobs.map(j => j.id);
      const { data: applications } = await supabase
        .from('applications')
        .select(`*, candidate:candidates(job_title, profile:profiles(full_name, avatar_url)), job:jobs(title)`)
        .in('job_id', jobIds)
        .in('status', ['pending', 'reviewing'])
        .order('created_at', { ascending: false });
      setApplicants(applications || []);
    }
  };

  const fetchScheduledInterviews = async () => {
    const { data: rows } = await supabase
      .from('interviews')
      .select(`
        id, scheduled_date, scheduled_time, interview_type, meeting_link, location, status,
        candidate_id, requested_by, confirmed_by_candidate, confirmed_by_employer, employer_notes,
        candidates!inner(profile_id, job_title),
        jobs!inner(title)
      `)
      .eq('employer_id', employerId)
      .in('status', ['scheduled', 'confirmed', 'pending_confirmation'])
      .order('scheduled_date', { ascending: true });

    if (rows && rows.length > 0) {
      const mapped = await Promise.all(
        rows.map(async (row: any) => {
          const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', row.candidates.profile_id).maybeSingle();
          return {
            ...row,
            candidate_name: prof?.full_name || 'Candidate',
            candidate_avatar: prof?.avatar_url,
            job_title: row.jobs.title,
          };
        })
      );
      setScheduledInterviews(mapped);
    } else {
      setScheduledInterviews([]);
    }
  };

  const fetchCandidateRequests = async () => {
    const { data: rows } = await supabase
      .from('interviews')
      .select(`
        id, scheduled_date, scheduled_time, interview_type, status, candidate_message, created_at,
        candidate_id, job_id,
        candidates!inner(profile_id, job_title),
        jobs!inner(title)
      `)
      .eq('employer_id', employerId)
      .eq('status', 'requested')
      .eq('requested_by', 'candidate')
      .order('created_at', { ascending: false });

    if (rows && rows.length > 0) {
      const mapped = await Promise.all(
        rows.map(async (row: any) => {
          const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', row.candidates.profile_id).maybeSingle();
          return { ...row, candidate_name: prof?.full_name || 'Candidate', candidate_avatar: prof?.avatar_url, job_title: row.jobs.title };
        })
      );
      setCandidateRequests(mapped);
    } else {
      setCandidateRequests([]);
    }
  };

  const handleScheduleInterview = async () => {
    if (!scheduleDialog.applicant || !interviewDetails.date || !interviewDetails.time) {
      toast.error('Please fill in all required fields');
      return;
    }
    setScheduling(true);
    try {
      // Conflict detection
      const { data: conflicts } = await supabase
        .from('interviews')
        .select('id')
        .eq('employer_id', employerId)
        .eq('scheduled_date', interviewDetails.date)
        .eq('scheduled_time', interviewDetails.time)
        .in('status', ['scheduled', 'confirmed', 'pending_confirmation']);

      if (conflicts && conflicts.length > 0) {
        toast.error('Time slot conflict! You already have an interview at this time.');
        setScheduling(false);
        return;
      }

      const { error: intError } = await supabase.from('interviews').insert({
        application_id: scheduleDialog.applicant.id,
        job_id: scheduleDialog.applicant.job_id,
        candidate_id: scheduleDialog.applicant.candidate_id,
        employer_id: employerId,
        scheduled_date: interviewDetails.date,
        scheduled_time: interviewDetails.time,
        interview_type: interviewDetails.type,
        location: interviewDetails.type === 'in-person' ? interviewDetails.location : null,
        meeting_link: interviewDetails.type === 'video' && interviewDetails.meetingLink ? interviewDetails.meetingLink : null,
        requested_by: 'employer',
        confirmed_by_employer: true,
        employer_notes: interviewDetails.notes || null,
      });
      if (intError) throw intError;

      const { error: statusError } = await supabase.from('applications').update({ status: 'shortlisted', updated_at: new Date().toISOString() }).eq('id', scheduleDialog.applicant.id);
      if (statusError) console.error('Failed to update application status:', statusError);

      toast.success('Interview scheduled successfully!');
      setScheduleDialog({ open: false, applicant: null });
      setInterviewDetails({ date: '', time: '', type: 'video', location: '', meetingLink: '', notes: '' });
      fetchApplicants();
      fetchScheduledInterviews();
    } catch (error: any) {
      toast.error('Failed to schedule interview: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    const { error } = await supabase.from('interviews').update({
      status: 'confirmed',
      confirmed_by_employer: true,
    }).eq('id', request.id);
    if (error) toast.error(error.message);
    else { toast.success('Interview request accepted!'); fetchCandidateRequests(); fetchScheduledInterviews(); }
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'rejected' }).eq('id', requestId);
    if (error) toast.error(error.message);
    else { toast.success('Request declined'); fetchCandidateRequests(); }
  };

  const pendingApplicants = applicants.filter(a => a.status === 'pending' || a.status === 'reviewing');

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Scheduled', value: scheduledInterviews.length, icon: Calendar, color: 'text-primary bg-primary/10' },
          { label: 'Requests', value: candidateRequests.length, icon: Send, color: 'text-amber-600 bg-amber-500/10' },
          { label: 'Pending Review', value: pendingApplicants.length, icon: Users, color: 'text-blue-600 bg-blue-500/10' },
          { label: 'Video Calls', value: scheduledInterviews.filter(i => i.interview_type === 'video').length, icon: Video, color: 'text-green-600 bg-green-500/10' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2 text-xs sm:text-sm">
                <Users className="w-4 h-4" /> To Schedule ({pendingApplicants.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2 text-xs sm:text-sm">
                <Send className="w-4 h-4" /> Requests ({candidateRequests.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4" /> Scheduled ({scheduledInterviews.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Applicants */}
            <TabsContent value="pending">
              {pendingApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No pending applicants</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApplicants.map((applicant) => (
                    <motion.div key={applicant.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border hover:border-primary/30 hover:bg-muted/30 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={applicant.candidate?.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary"><User className="w-6 h-6" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{applicant.candidate?.profile?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-muted-foreground">{applicant.candidate?.job_title || 'Job Seeker'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{applicant.job?.title}</Badge>
                            <span className="text-xs text-muted-foreground">Applied {format(new Date(applicant.created_at), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setScheduleDialog({ open: true, applicant })}>
                          <CalendarPlus className="w-4 h-4 mr-1" /> Schedule
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Candidate Requests */}
            <TabsContent value="requests">
              {candidateRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No interview requests from candidates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidateRequests.map((req) => (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={req.candidate_avatar || ''} />
                          <AvatarFallback className="bg-amber-500/10 text-amber-600"><User className="w-6 h-6" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{req.candidate_name}</p>
                          <p className="text-sm text-muted-foreground">{req.job_title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
                              <Send className="w-3 h-3" /> Request
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {format(new Date(req.scheduled_date), 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {req.scheduled_time}
                            </span>
                            <Badge variant="outline" className="text-xs gap-1">
                              {req.interview_type === 'video' ? <Video className="w-3 h-3" /> : req.interview_type === 'phone' ? <Phone className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {req.interview_type}
                            </Badge>
                          </div>
                          {req.candidate_message && (
                            <p className="text-xs text-muted-foreground mt-2 italic bg-muted/50 p-2 rounded-lg">
                              "{req.candidate_message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-500/10">
                        <Button size="sm" className="flex-1" onClick={() => handleAcceptRequest(req)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRejectRequest(req.id)}>
                          <XCircle className="w-4 h-4 mr-1" /> Decline
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Scheduled */}
            <TabsContent value="scheduled">
              {scheduledInterviews.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No interviews scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledInterviews.map((interview) => (
                    <motion.div key={interview.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-green-500/20 bg-green-500/5 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center p-2 bg-green-500/10 rounded-lg min-w-16">
                          <p className="text-2xl font-bold text-green-600">{format(new Date(interview.scheduled_date), 'd')}</p>
                          <p className="text-xs text-green-600">{format(new Date(interview.scheduled_date), 'MMM')}</p>
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={interview.candidate_avatar || ''} />
                          <AvatarFallback className="bg-green-500/10 text-green-600"><User className="w-6 h-6" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{interview.candidate_name}</p>
                          <p className="text-sm text-muted-foreground">{interview.job_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                              {interview.interview_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                              {interview.interview_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {interview.scheduled_time}
                            </span>
                            {/* Confirmation status */}
                            {interview.confirmed_by_candidate ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                                <CheckCircle className="w-3 h-3 mr-0.5" /> Confirmed
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                                <AlertTriangle className="w-3 h-3 mr-0.5" /> Awaiting
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {interview.interview_type === 'video' && interview.meeting_link && (
                          <Button size="sm" className="flex-1 sm:flex-none text-xs" onClick={() => window.open(interview.meeting_link, '_blank')}>
                            <Video className="w-4 h-4 mr-1" /> Join
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs" onClick={() => navigate(`/video-call/${interview.id}`)}>
                          <ChevronRight className="w-4 h-4 mr-1" /> Details
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Interview Dialog */}
      <Dialog
        open={scheduleDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleDialog({ open: false, applicant: null });
            setInterviewDetails({ date: '', time: '', type: 'video', location: '', meetingLink: '', notes: '' });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Set up an interview with {scheduleDialog.applicant?.candidate?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar>
                <AvatarImage src={scheduleDialog.applicant?.candidate?.profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{scheduleDialog.applicant?.candidate?.profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">for {scheduleDialog.applicant?.job?.title}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={interviewDetails.date} onChange={(e) => setInterviewDetails(prev => ({ ...prev, date: e.target.value }))} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={interviewDetails.time} onValueChange={(v) => setInterviewDetails(prev => ({ ...prev, time: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                      <SelectItem key={t} value={t}>{parseInt(t) > 12 ? `${parseInt(t) - 12}:00 PM` : `${parseInt(t)}:00 AM`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select value={interviewDetails.type} onValueChange={(v) => setInterviewDetails(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Call</div></SelectItem>
                  <SelectItem value="in-person"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> In-Person</div></SelectItem>
                  <SelectItem value="phone"><div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Call</div></SelectItem>
                  <SelectItem value="assessment"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Assessment</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {interviewDetails.type === 'video' && (
              <div className="space-y-2">
                <Label>Meeting Link</Label>
                <Input placeholder="https://meet.google.com/xxx-xxxx-xxx" value={interviewDetails.meetingLink} onChange={(e) => setInterviewDetails(prev => ({ ...prev, meetingLink: e.target.value }))} />
                <p className="text-xs text-muted-foreground">
                  Create a meeting at <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">meet.google.com</a>
                </p>
              </div>
            )}

            {interviewDetails.type === 'in-person' && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Enter interview location" value={interviewDetails.location} onChange={(e) => setInterviewDetails(prev => ({ ...prev, location: e.target.value }))} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Internal Notes (optional)</Label>
              <Textarea placeholder="Notes for your team..." value={interviewDetails.notes} onChange={(e) => setInterviewDetails(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog({ open: false, applicant: null })}>Cancel</Button>
            <Button onClick={handleScheduleInterview} disabled={scheduling}>
              {scheduling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...</> : <><CalendarPlus className="w-4 h-4 mr-2" /> Schedule Interview</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
