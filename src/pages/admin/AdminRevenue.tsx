import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Banknote, TrendingUp, TrendingDown, Users, Search, AlertTriangle,
  ArrowUpRight, Target, Sparkles, Calendar, Download, Building2,
  CheckCircle, XCircle, Clock, Crown, Zap, Shield, Star,
  ChevronRight, DollarSign, PieChart, BarChart3, Info,
} from 'lucide-react';
import { format, subMonths, addMonths, formatDistanceToNow } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart, Legend, ReferenceLine,
  PieChart as RPieChart, Pie, Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 280 65% 60%))',
  'hsl(var(--chart-4, 40 80% 55%))',
  'hsl(var(--chart-5, 200 70% 50%))',
];

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, sub, gradient, trend }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  gradient: string; trend?: { value: string; positive: boolean };
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={`absolute inset-0 ${gradient} opacity-[0.07]`} />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <div className="flex items-center gap-2">
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                {trend && (
                  <Badge variant="outline" className={cn("text-[10px] gap-0.5 px-1.5",
                    trend.positive ? "text-emerald-600 border-emerald-500/30" : "text-destructive border-destructive/30"
                  )}>
                    {trend.positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {trend.value}
                  </Badge>
                )}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Status Badge ───
function StatusBadge({ status, cancelledAt }: { status: string; cancelledAt?: string | null }) {
  if (status === 'active') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
  if (cancelledAt || status === 'cancelled') return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
  if (status === 'expired') return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
  return <Badge variant="outline" className="gap-1 capitalize">{status}</Badge>;
}

// ─── Plan Icon ───
function PlanIcon({ name }: { name: string }) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('enterprise') || lower.includes('premium')) return <Crown className="h-4 w-4 text-amber-500" />;
  if (lower.includes('pro') || lower.includes('business')) return <Zap className="h-4 w-4 text-primary" />;
  if (lower.includes('free') || lower.includes('starter')) return <Shield className="h-4 w-4 text-muted-foreground" />;
  return <Star className="h-4 w-4 text-primary" />;
}

export default function AdminRevenue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [forecastMonths, setForecastMonths] = useState<'3' | '6' | '12'>('6');

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-revenue-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_subscriptions')
        .select(`*, employer:employers!employer_subscriptions_employer_id_fkey(id, company_name), plan:employer_plans!employer_subscriptions_plan_id_fkey(id, name, price_monthly, price_yearly)`)
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
  const overdue = active.filter(s => s.current_period_end && new Date(s.current_period_end) < new Date());

  // Revenue by plan breakdown
  const planBreakdown = active.reduce<Record<string, { count: number; revenue: number }>>((acc, s) => {
    const name = s.plan?.name || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, revenue: 0 };
    acc[name].count++;
    acc[name].revenue += s.plan?.price_monthly || 0;
    return acc;
  }, {});

  const barChartData = Object.entries(planBreakdown).map(([name, data]) => ({
    name, revenue: data.revenue, count: data.count,
  }));

  const pieChartData = Object.entries(planBreakdown).map(([name, data]) => ({
    name, value: data.count,
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
      short: format(month, 'MMM'),
      newSubs: monthSubs.length,
      revenue: monthSubs.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0),
    };
  });

  // === REVENUE FORECASTING ===
  const forecastData = useMemo(() => {
    const months = parseInt(forecastMonths);
    const churnRateNum = parseFloat(churnRate) / 100;
    const monthlyChurn = churnRateNum / 12;
    const historicalSubs = monthlyTrend.map(m => m.newSubs);
    const avgNewSubsPerMonth = historicalSubs.reduce((a, b) => a + b, 0) / historicalSubs.length;
    const avgRevenuePerSub = active.length > 0
      ? active.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0) / active.length : 0;

    const recentRevenues = monthlyTrend.slice(-3).map(m => m.revenue);
    let growthRate = 0;
    if (recentRevenues.length >= 2) {
      const rates = recentRevenues.slice(1).map((r, i) => {
        const prev = recentRevenues[i];
        return prev > 0 ? (r - prev) / prev : 0;
      });
      growthRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    }

    const scenarios: { month: string; optimistic: number; baseline: number; conservative: number; historical?: number }[] = [];
    monthlyTrend.forEach(m => {
      scenarios.push({
        month: m.short,
        historical: totalMRR > 0 ? m.revenue + (totalMRR - m.revenue) * 0.8 : m.revenue,
        optimistic: 0, baseline: 0, conservative: 0,
      });
    });

    let baseMRR = totalMRR, optimisticMRR = totalMRR, conservativeMRR = totalMRR;
    for (let i = 1; i <= months; i++) {
      const futureMonth = addMonths(new Date(), i);
      baseMRR = baseMRR * (1 + growthRate - monthlyChurn) + avgNewSubsPerMonth * avgRevenuePerSub * 0.5;
      optimisticMRR = optimisticMRR * (1 + growthRate * 1.5 - monthlyChurn * 0.5) + avgNewSubsPerMonth * avgRevenuePerSub;
      conservativeMRR = conservativeMRR * (1 + growthRate * 0.5 - monthlyChurn * 1.5) + avgNewSubsPerMonth * avgRevenuePerSub * 0.25;
      scenarios.push({
        month: format(futureMonth, 'MMM'),
        baseline: Math.max(0, Math.round(baseMRR)),
        optimistic: Math.max(0, Math.round(optimisticMRR)),
        conservative: Math.max(0, Math.round(conservativeMRR)),
      });
    }

    const finalBaseline = scenarios[scenarios.length - 1]?.baseline || 0;
    const projectedARR = finalBaseline * 12;
    const revenueGrowth = totalMRR > 0 ? (((finalBaseline - totalMRR) / totalMRR) * 100).toFixed(0) : '0';
    return { scenarios, projectedARR, finalBaseline, revenueGrowth, avgRevenuePerSub, avgNewSubsPerMonth, growthRate };
  }, [monthlyTrend, totalMRR, forecastMonths, churnRate, active]);

  const filtered = subscriptions?.filter(s => {
    const matchesSearch = s.employer?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (!filtered?.length) return;
    const headers = ['Company', 'Plan', 'Revenue/mo', 'Billing', 'Status', 'Since', 'Period End'];
    const rows = filtered.map(s => [
      s.employer?.company_name || '', s.plan?.name || '', `$${s.plan?.price_monthly || 0}`,
      s.billing_cycle || 'monthly', s.status,
      format(new Date(s.created_at), 'yyyy-MM-dd'),
      s.current_period_end ? format(new Date(s.current_period_end), 'yyyy-MM-dd') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `revenue-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Revenue data exported');
  };

  return (
    <AdminLayout title="Revenue & Forecasting">
      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Monthly Revenue (MRR)" value={`$${totalMRR.toLocaleString()}`}
          sub={`${paidActive.length} paid subscribers`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard icon={TrendingUp} label="Paid Subscribers" value={paidActive.length}
          sub={`${active.length} total active`}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={paidActive.length > 0 ? { value: `${paidActive.length}`, positive: true } : undefined} />
        <StatCard icon={TrendingDown} label="Churn Rate" value={`${churnRate}%`}
          sub={`${cancelled.length} cancelled`}
          gradient={Number(churnRate) > 10 ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-violet-500 to-violet-600"} />
        <StatCard icon={AlertTriangle} label="Overdue Payments" value={overdue.length}
          sub={overdue.length > 0 ? 'Action needed' : 'All clear'}
          gradient={overdue.length > 0 ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-slate-500 to-slate-600"} />
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" />Overview
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />Forecast
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />Subscribers
            <Badge variant="secondary" className="text-xs ml-1">{subscriptions?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue by Plan */}
            <Card className="lg:col-span-2 border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />Revenue by Plan
                </CardTitle>
                <CardDescription className="text-xs">Monthly revenue breakdown per subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                {barChartData.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    No revenue data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barChartData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Plan Distribution Pie */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />Plan Distribution
                </CardTitle>
                <CardDescription className="text-xs">Active subscribers by plan</CardDescription>
              </CardHeader>
              <CardContent>
                {pieChartData.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    No data
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <RPieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                          paddingAngle={3} dataKey="value" stroke="none">
                          {pieChartData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </RPieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {pieChartData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                          <span className="font-semibold text-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card className="lg:col-span-3 border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />Monthly Subscription Trend
                </CardTitle>
                <CardDescription className="text-xs">New subscribers and revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="short" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="newSubs" stroke="hsl(var(--primary))" fill="url(#trendGrad)" strokeWidth={2.5} name="New Subscribers" />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2, 160 60% 45%))" strokeWidth={2} dot={{ r: 3 }} name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Forecast Tab ─── */}
        <TabsContent value="forecast">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border shadow-sm overflow-hidden">
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
                  <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                    {(['3', '6', '12'] as const).map(m => (
                      <Button key={m} variant={forecastMonths === m ? 'default' : 'ghost'}
                        size="sm" className="h-7 px-3 text-xs rounded-md"
                        onClick={() => setForecastMonths(m)}>
                        {m} mo
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Forecast KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Projected MRR', value: `$${forecastData.finalBaseline.toLocaleString()}`, sub: `in ${forecastMonths} months`, icon: Target, color: 'text-primary bg-primary/10' },
                    { label: 'Projected ARR', value: `$${forecastData.projectedARR.toLocaleString()}`, sub: 'annualized', icon: Banknote, color: 'text-emerald-600 bg-emerald-500/10' },
                    { label: 'MRR Growth', value: `${forecastData.revenueGrowth}%`, sub: `over ${forecastMonths}mo`, icon: Number(forecastData.revenueGrowth) >= 0 ? ArrowUpRight : TrendingDown, color: Number(forecastData.revenueGrowth) >= 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-destructive bg-destructive/10' },
                    { label: 'Avg Revenue/Sub', value: `$${forecastData.avgRevenuePerSub.toFixed(0)}`, sub: 'per month', icon: Users, color: 'text-primary bg-primary/10' },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                      <Card className="border-border/30 bg-card/80 hover:shadow-md transition-shadow">
                        <CardContent className="p-3.5">
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
                <div className="h-[340px]">
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
                      <ReferenceLine x={monthlyTrend[monthlyTrend.length - 1]?.short} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
                        label={{ value: 'Today', position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Area type="monotone" dataKey="historical" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" strokeWidth={2} name="Historical" dot={false} connectNulls={false} />
                      <Area type="monotone" dataKey="optimistic" stroke="hsl(var(--chart-2, 160 60% 45%))" fill="url(#optimisticGrad)" strokeWidth={2} strokeDasharray="6 3" name="Optimistic" dot={false} />
                      <Area type="monotone" dataKey="baseline" stroke="hsl(var(--primary))" fill="url(#baselineGrad)" strokeWidth={2.5} name="Baseline" dot={false} />
                      <Area type="monotone" dataKey="conservative" stroke="hsl(var(--destructive))" fill="url(#conservativeGrad)" strokeWidth={2} strokeDasharray="6 3" name="Conservative" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Assumptions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                          <Info className="w-3 h-3" />Assumptions
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs max-w-xs">
                        Forecasts are based on historical growth patterns, current churn rate, and average subscriber revenue. Actual results may vary.
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Calendar className="w-3 h-3" />Growth: {(forecastData.growthRate * 100).toFixed(1)}%/mo
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    Churn: {(parseFloat(churnRate) / 12).toFixed(1)}%/mo
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    ~{forecastData.avgNewSubsPerMonth.toFixed(1)} new subs/mo
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Subscribers Tab ─── */}
        <TabsContent value="subscribers">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Subscriber Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">All employer subscriptions and billing info</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search company..." value={search}
                    onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-52" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={exportCSV} disabled={!filtered?.length}>
                  <Download className="h-4 w-4" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : filtered?.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No subscriptions found</p>
                  <p className="text-sm">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                      <AnimatePresence>
                        {filtered?.map((sub, i) => (
                          <motion.tr key={sub.id}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{sub.employer?.company_name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PlanIcon name={sub.plan?.name || ''} />
                                <span className="font-medium text-sm">{sub.plan?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-foreground tabular-nums">${sub.plan?.price_monthly || 0}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize font-normal">
                                {sub.billing_cycle || 'monthly'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={sub.status} cancelledAt={sub.cancelled_at} />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">{format(new Date(sub.created_at), 'MMM d, yyyy')}</p>
                            </TableCell>
                            <TableCell>
                              {sub.current_period_end ? (
                                <span className={cn("text-sm",
                                  new Date(sub.current_period_end) < new Date()
                                    ? 'text-destructive font-semibold'
                                    : 'text-foreground'
                                )}>
                                  {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                                  {new Date(sub.current_period_end) < new Date() && (
                                    <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">Overdue</Badge>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
              {filtered && filtered.length > 0 && (
                <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                  Showing {filtered.length} of {subscriptions?.length || 0} subscriptions
                  {statusFilter !== 'all' && <span> · Filtered by: <span className="font-medium capitalize">{statusFilter}</span></span>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
