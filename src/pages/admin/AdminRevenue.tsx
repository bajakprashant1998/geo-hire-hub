import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/admin/StatsCard';
import { DollarSign, TrendingUp, TrendingDown, Users, Search, AlertTriangle } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

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

export default function AdminRevenue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Overdue: active subs where period_end is past
  const overdue = active.filter(s => s.current_period_end && new Date(s.current_period_end) < new Date());

  const filtered = subscriptions?.filter(s => {
    const matchesSearch = s.employer?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Employer Revenue">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Monthly Revenue (MRR)" value={`$${totalMRR.toLocaleString()}`} icon={DollarSign} variant="success" />
        <StatsCard title="Paid Subscribers" value={paidActive.length} icon={TrendingUp} />
        <StatsCard title="Churn Rate" value={`${churnRate}%`} icon={TrendingDown} variant={Number(churnRate) > 10 ? 'destructive' : 'default'} />
        <StatsCard title="Overdue Payments" value={overdue.length} icon={AlertTriangle} variant={overdue.length > 0 ? 'warning' : 'default'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Plan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
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
                <Tooltip />
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
