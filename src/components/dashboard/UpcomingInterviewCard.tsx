import { Calendar, Clock, User, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterviewDetails {
  jobTitle: string;
  companyName: string;
  date: string;
  time: string;
  interviewer: string;
  companyInitials: string;
}

interface UpcomingInterviewCardProps {
  interview?: InterviewDetails | null;
}

export const UpcomingInterviewCard = ({ interview }: UpcomingInterviewCardProps) => {
  // Demo data if no real interview
  const displayInterview = interview || {
    jobTitle: 'Senior Frontend Developer',
    companyName: 'TechCorp Inc.',
    date: 'Thursday, Jan 23',
    time: '2:00 PM EST',
    interviewer: 'Sarah Johnson - Technical Recruiter',
    companyInitials: 'TC'
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Video className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Next Scheduled Interview</h3>
      </div>

      {/* Job Info */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">{displayInterview.companyInitials}</span>
        </div>
        <div>
          <p className="font-semibold text-foreground">{displayInterview.jobTitle}</p>
          <p className="text-sm text-primary">{displayInterview.companyName}</p>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-semibold text-foreground">{displayInterview.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-sm font-semibold text-foreground">{displayInterview.time}</p>
          </div>
        </div>
      </div>

      {/* Interviewer */}
      <div className="flex items-center gap-2 mb-5 pb-4 border-b">
        <User className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Interviewer</p>
          <p className="text-sm font-medium text-foreground">{displayInterview.interviewer}</p>
        </div>
      </div>

      {/* Action Button */}
      <Button className="w-full bg-primary hover:bg-primary/90 gap-2">
        <Video className="w-4 h-4" />
        Join Meeting
      </Button>
    </div>
  );
};
