import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Calendar, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Interview {
  id: string;
  candidate_name: string;
  candidate_avatar: string | null;
  position: string;
  interview_type: string;
  date: string;
  time: string;
  meeting_link?: string | null;
}

interface EmployerInterviewsCardProps {
  employerId: string;
}

export const EmployerInterviewsCard = ({ employerId }: EmployerInterviewsCardProps) => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, [employerId]);

  const fetchInterviews = async () => {
    // Fetch from interviews table
    const { data: interviewRows } = await supabase
      .from('interviews')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        interview_type,
        meeting_link,
        candidate_id,
        candidates!inner(profile_id),
        jobs!inner(title)
      `)
      .eq('employer_id', employerId)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true })
      .limit(4);

    if (interviewRows && interviewRows.length > 0) {
      const interviewsData = await Promise.all(
        interviewRows.map(async (row: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', row.candidates.profile_id)
            .maybeSingle();

          const scheduledDate = new Date(row.scheduled_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          let dateStr: string;
          if (scheduledDate.toDateString() === today.toDateString()) {
            dateStr = 'Today';
          } else if (scheduledDate.toDateString() === tomorrow.toDateString()) {
            dateStr = 'Tomorrow';
          } else {
            dateStr = scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          }

          const typeMap: Record<string, string> = {
            video: 'Technical Round',
            'in-person': 'Portfolio Review',
            phone: 'HR Interview',
          };

          return {
            id: row.id,
            candidate_name: profileData?.full_name || 'Candidate',
            candidate_avatar: profileData?.avatar_url,
            position: row.jobs.title,
            interview_type: typeMap[row.interview_type] || row.interview_type,
            date: dateStr,
            time: row.scheduled_time,
            meeting_link: row.meeting_link,
          };
        })
      );
      setInterviews(interviewsData);
    }
    setLoading(false);
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Technical Round': 'bg-primary/10 text-primary',
      'Final Round': 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]',
      'Portfolio Review': 'bg-[hsl(44,70%,45%)]/10 text-[hsl(44,70%,45%)]',
      'HR Interview': 'bg-[hsl(142,53%,43%)]/10 text-[hsl(142,53%,43%)]'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-5 h-full animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="font-semibold text-foreground">Upcoming Interviews</h3>
        <Button variant="link" className="text-primary p-0 h-auto gap-1">
          View Calendar
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Interview List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {interviews.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No upcoming interviews
          </div>
        ) : (
          interviews.map((interview) => (
            <div 
              key={interview.id}
              className="p-4 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={interview.candidate_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {interview.candidate_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{interview.candidate_name}</p>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs font-medium", getTypeBadgeColor(interview.interview_type))}
                    >
                      {interview.interview_type}
                    </Badge>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 text-xs sm:text-sm"
                  onClick={() => {
                    if (interview.meeting_link) {
                      window.open(interview.meeting_link, '_blank');
                    } else {
                      navigate(`/video-call/${interview.id}`);
                    }
                  }}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Join Call</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{interview.position}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {interview.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {interview.time}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
