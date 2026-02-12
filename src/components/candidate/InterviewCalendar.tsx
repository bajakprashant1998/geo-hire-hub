import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Building2, 
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InterviewCalendarProps {
  candidateId: string;
}

interface Interview {
  id: string;
  date: Date;
  time: string;
  company: string;
  position: string;
  type: 'video' | 'in-person' | 'phone';
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  companyLogo?: string;
  meetingLink?: string | null;
}

export const InterviewCalendar = ({ candidateId }: InterviewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, [candidateId]);

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
        location,
        status,
        jobs!inner(title, job_address),
        employers!inner(company_name, profile_id)
      `)
      .eq('candidate_id', candidateId)
      .eq('status', 'scheduled')
      .order('scheduled_date', { ascending: true });

    if (interviewRows && interviewRows.length > 0) {
      const mappedInterviews: Interview[] = await Promise.all(
        interviewRows.map(async (row: any) => {
          const { data: empProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', row.employers.profile_id)
            .maybeSingle();

          return {
            id: row.id,
            date: new Date(row.scheduled_date),
            time: row.scheduled_time,
            company: row.employers.company_name,
            position: row.jobs.title,
            type: row.interview_type as 'video' | 'in-person' | 'phone',
            location: row.location || row.jobs.job_address,
            status: row.status as 'scheduled' | 'completed' | 'cancelled',
            companyLogo: empProfile?.avatar_url,
            meetingLink: row.meeting_link,
          };
        })
      );
      setInterviews(mappedInterviews);
    }
    setLoading(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the calendar grid
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getInterviewsForDate = (date: Date) => 
    interviews.filter(i => isSameDay(i.date, date));

  const selectedDateInterviews = selectedDate ? getInterviewsForDate(selectedDate) : [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'in-person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'in-person':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-3 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Interview Calendar
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-32 text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div 
                key={day} 
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dayInterviews = getInterviewsForDate(day);
              const hasInterviews = dayInterviews.length > 0;
              const isSelected = selectedDate && isSameDay(selectedDate, day);
              
              return (
                <motion.button
                  key={day.toISOString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all",
                    isToday(day) && "ring-2 ring-primary ring-offset-2",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && hasInterviews && "bg-primary/10",
                    !isSelected && !hasInterviews && "hover:bg-muted"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected && "text-primary-foreground",
                    !isSelected && isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasInterviews && (
                    <div className={cn(
                      "absolute bottom-1 flex gap-0.5",
                      isSelected && "hidden"
                    )}>
                      {dayInterviews.slice(0, 3).map((_, idx) => (
                        <div 
                          key={idx} 
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details / Upcoming */}
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {selectedDate 
              ? format(selectedDate, 'EEEE, MMMM d')
              : 'Upcoming Interviews'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="wait">
            {selectedDate ? (
              selectedDateInterviews.length > 0 ? (
                selectedDateInterviews.map((interview) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={interview.companyLogo || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Building2 className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{interview.position}</p>
                        <p className="text-sm text-muted-foreground">{interview.company}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={getTypeBadge(interview.type)}>
                            {getTypeIcon(interview.type)}
                            <span className="ml-1 capitalize">{interview.type}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {interview.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1 text-xs sm:text-sm">
                        <CalendarPlus className="w-4 h-4 mr-1" />
                        Add to Calendar
                      </Button>
                      {interview.type === 'video' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            if (interview.meetingLink) {
                              window.open(interview.meetingLink, '_blank');
                            }
                          }}
                          className="text-xs sm:text-sm"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join Call
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No interviews on this day</p>
                </motion.div>
              )
            ) : interviews.length > 0 ? (
              interviews.slice(0, 3).map((interview) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {format(interview.date, 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(interview.date, 'MMM')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{interview.position}</p>
                      <p className="text-sm text-muted-foreground">{interview.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", getTypeBadge(interview.type))}>
                          {interview.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{interview.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-2">No interviews scheduled</p>
                <p className="text-sm text-muted-foreground">
                  Apply to jobs and get shortlisted to see interviews here
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};