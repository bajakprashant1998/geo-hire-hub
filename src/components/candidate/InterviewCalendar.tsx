import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Phone,
  CalendarDays,
  CalendarCheck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval, isBefore, isAfter } from 'date-fns';
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

type ViewFilter = 'all' | 'today' | 'week' | 'upcoming';

export const InterviewCalendar = ({ candidateId }: InterviewCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('upcoming');

  useEffect(() => {
    fetchInterviews();
  }, [candidateId]);

  const fetchInterviews = async () => {
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

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayCount = interviews.filter(i => isToday(i.date)).length;
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const thisWeekCount = interviews.filter(i => isWithinInterval(i.date, { start: weekStart, end: weekEnd })).length;
    const upcomingCount = interviews.filter(i => !isBefore(i.date, now) || isToday(i.date)).length;
    return { total: interviews.length, today: todayCount, thisWeek: thisWeekCount, upcoming: upcomingCount };
  }, [interviews]);

  // Filtered interviews for the list panel
  const filteredInterviews = useMemo(() => {
    const now = new Date();
    if (selectedDate) return interviews.filter(i => isSameDay(i.date, selectedDate));
    switch (viewFilter) {
      case 'today': return interviews.filter(i => isToday(i.date));
      case 'week': {
        const ws = startOfWeek(now);
        const we = endOfWeek(now);
        return interviews.filter(i => isWithinInterval(i.date, { start: ws, end: we }));
      }
      case 'upcoming': return interviews.filter(i => !isBefore(i.date, now) || isToday(i.date));
      default: return interviews;
    }
  }, [interviews, viewFilter, selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getInterviewsForDate = (date: Date) => interviews.filter(i => isSameDay(i.date, date));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'in-person': return <MapPin className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'in-person': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video Call';
      case 'in-person': return 'In Person';
      default: return 'Phone Call';
    }
  };

  const filterTabs: { key: ViewFilter; label: string; icon: any; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: stats.upcoming },
    { key: 'today', label: 'Today', icon: CalendarCheck, count: stats.today },
    { key: 'week', label: 'This Week', icon: Calendar, count: stats.thisWeek },
    { key: 'all', label: 'All', icon: Calendar, count: stats.total },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Scheduled', value: stats.total, icon: CalendarDays, color: 'text-primary bg-primary/10' },
          { label: 'Today', value: stats.today, icon: CalendarCheck, color: 'text-green-600 bg-green-500/10' },
          { label: 'This Week', value: stats.thisWeek, icon: Calendar, color: 'text-blue-600 bg-blue-500/10' },
          { label: 'Upcoming', value: stats.upcoming, icon: AlertCircle, color: 'text-amber-600 bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTabs.map(tab => (
          <Button
            key={tab.key}
            variant={viewFilter === tab.key && !selectedDate ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "rounded-full text-xs gap-1.5 shrink-0 transition-all",
              viewFilter === tab.key && !selectedDate && "shadow-md"
            )}
            onClick={() => { setViewFilter(tab.key); setSelectedDate(null); }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                viewFilter === tab.key && !selectedDate
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </Button>
        ))}
        {selectedDate && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full text-xs gap-1.5 shrink-0"
            onClick={() => setSelectedDate(null)}
          >
            {format(selectedDate, 'MMM d')} ✕
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Previous month</TooltipContent></Tooltip>
                <span className="font-medium text-sm min-w-28 text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger><TooltipContent>Next month</TooltipContent></Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-7 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                  <span className="hidden sm:inline">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
                  <span className="sm:hidden">{day}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-sm",
                      isToday(day) && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                      !isSelected && hasInterviews && "bg-primary/10 font-semibold",
                      !isSelected && !hasInterviews && "hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "font-medium",
                      isSelected && "text-primary-foreground",
                      !isSelected && isToday(day) && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasInterviews && !isSelected && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        {dayInterviews.slice(0, 3).map((_, idx) => (
                          <div key={idx} className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                    {hasInterviews && isSelected && (
                      <span className="text-[9px] font-bold text-primary-foreground/80">{dayInterviews.length}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full ring-2 ring-primary ring-offset-1 ring-offset-background" />
                Today
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                Has Interview
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Selected
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview List Panel */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center justify-between">
              <span>
                {selectedDate
                  ? format(selectedDate, 'EEE, MMM d')
                  : filterTabs.find(t => t.key === viewFilter)?.label + ' Interviews'
                }
              </span>
              <Badge variant="secondary" className="text-xs font-bold">
                {filteredInterviews.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="wait">
              {filteredInterviews.length > 0 ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {filteredInterviews.map((interview, i) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 sm:p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={interview.companyLogo || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{interview.position}</p>
                          <p className="text-xs text-muted-foreground truncate">{interview.company}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1", getTypeBadge(interview.type))}>
                              {getTypeIcon(interview.type)}
                              {getTypeLabel(interview.type)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              {interview.time}
                            </span>
                            {!selectedDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                                <CalendarDays className="w-3 h-3" />
                                {format(interview.date, 'MMM d')}
                              </span>
                            )}
                          </div>
                          {interview.location && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {interview.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8 rounded-lg">
                          <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                          Add to Cal
                        </Button>
                        {interview.type === 'video' && interview.meetingLink ? (
                          <Button
                            size="sm"
                            className="flex-1 text-xs h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => window.open(interview.meetingLink!, '_blank')}
                          >
                            <Video className="w-3.5 h-3.5 mr-1" />
                            Join Meet
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        ) : interview.type === 'video' ? (
                          <Button size="sm" variant="secondary" disabled className="flex-1 text-xs h-8 rounded-lg">
                            <Video className="w-3.5 h-3.5 mr-1" />
                            Link Pending
                          </Button>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-10"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-medium text-foreground/80 mb-1">No interviews found</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                    {selectedDate
                      ? `Nothing scheduled for ${format(selectedDate, 'MMMM d')}`
                      : 'Apply to jobs and get shortlisted to see interviews here'
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
