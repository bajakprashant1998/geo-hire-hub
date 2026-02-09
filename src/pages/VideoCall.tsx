import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  ExternalLink,
  Mic,
  Camera,
  CheckCircle2,
  User,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface InterviewDetails {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  interview_type: string;
  meeting_link: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  candidate_name: string;
  candidate_avatar: string | null;
  job_title: string;
  company_name: string;
}

const VideoCall = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) fetchInterview();
  }, [interviewId]);

  const fetchInterview = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id, scheduled_date, scheduled_time, interview_type, meeting_link, location, notes, status,
          candidates!inner(profile_id, job_title),
          jobs!inner(title),
          employers!inner(company_name)
        `)
        .eq('id', interviewId)
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', (data as any).candidates.profile_id)
        .single();

      setInterview({
        id: data.id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        interview_type: data.interview_type,
        meeting_link: data.meeting_link,
        location: data.location,
        notes: data.notes,
        status: data.status,
        candidate_name: profile?.full_name || 'Candidate',
        candidate_avatar: profile?.avatar_url || null,
        job_title: (data as any).jobs.title,
        company_name: (data as any).employers.company_name,
      });
    } catch (error: any) {
      console.error('Error fetching interview:', error);
      toast.error('Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (interview?.meeting_link) {
      window.open(interview.meeting_link, '_blank');
    } else {
      toast.error('No meeting link available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Interview Not Found</h2>
            <p className="text-muted-foreground mb-6">This interview doesn't exist or you don't have access.</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = format(new Date(interview.scheduled_date), 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Interview Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Interview Lobby</CardTitle>
            <Badge variant="outline" className="mx-auto mt-2">
              {interview.status === 'scheduled' ? 'Upcoming' : interview.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Participant Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
              <Avatar className="w-12 h-12">
                <AvatarImage src={interview.candidate_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{interview.candidate_name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {interview.job_title} at {interview.company_name}
                </p>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium">{interview.scheduled_time}</p>
                </div>
              </div>
            </div>

            {interview.location && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm">{interview.location}</p>
              </div>
            )}

            {interview.notes && (
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{interview.notes}</p>
              </div>
            )}

            {/* Pre-call Checklist */}
            {interview.interview_type === 'video' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pre-call Checklist</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Stable internet connection
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Camera className="w-4 h-4 text-green-500" />
                    Camera enabled
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mic className="w-4 h-4 text-green-500" />
                    Microphone enabled
                  </div>
                </div>
              </div>
            )}

            {/* Join Button */}
            {interview.interview_type === 'video' && interview.meeting_link && (
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={handleJoinMeeting}
              >
                <Video className="w-5 h-5 mr-2" />
                Join Video Meeting
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}

            {interview.interview_type !== 'video' && (
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  This is an {interview.interview_type} interview
                  {interview.location && ` at ${interview.location}`}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VideoCall;
