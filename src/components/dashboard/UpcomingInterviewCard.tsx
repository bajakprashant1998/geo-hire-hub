import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Video, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface InterviewData {
  id: string;
  jobTitle: string;
  companyName: string;
  date: string;
  time: string;
  interviewType: string;
  meetingLink: string | null;
  location: string | null;
  companyInitials: string;
}

export const UpcomingInterviewCard = () => {
  const { profile } = useAuth();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchNextInterview();
  }, [profile]);

  const fetchNextInterview = async () => {
    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_id', profile!.id)
        .maybeSingle();

      if (!candidate) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data: row } = await supabase
        .from('interviews')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          interview_type,
          meeting_link,
          location,
          jobs!inner(title, job_address),
          employers!inner(company_name)
        `)
        .eq('candidate_id', candidate.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (row) {
        const job = row.jobs as any;
        const employer = row.employers as any;
        const companyName = employer.company_name || 'Company';
        const initials = companyName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        setInterview({
          id: row.id,
          jobTitle: job.title,
          companyName,
          date: format(new Date(row.scheduled_date), 'EEEE, MMM d'),
          time: row.scheduled_time,
          interviewType: row.interview_type,
          meetingLink: row.meeting_link,
          location: row.location || job.job_address,
          companyInitials: initials,
        });
      }
    } catch (err) {
      console.error('Failed to fetch interview:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 p-4 sm:p-5 h-full">
        <Skeleton className="h-6 w-48 mb-4 rounded-xl" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 p-4 sm:p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm sm:text-base">Next Scheduled Interview</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No upcoming interviews</p>
          <p className="text-xs text-muted-foreground mt-1">Apply to jobs to get interview invitations</p>
        </div>
      </div>
    );
  }

  const isVideo = interview.interviewType === 'video';

  return (
    <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 p-4 sm:p-5 h-full">
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <Video className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm sm:text-base">Next Scheduled Interview</h3>
      </div>

      {/* Job Info */}
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-xs sm:text-sm">{interview.companyInitials}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm sm:text-base leading-tight">{interview.jobTitle}</p>
          <p className="text-xs sm:text-sm text-primary leading-tight">{interview.companyName}</p>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Date</p>
            <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{interview.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Time</p>
            <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{interview.time}</p>
          </div>
        </div>
      </div>

      {/* Type & Location */}
      <div className="flex items-center gap-2 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b">
        {isVideo ? (
          <Video className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {isVideo ? 'Video Call' : interview.interviewType === 'phone' ? 'Phone Interview' : 'In-Person'}
          </p>
          <p className="text-xs sm:text-sm font-medium text-foreground leading-tight">
            {isVideo ? 'Online Meeting' : interview.location || 'Location TBD'}
          </p>
        </div>
      </div>

      {/* Action Button */}
      {isVideo && interview.meetingLink ? (
        <Button 
          className="w-full gap-2 text-sm"
          onClick={() => window.open(interview.meetingLink!, '_blank')}
        >
          <Video className="w-4 h-4" />
          Join Google Meet
        </Button>
      ) : isVideo ? (
        <Button className="w-full gap-2 text-sm" variant="outline" disabled>
          <Video className="w-4 h-4" />
          Google Meet Link Pending
        </Button>
      ) : (
        <Button variant="outline" className="w-full gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          View Location
        </Button>
      )}
    </div>
  );
};
