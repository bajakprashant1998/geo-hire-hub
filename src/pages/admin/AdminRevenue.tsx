import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/admin/StatsCard';
import {
  Banknote, TrendingUp, TrendingDown, Users, Search, AlertTriangle,
  ArrowUpRight, Target, Sparkles, Calendar
} from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart, Legend, ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SubscriptionDetail {
  id: string;
  status: string;
  billing_cycle: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  employer: { id: string; company_name: string };
  plan: { id: string; name: string; price_monthly: number; price_yearly: number | null };
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function AdminRevenue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [forecastMonths, setForecastMonths] = useState<'3' | '6' | '12'>('6');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-revenue-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_subscriptions')
        .select(`
          *,
          employer:employers!employer_subscriptions_employer_id_fkey(id, company_name),
          plan:employer_plans!employer_subscriptions_plan_id_fkey(id, name, price_monthly, price_yearly)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SubscriptionDetail[];
    },
  });

  const active = subscriptions?.filter(s => s.status === 'active') || [];
  const cancelled = subscriptions?.filter(s => s.status === 'cancelled' || s.cancelled_at) || [];
  const totalMRR = active.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0);
  const paidActive = active.filter(s => (s.plan?.price_monthly || 0) > 0);
  const churnRate = subscriptions?.length ? ((cancelled.length / subscriptions.length) * 100).toFixed(1) : '0';

  // Revenue by plan breakdown
  const planBreakdown = active.reduce<Record<string, { count: number; revenue: number }>>((acc, s) => {
    const name = s.plan?.name || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, revenue: 0 };
    acc[name].count++;
    acc[name].revenue += s.plan?.price_monthly || 0;
    return acc;
  }, {});

  const chartData = Object.entries(planBreakdown).map(([name, data]) => ({
    name, revenue: data.revenue, count: data.count,
  }));

  // Monthly trend (last 6 months)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const monthSubs = subscriptions?.filter(s => {
      const created = new Date(s.created_at);
      return created >= monthStart && created <= monthEnd;
    }) || [];
    return {
      month: format(month, 'MMM yyyy'),
      newSubs: monthSubs.length,
      revenue: monthSubs.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0),
    };
  });

  // === REVENUE FORECASTING ===
  const forecastData = useMemo(() => {
    const months = parseInt(forecastMonths);
    const churnRateNum = parseFloat(churnRate) / 100;
    const monthlyChurn = churnRateNum / 12; // Annualized → monthly

    // Calculate average monthly growth from historical data
    const historicalRevenues = monthlyTrend.map(m => m.revenue);
    const historicalSubs = monthlyTrend.map(m => m.newSubs);
    const avgNewSubsPerMonth = historicalSubs.reduce((a, b) => a + b, 0) / historicalSubs.length;
    const avgRevenuePerSub = paidActive.length > 0
      ? active.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0) / active.length
      : 0;

    // Growth rates from last 3 months
    const recentRevenues = historicalRevenues.slice(-3);
    let growthRate = 0;
    if (recentRevenues.length >= 2) {
      const rates = recentRevenues.slice(1).map((r, i) => {
        const prev = recentRevenues[i];
        return prev > 0 ? (r - prev) / prev : 0;
      });
      growthRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    }

    // Build forecast with 3 scenarios
    const scenarios: { month: string; optimistic: number; baseline: number; conservative: number; historical?: number }[] = [];

    // Add historical months
    monthlyTrend.forEach(m => {
      scenarios.push({
        month: m.month,
        historical: totalMRR > 0 ? m.revenue + (totalMRR - m.revenue) * 0.8 : m.revenue,
        optimistic: 0,
        baseline: 0,
        conservative: 0,
      });
    });

    let baseMRR = totalMRR;
    let optimisticMRR = totalMRR;
    let conservativeMRR = totalMRR;

    for (let i = 1; i <= months; i++) {
      const futureMonth = addMonths(new Date(), i);
      const label = format(futureMonth, 'MMM yyyy');

      // Baseline: current growth rate minus churn
      baseMRR = baseMRR * (1 + growthRate - monthlyChurn) + avgNewSubsPerMonth * avgRevenuePerSub * 0.5;
      // Optimistic: 1.5x growth, 0.5x churn
      optimisticMRR = optimisticMRR * (1 + growthRate * 1.5 - monthlyChurn * 0.5) + avgNewSubsPerMonth * avgRevenuePerSub;
      // Conservative: 0.5x growth, 1.5x churn
      conservativeMRR = conservativeMRR * (1 + growthRate * 0.5 - monthlyChurn * 1.5) + avgNewSubsPerMonth * avgRevenuePerSub * 0.25;

      scenarios.push({
        month: label,
        baseline: Math.max(0, Math.round(baseMRR)),
        optimistic: Math.max(0, Math.round(optimisticMRR)),
        conservative: Math.max(0, Math.round(conservativeMRR)),
      });
    }

    const finalBaseline = scenarios[scenarios.length - 1]?.baseline || 0;
    const projectedARR = finalBaseline * 12;
    const revenueGrowth = totalMRR > 0 ? (((finalBaseline - totalMRR) / totalMRR) * 100).toFixed(0) : '0';

    return { scenarios, projectedARR, finalBaseline, revenueGrowth, avgRevenuePerSub, avgNewSubsPerMonth, growthRate };
  }, [monthlyTrend, totalMRR, forecastMonths, churnRate, active, paidActive]);

  // Overdue: active subs where period_end is past
  const overdue = active.filter(s => s.current_period_end && new Date(s.current_period_end) < new Date());

  const filtered = subscriptions?.filter(s => {
    const matchesSearch = s.employer?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Revenue & Forecasting">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Monthly Revenue (MRR)" value={`$${totalMRR.toLocaleString()}`} icon={DollarSign} variant="success" />
        <StatsCard title="Paid Subscribers" value={paidActive.length} icon={TrendingUp} />
        <StatsCard title="Churn Rate" value={`${churnRate}%`} icon={TrendingDown} variant={Number(churnRate) > 10 ? 'destructive' : 'default'} />
        <StatsCard title="Overdue Payments" value={overdue.length} icon={AlertTriangle} variant={overdue.length > 0 ? 'warning' : 'default'} />
      </div>

      {/* Revenue Forecasting Section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Card className="border-border/40 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Revenue Forecast</CardTitle>
                  <CardDescription className="text-xs">Projected MRR with optimistic, baseline & conservative scenarios</CardDescription>
                </div>
              </div>
              <div className="flex gap-1">
                {(['3', '6', '12'] as const).map(m => (
                  <Button
                    key={m}
                    variant={forecastMonths === m ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-lg"
                    onClick={() => setForecastMonths(m)}
                  >
                    {m}mo
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Forecast KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Projected MRR',
                  value: `$${forecastData.finalBaseline.toLocaleString()}`,
                  sub: `in ${forecastMonths} months`,
                  icon: Target,
                  color: 'text-primary bg-primary/10',
                },
                {
                  label: 'Projected ARR',
                  value: `$${forecastData.projectedARR.toLocaleString()}`,
                  sub: 'annualized',
                  icon: DollarSign,
                  color: 'text-emerald-500 bg-emerald-500/10',
                },
                {
                  label: 'MRR Growth',
                  value: `${forecastData.revenueGrowth}%`,
                  sub: `over ${forecastMonths}mo`,
                  icon: Number(forecastData.revenueGrowth) >= 0 ? ArrowUpRight : TrendingDown,
                  color: Number(forecastData.revenueGrowth) >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-destructive bg-destructive/10',
                },
                {
                  label: 'Avg Revenue/Sub',
                  value: `$${forecastData.avgRevenuePerSub.toFixed(0)}`,
                  sub: 'per month',
                  icon: Users,
                  color: 'text-primary bg-primary/10',
                },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card className="border-border/30 bg-card/80">
                    <CardContent className="p-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", kpi.color)}>
                        <kpi.icon className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</p>
                      <p className="text-lg font-bold text-foreground tabular-nums">{kpi.value}</p>
                      <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Forecast Chart */}
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.scenarios} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="optimisticGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2, 160 60% 45%))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2, 160 60% 45%))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="conservativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine x={monthlyTrend[monthlyTrend.length - 1]?.month} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Today', position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Area type="monotone" dataKey="historical" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" strokeWidth={2} name="Historical" dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="optimistic" stroke="hsl(var(--chart-2, 160 60% 45%))" fill="url(#optimisticGrad)" strokeWidth={2} strokeDasharray="6 3" name="Optimistic" dot={false} />
                  <Area type="monotone" dataKey="baseline" stroke="hsl(var(--primary))" fill="url(#baselineGrad)" strokeWidth={2.5} name="Baseline" dot={false} />
                  <Area type="monotone" dataKey="conservative" stroke="hsl(var(--destructive))" fill="url(#conservativeGrad)" strokeWidth={2} strokeDasharray="6 3" name="Conservative" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Assumptions */}
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Calendar className="w-3 h-3" />
                Growth rate: {(forecastData.growthRate * 100).toFixed(1)}%/mo
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                Monthly churn: {(parseFloat(churnRate) / 12).toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                ~{forecastData.avgNewSubsPerMonth.toFixed(1)} new subs/mo avg
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Existing Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Trend (6mo)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="newSubs" stroke="hsl(var(--primary))" strokeWidth={2} name="New Subs" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Revenue/mo</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Period End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.employer?.company_name}</TableCell>
                    <TableCell>{sub.plan?.name}</TableCell>
                    <TableCell>${sub.plan?.price_monthly || 0}</TableCell>
                    <TableCell className="capitalize">{sub.billing_cycle || '-'}</TableCell>
                    <TableCell>
                      {sub.status === 'active' ? (
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      ) : sub.cancelled_at ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : (
                        <Badge variant="secondary">{sub.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.current_period_end ? (
                        <span className={new Date(sub.current_period_end) < new Date() ? 'text-destructive font-medium' : ''}>
                          {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
