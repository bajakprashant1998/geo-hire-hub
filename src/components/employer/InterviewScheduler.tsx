import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
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
    meetingLink: ''
  });
  const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([]);

  useEffect(() => {
    fetchApplicants();
    fetchScheduledInterviews();
  }, [employerId]);

  const fetchApplicants = async () => {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('employer_id', employerId);

    if (jobs && jobs.length > 0) {
      const jobIds = jobs.map(j => j.id);
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:candidates (
            job_title,
            profile:profiles (
              full_name,
              avatar_url
            )
          ),
          job:jobs (
            title
          )
        `)
        .in('job_id', jobIds)
        .in('status', ['pending', 'reviewing'])
        .order('created_at', { ascending: false });

      setApplicants(applications || []);
    }
    setLoading(false);
  };

  const fetchScheduledInterviews = async () => {
    const { data: rows } = await supabase
      .from('interviews')
      .select(`
        id, scheduled_date, scheduled_time, interview_type, meeting_link, location, status,
        candidate_id,
        candidates!inner(profile_id, job_title),
        jobs!inner(title)
      `)
      .eq('employer_id', employerId)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true });

    if (rows && rows.length > 0) {
      const mapped = await Promise.all(
        rows.map(async (row: any) => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', row.candidates.profile_id)
            .maybeSingle();
          return {
            id: row.id,
            scheduled_date: row.scheduled_date,
            scheduled_time: row.scheduled_time,
            interview_type: row.interview_type,
            meeting_link: row.meeting_link,
            location: row.location,
            candidate_name: prof?.full_name || 'Candidate',
            candidate_avatar: prof?.avatar_url,
            job_title: row.jobs.title,
          };
        })
      );
      setScheduledInterviews(mapped);
    }
  };

  const handleScheduleInterview = async () => {
    if (!scheduleDialog.applicant || !interviewDetails.date || !interviewDetails.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setScheduling(true);
    try {
      // Insert into interviews table first
      const { error: intError } = await supabase
        .from('interviews')
        .insert({
          application_id: scheduleDialog.applicant.id,
          job_id: scheduleDialog.applicant.job_id,
          candidate_id: scheduleDialog.applicant.candidate_id,
          employer_id: employerId,
          scheduled_date: interviewDetails.date,
          scheduled_time: interviewDetails.time,
          interview_type: interviewDetails.type,
          location: interviewDetails.type === 'in-person' ? interviewDetails.location : null,
          meeting_link: interviewDetails.type === 'video' && interviewDetails.meetingLink ? interviewDetails.meetingLink : null,
        });

      if (intError) throw intError;

      // Only update application status after interview is successfully created
      const { error: statusError } = await supabase
        .from('applications')
        .update({ 
          status: 'shortlisted',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleDialog.applicant.id);

      if (statusError) {
        console.error('Failed to update application status:', statusError);
      }

      toast.success('Interview scheduled successfully!');
      setScheduleDialog({ open: false, applicant: null });
      setInterviewDetails({ date: '', time: '', type: 'video', location: '', meetingLink: '' });
      fetchApplicants();
      fetchScheduledInterviews();
    } catch (error: any) {
      toast.error('Failed to schedule interview: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  const shortlistedApplicants = applicants.filter(a => a.status === 'shortlisted');
  const pendingApplicants = applicants.filter(a => a.status === 'pending' || a.status === 'reviewing');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledInterviews.length}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApplicants.length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledInterviews.filter(i => i.interview_type === 'video').length}</p>
                <p className="text-xs text-muted-foreground">Video Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applicants Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                <Users className="w-4 h-4" />
                To Schedule ({pendingApplicants.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled ({scheduledInterviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No pending applicants</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApplicants.map((applicant) => (
                    <motion.div
                      key={applicant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border hover:border-primary/30 hover:bg-muted/30 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={applicant.candidate?.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {applicant.candidate?.profile?.full_name || 'Candidate'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {applicant.candidate?.job_title || 'Job Seeker'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {applicant.job?.title}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Applied {format(new Date(applicant.created_at), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => setScheduleDialog({ open: true, applicant })}
                        >
                          <CalendarPlus className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                        <Button size="sm" variant="ghost">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled">
              {scheduledInterviews.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No interviews scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledInterviews.map((interview) => {
                    const interviewDate = new Date(interview.scheduled_date);
                    
                    return (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-green-500/20 bg-green-500/5 transition-all gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center p-2 bg-green-500/10 rounded-lg min-w-16">
                            <p className="text-2xl font-bold text-green-600">
                              {format(interviewDate, 'd')}
                            </p>
                            <p className="text-xs text-green-600">
                              {format(interviewDate, 'MMM')}
                            </p>
                          </div>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={interview.candidate_avatar || ''} />
                            <AvatarFallback className="bg-green-500/10 text-green-600">
                              <User className="w-6 h-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{interview.candidate_name}</p>
                            <p className="text-sm text-muted-foreground">{interview.job_title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                {interview.interview_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                                {interview.interview_type === 'video' ? 'Google Meet' : interview.interview_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {interview.scheduled_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {interview.interview_type === 'video' && interview.meeting_link && (
                            <Button 
                              size="sm" 
                              className="flex-1 sm:flex-none text-xs sm:text-sm" 
                              onClick={() => window.open(interview.meeting_link, '_blank')}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Join Meet
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => navigate(`/video-call/${interview.id}`)}>
                            <ChevronRight className="w-4 h-4 mr-1" />
                            Details
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
            setInterviewDetails({ date: '', time: '', type: 'video', location: '', meetingLink: '' });
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
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {scheduleDialog.applicant?.candidate?.profile?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  for {scheduleDialog.applicant?.job?.title}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={interviewDetails.date}
                  onChange={(e) => setInterviewDetails(prev => ({ ...prev, date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select 
                  value={interviewDetails.time}
                  onValueChange={(value) => setInterviewDetails(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select 
                value={interviewDetails.type}
                onValueChange={(value) => setInterviewDetails(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="in-person">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      In-Person
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Phone Call
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {interviewDetails.type === 'video' && (
              <div className="space-y-2">
                <Label>Google Meet Link</Label>
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={interviewDetails.meetingLink}
                  onChange={(e) => setInterviewDetails(prev => ({ ...prev, meetingLink: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Create a meeting at <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">meet.google.com</a> and paste the link here
                </p>
              </div>
            )}

            {interviewDetails.type === 'in-person' && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Enter interview location"
                  value={interviewDetails.location}
                  onChange={(e) => setInterviewDetails(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialog({ open: false, applicant: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview} disabled={scheduling}>
              {scheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Schedule Interview
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};