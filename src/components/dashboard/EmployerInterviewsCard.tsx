import { useState, useEffect } from 'react';
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
}

interface EmployerInterviewsCardProps {
  employerId: string;
}

export const EmployerInterviewsCard = ({ employerId }: EmployerInterviewsCardProps) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, [employerId]);

  const fetchInterviews = async () => {
    // Fetch shortlisted applications as "interviews"
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        id,
        job_id,
        candidate_id,
        updated_at,
        jobs!inner(title, employer_id),
        candidates!inner(profile_id)
      `)
      .eq('status', 'shortlisted')
      .eq('jobs.employer_id', employerId)
      .order('updated_at', { ascending: false })
      .limit(4);

    if (applications && applications.length > 0) {
      const interviewsData = await Promise.all(
        applications.map(async (app: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', app.candidates.profile_id)
            .maybeSingle();

          // Generate mock interview times
          const interviewTypes = ['Technical Round', 'Final Round', 'Portfolio Review', 'HR Interview'];
          const randomType = interviewTypes[Math.floor(Math.random() * interviewTypes.length)];
          
          const now = new Date();
          const futureDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
          const dateStr = futureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const hours = 9 + Math.floor(Math.random() * 8);
          const timeStr = `${hours}:00 ${hours >= 12 ? 'PM' : 'AM'}`;

          return {
            id: app.id,
            candidate_name: profileData?.full_name || 'Candidate',
            candidate_avatar: profileData?.avatar_url,
            position: app.jobs.title,
            interview_type: randomType,
            date: dateStr === new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) ? 'Today' : dateStr,
            time: timeStr
          };
        })
      );
      setInterviews(interviewsData);
    } else {
      // Demo data if no real interviews
      setInterviews([
        {
          id: '1',
          candidate_name: 'Sarah Johnson',
          candidate_avatar: null,
          position: 'Senior Frontend Devel...',
          interview_type: 'Technical Round',
          date: 'Today',
          time: '2:00 PM'
        },
        {
          id: '2',
          candidate_name: 'Michael Chen',
          candidate_avatar: null,
          position: 'Backend Engineer',
          interview_type: 'Final Round',
          date: 'Tomorrow',
          time: '10:00 AM'
        },
        {
          id: '3',
          candidate_name: 'Emily Davis',
          candidate_avatar: null,
          position: 'Product Designer',
          interview_type: 'Portfolio Review',
          date: 'Jan 21',
          time: '3:30 PM'
        }
      ]);
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                >
                  Join Call
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
