import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Eye, Trash2, Search, Bell, BellOff, Briefcase, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface WatchlistItem {
  id: string;
  employer_id: string;
  created_at: string;
  employers: {
    id: string;
    company_name: string;
    industry: string | null;
    location_city: string | null;
    location_country: string | null;
    slug: string | null;
    description: string | null;
    team_size: string | null;
  };
}

interface CompanyWatchlistProps {
  candidateId: string;
}

export const CompanyWatchlist = ({ candidateId }: CompanyWatchlistProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['company-watchlist', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_watchlist')
        .select('*, employers(id, company_name, industry, location_city, location_country, slug, description, team_size)')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as WatchlistItem[];
    },
    enabled: !!candidateId,
  });

  // Get job counts for watched companies
  const { data: jobCounts } = useQuery({
    queryKey: ['watchlist-job-counts', watchlist?.map(w => w.employer_id)],
    queryFn: async () => {
      if (!watchlist?.length) return {};
      const ids = watchlist.map(w => w.employer_id);
      const { data } = await supabase
        .from('jobs')
        .select('employer_id')
        .in('employer_id', ids)
        .eq('is_active', true)
        .eq('status', 'open');
      const counts: Record<string, number> = {};
      data?.forEach(j => { counts[j.employer_id] = (counts[j.employer_id] || 0) + 1; });
      return counts;
    },
    enabled: !!watchlist?.length,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_watchlist').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-watchlist'] });
      toast.success('Company removed from watchlist');
    },
  });

  const filtered = watchlist?.filter(w =>
    !search || w.employers?.company_name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Company Watchlist
          </h2>
          <p className="text-xs text-muted-foreground">Follow companies and get notified when they post new jobs</p>
        </div>
        <Badge variant="secondary" className="text-xs">{watchlist?.length || 0} following</Badge>
      </div>

      {watchlist && watchlist.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No matching companies found' : 'No companies in your watchlist yet'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Visit employer profiles and click "Follow" to add companies here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {filtered.map((item, i) => {
              const emp = item.employers;
              const openJobs = jobCounts?.[item.employer_id] || 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                            {emp?.company_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{emp?.company_name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {emp?.industry && (
                              <span className="text-[10px] text-muted-foreground">{emp.industry}</span>
                            )}
                            {emp?.location_city && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />{emp.location_city}
                              </span>
                            )}
                            {emp?.team_size && (
                              <span className="text-[10px] text-muted-foreground">{emp.team_size} employees</span>
                            )}
                          </div>
                          {emp?.description && (
                            <p className="text-[11px] text-muted-foreground/70 mt-1.5 line-clamp-2">{emp.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {openJobs > 0 ? (
                              <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0">
                                <Briefcase className="h-2.5 w-2.5" /> {openJobs} open job{openJobs > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">No open jobs</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => emp?.slug && navigate(`/employers/${emp.slug}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
