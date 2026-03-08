import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  AlertCircle,
  Send,
  RefreshCw,
  FileText,
  Sparkles,
  ArrowRight,
  Trophy,
  TrendingUp,
  Timer,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isBefore, isTomorrow, differenceInHours, differenceInMinutes, formatDistanceToNow } from 'date-fns';
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

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  requested: { label: 'Requested', color: 'text-warning-foreground', bg: 'bg-warning/10 border-warning/20', icon: Send },
  pending_confirmation: { label: 'Pending', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: CalendarDays },
  confirmed: { label: 'Confirmed', color: 'text-success', bg: 'bg-success/10 border-success/20', icon: CheckCircle },
  rescheduled: { label: 'Rescheduled', color: 'text-accent-foreground', bg: 'bg-accent/10 border-accent/20', icon: RefreshCw },
  rejected: { label: 'Declined', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', icon: XCircle },
  completed: { label: 'Completed', color: 'text-success', bg: 'bg-success/10 border-success/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: XCircle },
};

const typeConfig: Record<string, { icon: any; label: string; accent: string }> = {
  video: { icon: Video, label: 'Video Call', accent: 'text-primary' },
  'in-person': { icon: MapPin, label: 'In Person', accent: 'text-success' },
  phone: { icon: Phone, label: 'Phone', accent: 'text-warning-foreground' },
  assessment: { icon: FileText, label: 'Assessment', accent: 'text-accent-foreground' },
};

// --- Sub-components ---

const InterviewSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-40 rounded-2xl" />
    <Skeleton className="h-10 rounded-xl w-48" />
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  </div>
);

const NextInterviewHero = ({ interview }: { interview: InterviewRow }) => {
  const dateObj = new Date(`${interview.scheduled_date}T${interview.scheduled_time}`);
  const hoursUntil = differenceInHours(dateObj, new Date());
  const minutesUntil = differenceInMinutes(dateObj, new Date());
  const isStartingSoon = minutesUntil > 0 && minutesUntil <= 60;
  const isNow = minutesUntil >= -30 && minutesUntil <= 15;
  const tc = typeConfig[interview.interview_type] || typeConfig.video;
  const TypeIcon = tc.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2 shadow-lg",
        isNow ? "border-success shadow-success/20" : isStartingSoon ? "border-warning shadow-warning/20" : "border-primary/30 shadow-primary/10"
      )}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        {isNow && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success via-success/80 to-success animate-pulse" />
        )}
        
        <CardContent className="relative p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            {isNow ? (
              <Badge className="bg-success text-success-foreground gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-success-foreground animate-ping" />
                Happening Now
              </Badge>
            ) : isStartingSoon ? (
              <Badge className="bg-warning text-warning-foreground gap-1">
                <Timer className="w-3 h-3" />
                Starting in {minutesUntil} min
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                <Sparkles className="w-3 h-3" />
                Next Interview
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Date block */}
              <div className={cn(
                "text-center p-3 rounded-2xl min-w-16 shrink-0",
                isToday(new Date(interview.scheduled_date)) 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-primary/10 text-primary"
              )}>
                <p className="text-2xl font-black leading-none">{format(new Date(interview.scheduled_date), 'd')}</p>
                <p className="text-[10px] font-medium mt-0.5 uppercase tracking-wider opacity-80">{format(new Date(interview.scheduled_date), 'MMM')}</p>
                <p className="text-[10px] font-medium opacity-60">{format(new Date(interview.scheduled_date), 'EEE')}</p>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg leading-snug truncate">{interview.jobs.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{interview.employers.company_name}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="outline" className={cn("gap-1 text-xs", tc.accent)}>
                    <TypeIcon className="w-3.5 h-3.5" />
                    {tc.label}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {interview.scheduled_time}
                  </Badge>
                  {(isToday(new Date(interview.scheduled_date))) && (
                    <Badge className="bg-primary/10 text-primary text-xs border-0">Today</Badge>
                  )}
                  {isTomorrow(new Date(interview.scheduled_date)) && (
                    <Badge className="bg-accent text-accent-foreground text-xs border-0">Tomorrow</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-2 shrink-0">
              {interview.interview_type === 'video' && interview.meeting_link && interview.status === 'confirmed' && (
                <Button
                  size="lg"
                  className="gap-2 shadow-md"
                  onClick={() => window.open(interview.meeting_link!, '_blank')}
                >
                  <Video className="w-4 h-4" />
                  Join Meeting
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {interview.status === 'scheduled' && !interview.confirmed_by_candidate && interview.requested_by === 'employer' && (
                <Button size="lg" className="gap-2 shadow-md">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Now
                </Button>
              )}
            </div>
          </div>

          {/* Countdown bar */}
          {hoursUntil > 0 && hoursUntil <= 48 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Time until interview</span>
                <span className="font-medium">{formatDistanceToNow(dateObj, { addSuffix: false })}</span>
              </div>
              <Progress value={Math.max(5, 100 - (hoursUntil / 48 * 100))} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InterviewCard = ({
  interview,
  showActions,
  onConfirm,
  onCancel,
  index = 0,
}: {
  interview: InterviewRow;
  showActions?: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  index?: number;
}) => {
  const sc = statusConfig[interview.status] || statusConfig.requested;
  const StatusIcon = sc.icon;
  const tc = typeConfig[interview.interview_type] || typeConfig.video;
  const TypeIcon = tc.icon;
  const needsConfirmation = interview.requested_by === 'employer' && !interview.confirmed_by_candidate && interview.status === 'scheduled';
  const dateObj = new Date(interview.scheduled_date);
  const isInterviewToday = isToday(dateObj);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-200 bg-card hover:shadow-md",
        needsConfirmation && "border-warning/40 bg-warning/5",
        isInterviewToday && !needsConfirmation && "border-primary/30 bg-primary/5"
      )}
    >
      {/* Today indicator */}
      {isInterviewToday && (
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Date pill */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "text-center p-2 rounded-xl min-w-12 shrink-0 transition-colors",
              isInterviewToday
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              <p className="text-lg font-bold leading-none">{format(dateObj, 'd')}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider mt-0.5 opacity-80">{format(dateObj, 'MMM')}</p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{format(dateObj, 'EEEE, MMMM d, yyyy')}</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug truncate">{interview.jobs.title}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 shrink-0" />
                {interview.employers.company_name}
              </p>
            </div>
            {/* Status badge */}
            <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0 capitalize", sc.bg, sc.color)}>
              <StatusIcon className="w-3 h-3" />
              {sc.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted", tc.accent)}>
              <TypeIcon className="w-3 h-3" />
              {tc.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
              <Clock className="w-3 h-3" />
              {interview.scheduled_time}
            </span>
            {isInterviewToday && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Today</span>
            )}
            {interview.location && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-24">{interview.location}</span>
              </span>
            )}
          </div>

          {interview.candidate_message && (
            <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2 bg-muted/50 px-2 py-1 rounded-lg">
              "{interview.candidate_message}"
            </p>
          )}

          {/* Needs confirmation alert */}
          {needsConfirmation && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-warning-foreground font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Employer invited you — please confirm or decline
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(needsConfirmation || showActions) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {needsConfirmation && (
            <>
              <Button size="sm" className="flex-1 text-xs gap-1.5 rounded-lg" onClick={() => onConfirm(interview.id)}>
                <CheckCircle className="w-3.5 h-3.5" /> Confirm
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => onCancel(interview.id)}>
                <XCircle className="w-3.5 h-3.5" /> Decline
              </Button>
            </>
          )}
          {interview.interview_type === 'video' && interview.meeting_link && interview.status === 'confirmed' && (
            <Button size="sm" className="text-xs gap-1.5 rounded-lg" onClick={() => window.open(interview.meeting_link!, '_blank')}>
              <Video className="w-3.5 h-3.5" /> Join Call
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
          {['scheduled', 'confirmed', 'requested'].includes(interview.status) && !needsConfirmation && (
            <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10 ml-auto rounded-lg" onClick={() => onCancel(interview.id)}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

const EmptyState = ({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-12 sm:py-16"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/80 flex items-center justify-center">
      <Icon className="w-8 h-8 text-muted-foreground/40" />
    </div>
    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </motion.div>
);

// --- Main Component ---

export const CandidateInterviewManager = ({ candidateId }: CandidateInterviewManagerProps) => {
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    applicationId: '', jobId: '', employerId: '',
    date: '', time: '', type: 'video', message: '',
  });

  useEffect(() => {
    fetchData();
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

  const nextInterview = useMemo(() => {
    const now = new Date();
    return upcoming
      .filter(i => ['confirmed', 'scheduled'].includes(i.status))
      .find(i => !isBefore(new Date(`${i.scheduled_date}T${i.scheduled_time}`), new Date(now.getTime() - 30 * 60000)));
  }, [upcoming]);

  const completionRate = useMemo(() => {
    const total = interviews.filter(i => ['completed', 'cancelled', 'rejected'].includes(i.status)).length;
    if (total === 0) return 0;
    return Math.round((interviews.filter(i => i.status === 'completed').length / total) * 100);
  }, [interviews]);

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
      confirmed_by_candidate: true, status: 'confirmed',
    }).eq('id', interviewId);
    if (error) toast.error(error.message);
    else { toast.success('Interview confirmed!'); fetchInterviews(); }
  };

  const handleCancel = async (interviewId: string) => {
    const { error } = await supabase.from('interviews').update({
      status: 'cancelled', cancelled_by: 'candidate', cancel_reason: 'Cancelled by candidate',
    }).eq('id', interviewId);
    if (error) toast.error(error.message);
    else { toast.success('Interview cancelled'); fetchInterviews(); }
  };

  if (loading) return <InterviewSkeleton />;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Upcoming', value: upcoming.length, icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/10', pulse: upcoming.length > 0 },
          { label: 'Pending', value: requested.length, icon: AlertCircle, color: 'text-warning-foreground', bg: 'bg-warning/10', pulse: requested.length > 0 },
          { label: 'Completed', value: past.filter(i => i.status === 'completed').length, icon: Trophy, color: 'text-success', bg: 'bg-success/10', pulse: false },
          { label: 'Success Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', pulse: false },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                  {stat.pulse && (
                    <span className={cn("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full", stat.label === 'Pending' ? 'bg-warning' : 'bg-primary')} />
                  )}
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

      {/* Next interview hero */}
      {nextInterview && <NextInterviewHero interview={nextInterview} />}

      {/* Request button + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {appliedJobs.length > 0 && (
          <Button onClick={() => setRequestDialogOpen(true)} className="gap-2 rounded-xl shadow-sm">
            <CalendarPlus className="w-4 h-4" /> Request Interview
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full sm:w-auto bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="upcoming" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                <CalendarDays className="w-3.5 h-3.5" />
                Upcoming
                {upcoming.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">{upcoming.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                <Send className="w-3.5 h-3.5" />
                Requests
                {requested.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-warning/10 text-warning-foreground rounded-full">{requested.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                Past
                {past.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground rounded-full">{past.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="upcoming" className="mt-0">
                {upcoming.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="No upcoming interviews"
                    description="When employers schedule interviews or you request one, they'll appear here."
                    action={appliedJobs.length > 0 ? (
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setRequestDialogOpen(true)}>
                        <CalendarPlus className="w-4 h-4" /> Request an Interview
                      </Button>
                    ) : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((i, idx) => (
                      <InterviewCard key={i.id} interview={i} showActions onConfirm={handleConfirm} onCancel={handleCancel} index={idx} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-0">
                {requested.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title="No pending requests"
                    description="Your interview requests and invitations from employers will show up here."
                    action={appliedJobs.length > 0 ? (
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setRequestDialogOpen(true)}>
                        <CalendarPlus className="w-4 h-4" /> Send a Request
                      </Button>
                    ) : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    {requested.map((i, idx) => (
                      <InterviewCard key={i.id} interview={i} showActions onConfirm={handleConfirm} onCancel={handleCancel} index={idx} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {past.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No interview history yet"
                    description="Completed, cancelled, or declined interviews will appear here for your records."
                  />
                ) : (
                  <div className="space-y-3">
                    {past.map((i, idx) => (
                      <InterviewCard key={i.id} interview={i} onConfirm={handleConfirm} onCancel={handleCancel} index={idx} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <InterviewCalendar candidateId={candidateId} />
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Interview Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              Request Interview
            </DialogTitle>
            <DialogDescription>
              Pick a job you've applied to and propose a time. The employer will confirm or suggest alternatives.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select Job <span className="text-destructive">*</span></Label>
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
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Choose a job application" />
                </SelectTrigger>
                <SelectContent>
                  {appliedJobs.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{app.job.title}</span>
                        <span className="text-muted-foreground text-xs">— {app.job.employers.company_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  className="rounded-lg"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Time <span className="text-destructive">*</span></Label>
                <Select value={requestForm.time} onValueChange={(v) => setRequestForm(prev => ({ ...prev, time: v }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Pick time" /></SelectTrigger>
                  <SelectContent>
                    {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map(t => {
                      const hr = parseInt(t);
                      const min = t.split(':')[1];
                      const label = hr > 12 ? `${hr - 12}:${min} PM` : hr === 12 ? `12:${min} PM` : `${hr}:${min} AM`;
                      return <SelectItem key={t} value={t}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Interview Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['video', 'phone', 'in-person', 'assessment'] as const).map(type => {
                  const tc = typeConfig[type];
                  const TypeIcon = tc.icon;
                  const isSelected = requestForm.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRequestForm(prev => ({ ...prev, type }))}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <TypeIcon className="w-4 h-4 shrink-0" />
                      {tc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Message <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Let the employer know your preferences or questions..."
                value={requestForm.message}
                onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="rounded-lg resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleRequestInterview} disabled={submitting} className="rounded-lg gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Request</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
