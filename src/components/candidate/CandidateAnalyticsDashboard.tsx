import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Search, Briefcase, TrendingUp, Calendar, Users, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CandidateAnalyticsDashboardProps {
  candidateId: string;
}

type TimeRange = '7d' | '30d' | '90d';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 71% 45%)',
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
];

export const CandidateAnalyticsDashboard = ({ candidateId }: CandidateAnalyticsDashboardProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('30d');

  const [profileViews, setProfileViews] = useState<any[]>([]);
  const [searchAppearances, setSearchAppearances] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [prevProfileViews, setPrevProfileViews] = useState(0);

  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = useMemo(() => subDays(new Date(), rangeDays), [rangeDays]);
  const prevStartDate = useMemo(() => subDays(startDate, rangeDays), [startDate, rangeDays]);

  useEffect(() => {
    if (!profile || !candidateId) return;
    fetchAnalytics();
  }, [profile, candidateId, range]);

  const fetchAnalytics = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [viewsRes, searchRes, appsRes, prevViewsRes] = await Promise.all([
        supabase
          .from('profile_views')
          .select('created_at')
          .eq('profile_id', profile.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('search_appearances')
          .select('created_at, search_query')
          .eq('candidate_id', candidateId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('applications')
          .select('created_at, status')
          .eq('candidate_id', candidateId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profile.id)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
      ]);

      setProfileViews(viewsRes.data || []);
      setSearchAppearances(searchRes.data || []);
      setApplications(appsRes.data || []);
      setPrevProfileViews(prevViewsRes.count || 0);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build time-series data for the area chart
  const timeSeriesData = useMemo(() => {
    if (rangeDays <= 30) {
      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const views = profileViews.filter(v => format(new Date(v.created_at), 'yyyy-MM-dd') === dayStr).length;
        const searches = searchAppearances.filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === dayStr).length;
        return { date: format(day, 'MMM d'), views, searches };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: startDate, end: new Date() });
      return weeks.map((week, i) => {
        const weekEnd = i < weeks.length - 1 ? weeks[i + 1] : new Date();
        const views = profileViews.filter(v => {
          const d = new Date(v.created_at);
          return d >= week && d < weekEnd;
        }).length;
        const searches = searchAppearances.filter(s => {
          const d = new Date(s.created_at);
          return d >= week && d < weekEnd;
        }).length;
        return { date: format(week, 'MMM d'), views, searches };
      });
    }
  }, [profileViews, searchAppearances, startDate, rangeDays]);

  // Application funnel
  const funnelData = useMemo(() => {
    const total = applications.length;
    const reviewing = applications.filter(a => ['reviewing', 'shortlisted'].includes(a.status)).length;
    const interviews = applications.filter(a => a.status === 'interview').length;
    const hired = applications.filter(a => a.status === 'hired').length;
    return [
      { name: 'Applied', value: total },
      { name: 'Reviewing', value: reviewing },
      { name: 'Interview', value: interviews },
      { name: 'Hired', value: hired },
    ];
  }, [applications]);

  // Application status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach(a => {
      const s = a.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [applications]);

  // Change percentage
  const viewChange = prevProfileViews > 0
    ? Math.round(((profileViews.length - prevProfileViews) / prevProfileViews) * 100)
    : profileViews.length > 0 ? 100 : 0;

  const statCards = [
    {
      icon: Eye,
      label: 'Profile Views',
      value: profileViews.length,
      change: viewChange,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Search,
      label: 'Search Appearances',
      value: searchAppearances.length,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      icon: Briefcase,
      label: 'Applications Sent',
      value: applications.length,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      icon: TrendingUp,
      label: 'Conversion Rate',
      value: applications.length > 0
        ? `${Math.round((applications.filter(a => ['interview', 'hired', 'shortlisted'].includes(a.status)).length / applications.length) * 100)}%`
        : '0%',
      color: 'text-warning-foreground',
      bg: 'bg-warning/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Your Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your visibility and application performance</p>
        </div>
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
          {(['7d', '30d', '90d'] as TimeRange[]).map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'ghost'}
              className={cn('text-xs h-8 rounded-lg', range === r && 'shadow-sm')}
              onClick={() => setRange(r)}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.bg)}>
                    <stat.icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {stat.change !== undefined && (
                    <span className={cn('text-xs font-medium flex items-center gap-0.5', stat.change >= 0 ? 'text-success' : 'text-destructive')}>
                      {stat.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stat.change)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Views & Search Appearances Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Profile Views & Search Appearances</CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeriesData.some(d => d.views > 0 || d.searches > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="views" name="Profile Views" stroke="hsl(var(--primary))" fill="url(#viewsGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="searches" name="Search Appearances" stroke="hsl(var(--accent))" fill="url(#searchGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Eye className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No activity yet in this period</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Complete your profile and keep it updated to get more visibility</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom row: Funnel + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Application Funnel */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Application Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No applications in this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statusDistribution.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground flex-1">{item.name}</span>
                        <span className="font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No application data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top search queries */}
      {searchAppearances.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-accent" />
                Top Search Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  searchAppearances
                    .filter(s => s.search_query)
                    .reduce((acc: Record<string, number>, s) => {
                      acc[s.search_query] = (acc[s.search_query] || 0) + 1;
                      return acc;
                    }, {})
                )
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 8)
                  .map(([query, count], i) => (
                    <div key={query} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <span className="text-sm text-foreground">{query}</span>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count as number}×</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
