import { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Search,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
    skills?: string[] | null;
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Auto-switch to requests tab if there are pending requests
  useEffect(() => {
    if (!loading && candidateRequests.length > 0 && applicants.length === 0) {
      setActiveTab('requests');
    }
  }, [loading, candidateRequests.length, applicants.length]);

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
        .select(`*, candidate:candidates(job_title, skills, profile:profiles(full_name, avatar_url)), job:jobs(title)`)
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

      toast.success('Interview scheduled successfully! Candidate has been notified.');
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
    else { toast.success('Interview confirmed! Candidate has been notified.'); fetchCandidateRequests(); fetchScheduledInterviews(); }
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'rejected' }).eq('id', requestId);
    if (error) toast.error(error.message);
    else { toast.success('Request declined'); fetchCandidateRequests(); }
  };

  const pendingApplicants = useMemo(() => {
    let result = applicants.filter(a => a.status === 'pending' || a.status === 'reviewing');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.candidate?.profile?.full_name?.toLowerCase().includes(q) ||
        a.candidate?.job_title?.toLowerCase().includes(q) ||
        a.job?.title?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [applicants, searchQuery]);

  const formatSmartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d, yyyy');
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">To Schedule</span>
                  <span className="xs:hidden">Schedule</span>
                  {pendingApplicants.length > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary/20 text-primary ml-0.5">{applicants.filter(a => a.status === 'pending' || a.status === 'reviewing').length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none relative">
                  <Send className="w-3.5 h-3.5" />
                  Requests
                  {candidateRequests.length > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] bg-destructive/20 text-destructive ml-0.5">{candidateRequests.length}</Badge>
                  )}
                  {candidateRequests.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduled
                  {scheduledInterviews.length > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px] bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] ml-0.5">{scheduledInterviews.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search for pending tab */}
              {activeTab === 'pending' && applicants.length > 3 && (
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search applicants..."
                    className="pl-9 h-8 text-xs rounded-lg"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pending Applicants */}
            <TabsContent value="pending">
              {pendingApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'No matching applicants' : 'No pending applicants'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {searchQuery ? 'Try a different search' : 'New applicants will appear here for scheduling'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApplicants.map((applicant, i) => {
                    const appliedAgo = formatDistanceToNow(new Date(applicant.created_at), { addSuffix: true });
                    const isNew = Date.now() - new Date(applicant.created_at).getTime() < 48 * 60 * 60 * 1000;
                    return (
                      <motion.div
                        key={applicant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all gap-3 group",
                          "hover:border-primary/30 hover:bg-accent/50",
                          isNew && "border-primary/20 bg-primary/[0.03]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-11 w-11 shrink-0">
                            <AvatarImage src={applicant.candidate?.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary"><User className="w-5 h-5" /></AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate">{applicant.candidate?.profile?.full_name || 'Candidate'}</p>
                              {isNew && (
                                <Badge className="bg-primary/15 text-primary text-[10px] h-4 px-1.5 shrink-0">NEW</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{applicant.candidate?.job_title || 'Job Seeker'}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5 max-w-[160px] truncate">{applicant.job?.title}</Badge>
                              <span className="text-[10px] text-muted-foreground">{appliedAgo}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                          <Button
                            size="sm"
                            className="flex-1 sm:flex-none gap-1.5 shadow-sm"
                            onClick={() => setScheduleDialog({ open: true, applicant })}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            Schedule Interview
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Candidate Requests */}
            <TabsContent value="requests">
              {candidateRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Send className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No interview requests</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Candidate interview requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">{candidateRequests.length} pending request{candidateRequests.length > 1 ? 's' : ''} — action needed</span>
                  </div>
                  {candidateRequests.map((req, i) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl border border-destructive/20 bg-destructive/[0.03] transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={req.candidate_avatar || ''} />
                          <AvatarFallback className="bg-destructive/10 text-destructive"><User className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-foreground truncate">{req.candidate_name}</p>
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] h-4 px-1.5 gap-0.5 shrink-0">
                              <Send className="w-2.5 h-2.5" /> Request
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{req.job_title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-foreground font-medium flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-full">
                              <Calendar className="w-3 h-3" /> {formatSmartDate(req.scheduled_date)}
                            </span>
                            <span className="text-xs text-foreground font-medium flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> {req.scheduled_time}
                            </span>
                            <Badge variant="outline" className="text-[10px] gap-0.5 h-5">
                              {req.interview_type === 'video' ? <Video className="w-3 h-3" /> : req.interview_type === 'phone' ? <Phone className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              <span className="capitalize">{req.interview_type}</span>
                            </Badge>
                          </div>
                          {req.candidate_message && (
                            <div className="flex items-start gap-1.5 mt-2.5 p-2 bg-muted/50 rounded-lg border border-border/50">
                              <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground italic leading-relaxed">
                                "{req.candidate_message}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-destructive/10">
                        <Button size="sm" className="flex-1 gap-1.5 shadow-sm" onClick={() => handleAcceptRequest(req)}>
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleRejectRequest(req.id)}>
                          <XCircle className="w-3.5 h-3.5" /> Decline
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
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No interviews scheduled</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Schedule interviews from the "To Schedule" tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledInterviews.map((interview, i) => {
                    const dateStr = formatSmartDate(interview.scheduled_date);
                    const isUpcomingSoon = isToday(new Date(interview.scheduled_date)) || isTomorrow(new Date(interview.scheduled_date));
                    return (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all gap-3",
                          isUpcomingSoon
                            ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/[0.03]"
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "text-center p-2 rounded-lg min-w-14 shrink-0",
                            isUpcomingSoon ? "bg-[hsl(var(--success))]/10" : "bg-muted"
                          )}>
                            <p className={cn(
                              "text-xl font-bold leading-tight",
                              isUpcomingSoon ? "text-[hsl(var(--success))]" : "text-foreground"
                            )}>{format(new Date(interview.scheduled_date), 'd')}</p>
                            <p className={cn(
                              "text-[10px] font-medium",
                              isUpcomingSoon ? "text-[hsl(var(--success))]" : "text-muted-foreground"
                            )}>{format(new Date(interview.scheduled_date), 'MMM')}</p>
                          </div>
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={interview.candidate_avatar || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary"><User className="w-5 h-5" /></AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground truncate">{interview.candidate_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{interview.job_title}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className={cn("text-[10px] gap-0.5 h-5",
                                interview.interview_type === 'video' ? 'bg-primary/10 text-primary border-primary/20'
                                : interview.interview_type === 'in-person' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20'
                                : 'bg-secondary text-secondary-foreground'
                              )}>
                                {interview.interview_type === 'video' ? <Video className="w-3 h-3" /> : interview.interview_type === 'in-person' ? <MapPin className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                <span className="capitalize">{interview.interview_type}</span>
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {interview.scheduled_time}
                              </span>
                              {interview.confirmed_by_candidate ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 text-[10px] h-4 gap-0.5">
                                      <CheckCircle className="w-2.5 h-2.5" /> Confirmed
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">Candidate confirmed attendance</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge className="bg-muted text-muted-foreground text-[10px] h-4 gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> Awaiting
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">Waiting for candidate confirmation</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                          {interview.interview_type === 'video' && interview.meeting_link && (
                            <Button size="sm" className="flex-1 sm:flex-none text-xs gap-1 shadow-sm" onClick={() => window.open(interview.meeting_link, '_blank')}>
                              <Video className="w-3.5 h-3.5" /> Join
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs gap-1" onClick={() => navigate(`/video-call/${interview.id}`)}>
                            Details <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
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
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              Schedule Interview
            </DialogTitle>
            <DialogDescription>
              Set up an interview with {scheduleDialog.applicant?.candidate?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={scheduleDialog.applicant?.candidate?.profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{scheduleDialog.applicant?.candidate?.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">for {scheduleDialog.applicant?.job?.title}</p>
              </div>
            </div>

            {/* Interview Type Selection - visual cards */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'video', label: 'Video Call', icon: Video, desc: 'Google Meet' },
                  { value: 'in-person', label: 'In-Person', icon: MapPin, desc: 'Office visit' },
                  { value: 'phone', label: 'Phone', icon: Phone, desc: 'Voice call' },
                  { value: 'assessment', label: 'Assessment', icon: FileText, desc: 'Skill test' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setInterviewDetails(prev => ({ ...prev, type: t.value }))}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      interviewDetails.type === t.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      interviewDetails.type === t.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <t.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date *</Label>
                <Input type="date" value={interviewDetails.date} onChange={(e) => setInterviewDetails(prev => ({ ...prev, date: e.target.value }))} min={format(new Date(), 'yyyy-MM-dd')} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Time *</Label>
                <Select value={interviewDetails.time} onValueChange={(v) => setInterviewDetails(prev => ({ ...prev, time: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map(t => {
                      const hour = parseInt(t);
                      const mins = t.split(':')[1];
                      const label = hour > 12 ? `${hour - 12}:${mins} PM` : hour === 12 ? `12:${mins} PM` : `${hour}:${mins} AM`;
                      return <SelectItem key={t} value={t}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {interviewDetails.type === 'video' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Meeting Link</Label>
                <Input placeholder="https://meet.google.com/xxx-xxxx-xxx" value={interviewDetails.meetingLink} onChange={(e) => setInterviewDetails(prev => ({ ...prev, meetingLink: e.target.value }))} className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">
                  Create at <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">meet.google.com</a> — candidate will receive the link
                </p>
              </div>
            )}

            {interviewDetails.type === 'in-person' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Location *</Label>
                <Input placeholder="Office address or room name" value={interviewDetails.location} onChange={(e) => setInterviewDetails(prev => ({ ...prev, location: e.target.value }))} className="h-9 text-sm" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Internal Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="Notes for your team — not visible to candidate..." value={interviewDetails.notes} onChange={(e) => setInterviewDetails(prev => ({ ...prev, notes: e.target.value }))} rows={2} className="text-sm resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setScheduleDialog({ open: false, applicant: null })}>Cancel</Button>
            <Button size="sm" onClick={handleScheduleInterview} disabled={scheduling || !interviewDetails.date || !interviewDetails.time} className="gap-1.5">
              {scheduling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scheduling...</> : <><CalendarPlus className="w-3.5 h-3.5" /> Schedule Interview</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
