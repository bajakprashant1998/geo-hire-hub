import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, Clock, Video, MapPin, ChevronLeft, ChevronRight, User, ExternalLink, Phone, 
  Zap, CalendarCheck, Timer, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, differenceInMinutes, differenceInHours, isBefore, isAfter, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmployerInterviewCalendarProps {
  employerId: string;
}

interface Interview {
  id: string;
  date: Date;
  time: string;
  candidateName: string;
  candidateAvatar: string | null;
  position: string;
  type: 'video' | 'in-person' | 'phone';
  location?: string;
  status: string;
  meetingLink?: string | null;
}

export const EmployerInterviewCalendar = ({ employerId }: EmployerInterviewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchInterviews();
  }, [employerId]);

  const fetchInterviews = async () => {
    const { data: rows } = await supabase
      .from('interviews')
      .select(`
        id, scheduled_date, scheduled_time, interview_type, meeting_link, location, status,
        candidate_id,
        candidates!inner(profile_id),
        jobs!inner(title)
      `)
      .eq('employer_id', employerId)
      .in('status', ['scheduled', 'confirmed', 'pending_confirmation'])
      .order('scheduled_date', { ascending: true });

    if (rows && rows.length > 0) {
      const mapped: Interview[] = await Promise.all(
        rows.map(async (row: any) => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', row.candidates.profile_id)
            .maybeSingle();

          return {
            id: row.id,
            date: new Date(row.scheduled_date),
            time: row.scheduled_time,
            candidateName: prof?.full_name || 'Candidate',
            candidateAvatar: prof?.avatar_url,
            position: row.jobs.title,
            type: row.interview_type,
            location: row.location,
            status: row.status,
            meetingLink: row.meeting_link,
          };
        })
      );
      setInterviews(mapped);
    }
    setLoading(false);
  };

  // Next upcoming interview
  const nextInterview = useMemo(() => {
    const now = new Date();
    return interviews
      .filter(i => {
        const interviewDate = new Date(i.date);
        const [hours, minutes] = i.time.split(':').map(Number);
        interviewDate.setHours(hours, minutes);
        return isAfter(interviewDate, now);
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
  }, [interviews]);

  // Countdown text for next interview
  const getCountdown = (interview: Interview) => {
    const now = new Date();
    const interviewDate = new Date(interview.date);
    const [hours, minutes] = interview.time.split(':').map(Number);
    interviewDate.setHours(hours, minutes);
    const diffMins = differenceInMinutes(interviewDate, now);
    const diffHrs = differenceInHours(interviewDate, now);

    if (diffMins < 0) return { text: 'In Progress', urgent: true, live: true };
    if (diffMins <= 15) return { text: `Starting in ${diffMins} min`, urgent: true, live: false };
    if (diffMins <= 60) return { text: `In ${diffMins} minutes`, urgent: true, live: false };
    if (diffHrs < 24) return { text: `In ${diffHrs} hours`, urgent: false, live: false };
    const days = Math.ceil(diffHrs / 24);
    return { text: `In ${days} day${days > 1 ? 's' : ''}`, urgent: false, live: false };
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getInterviewsForDate = (date: Date) =>
    interviews.filter(i => isSameDay(i.date, date));

  const selectedDateInterviews = selectedDate ? getInterviewsForDate(selectedDate) : [];

  // This week's interviews count
  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return interviews.filter(i => isAfter(i.date, startOfDay(now)) && isBefore(i.date, weekEnd)).length;
  }, [interviews]);

  const todayCount = useMemo(() => {
    return interviews.filter(i => isToday(i.date)).length;
  }, [interviews]);

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Next Interview Hero */}
      {nextInterview && (() => {
        const countdown = getCountdown(nextInterview);
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border p-4 sm:p-5 relative overflow-hidden",
              countdown.urgent 
                ? "bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/30" 
                : "bg-card border-border"
            )}
          >
            {countdown.live && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </span>
                <span className="text-xs font-semibold text-destructive">LIVE NOW</span>
              </div>
            )}
            {countdown.urgent && !countdown.live && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary/15 text-primary border-primary/25 text-xs gap-1 animate-pulse">
                  <Timer className="w-3 h-3" /> {countdown.text}
                </Badge>
              </div>
            )}
            {!countdown.urgent && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Clock className="w-3 h-3" /> {countdown.text}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Interview</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                <AvatarImage src={nextInterview.candidateAvatar || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {nextInterview.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{nextInterview.candidateName}</p>
                <p className="text-sm text-muted-foreground truncate">{nextInterview.position}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isToday(nextInterview.date) ? 'Today' : format(nextInterview.date, 'MMM d')}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {nextInterview.time}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] gap-0.5",
                    nextInterview.type === 'video' ? 'bg-primary/10 text-primary border-primary/20'
                    : nextInterview.type === 'in-person' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20'
                    : 'bg-secondary text-secondary-foreground'
                  )}>
                    {nextInterview.type === 'video' ? <Video className="w-3 h-3" /> : nextInterview.type === 'in-person' ? <MapPin className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                    <span className="capitalize">{nextInterview.type}</span>
                  </Badge>
                </div>
              </div>
              {nextInterview.type === 'video' && nextInterview.meetingLink && (
                <Button 
                  size="sm" 
                  className="gap-1.5 shrink-0 shadow-sm"
                  onClick={() => window.open(nextInterview.meetingLink!, '_blank')}
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Join Call</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Mini Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Today', value: todayCount, icon: CalendarCheck, color: 'text-primary bg-primary/10' },
          { label: 'This Week', value: thisWeekCount, icon: TrendingUp, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10' },
          { label: 'Total', value: interviews.length, icon: Calendar, color: 'text-muted-foreground bg-muted' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Calendar + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Interview Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                </TooltipTrigger><TooltipContent>Previous month</TooltipContent></Tooltip>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="font-medium text-sm min-w-28 justify-center"
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
                >
                  {format(currentMonth, 'MMMM yyyy')}
                </Button>
                <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                </TooltipTrigger><TooltipContent>Next month</TooltipContent></Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, index) => (
                <div key={`pad-${index}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const dayInterviews = getInterviewsForDate(day);
                const hasInterviews = dayInterviews.length > 0;
                const isSelected = selectedDate && isSameDay(selectedDate, day);
                const isPast = isBefore(day, startOfDay(new Date())) && !isToday(day);

                return (
                  <motion.button
                    key={day.toISOString()}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all",
                      isToday(day) && !isSelected && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
                      isSelected && "bg-primary text-primary-foreground shadow-sm",
                      !isSelected && hasInterviews && "bg-primary/10 hover:bg-primary/20",
                      !isSelected && !hasInterviews && !isPast && "hover:bg-muted",
                      isPast && !isSelected && !hasInterviews && "text-muted-foreground/40"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected && "text-primary-foreground",
                      !isSelected && isToday(day) && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasInterviews && !isSelected && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        {dayInterviews.slice(0, 3).map((interview, idx) => (
                          <div key={idx} className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            interview.type === 'video' ? 'bg-primary' : interview.type === 'in-person' ? 'bg-[hsl(var(--success))]' : 'bg-secondary-foreground'
                          )} />
                        ))}
                      </div>
                    )}
                    {hasInterviews && isSelected && (
                      <span className="text-[8px] font-bold text-primary-foreground/80">{dayInterviews.length}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              {[
                { color: 'bg-primary', label: 'Video' },
                { color: 'bg-[hsl(var(--success))]', label: 'In-Person' },
                { color: 'bg-secondary-foreground', label: 'Phone' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", l.color)} />
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate ? (
                <span className="flex items-center gap-2">
                  {format(selectedDate, 'EEEE, MMM d')}
                  {selectedDateInterviews.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">{selectedDateInterviews.length} interview{selectedDateInterviews.length > 1 ? 's' : ''}</Badge>
                  )}
                </span>
              ) : 'Upcoming Interviews'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence mode="wait">
              {selectedDate ? (
                selectedDateInterviews.length > 0 ? (
                  selectedDateInterviews.map((interview) => (
                    <InterviewDetailCard key={interview.id} interview={interview} />
                  ))
                ) : (
                  <EmptyState text="No interviews on this day" subtitle="Click a highlighted date to see interviews" />
                )
              ) : interviews.length > 0 ? (
                interviews.slice(0, 4).map((interview) => (
                  <InterviewDetailCard key={interview.id} interview={interview} showDate />
                ))
              ) : (
                <EmptyState text="No interviews scheduled" subtitle="Schedule interviews from the Candidates section" />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const InterviewDetailCard = ({ interview, showDate }: { interview: Interview; showDate?: boolean }) => {
  const typeConfig = {
    video: { icon: Video, color: 'bg-primary/10 text-primary border-primary/20' },
    'in-person': { icon: MapPin, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
    phone: { icon: Phone, color: 'bg-secondary text-secondary-foreground border-border' },
  };
  const tc = typeConfig[interview.type] || typeConfig.phone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3.5 rounded-xl border bg-card hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        {showDate ? (
          <div className="text-center min-w-12 p-1.5 bg-primary/10 rounded-lg">
            <p className="text-xl font-bold text-primary leading-tight">{format(interview.date, 'd')}</p>
            <p className="text-[10px] font-medium text-primary">{format(interview.date, 'MMM')}</p>
          </div>
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarImage src={interview.candidateAvatar || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{interview.candidateName}</p>
          <p className="text-xs text-muted-foreground truncate">{interview.position}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] gap-0.5", tc.color)}>
              <tc.icon className="w-3 h-3" />
              <span className="capitalize">{interview.type}</span>
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {interview.time}
            </span>
          </div>
        </div>
      </div>
      {interview.type === 'video' && interview.meetingLink && (
        <Button 
          size="sm" 
          className="w-full mt-3 gap-2 h-8 text-xs" 
          onClick={() => window.open(interview.meetingLink!, '_blank')}
        >
          <Video className="w-3.5 h-3.5" />
          Join Google Meet
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </motion.div>
  );
};

const EmptyState = ({ text, subtitle }: { text: string; subtitle?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
      <Calendar className="w-6 h-6 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-medium text-muted-foreground">{text}</p>
    {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
  </motion.div>
);
