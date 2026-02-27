import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ChevronRight, Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NearbyCompaniesProps {
  userLocation: { lat: number; lng: number } | null;
  radius: number;
}

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const NearbyCompanies = ({ userLocation, radius }: NearbyCompaniesProps) => {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['nearby-companies', userLocation?.lat, userLocation?.lng, radius],
    queryFn: async () => {
      if (!userLocation) return [];

      const { data, error } = await supabase
        .from('employers')
        .select(`
          id, company_name, industry, team_size, is_government,
          verification_status, location_city,
          profiles!inner(latitude, longitude, avatar_url)
        `)
        .not('profiles.latitude', 'is', null)
        .not('profiles.longitude', 'is', null)
        .limit(50);

      if (error || !data) return [];

      return data
        .map((e: any) => ({
          id: e.id,
          company_name: e.company_name,
          industry: e.industry,
          team_size: e.team_size,
          is_government: e.is_government,
          verified: e.verification_status === 'approved',
          city: e.location_city,
          avatar_url: e.profiles?.avatar_url,
          distance_km: haversine(userLocation.lat, userLocation.lng, e.profiles.latitude, e.profiles.longitude),
        }))
        .filter((c: any) => c.distance_km <= radius)
        .sort((a: any, b: any) => a.distance_km - b.distance_km)
        .slice(0, 15);
    },
    enabled: !!userLocation,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 p-3 rounded-xl">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground">No companies found nearby</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-1 p-1">
        {companies.map((company: any, i: number) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              to={`/employers/${company.id}`}
              className="group flex items-center gap-3 p-3 rounded-xl border border-border/15 hover:border-primary/25 bg-card/30 hover:bg-card/70 transition-all"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                company.is_government
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-primary/10 text-primary"
              )}>
                {company.avatar_url ? (
                  <img src={company.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  company.company_name?.charAt(0)?.toUpperCase() || 'C'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {company.company_name}
                  </p>
                  {company.verified && <Shield className="w-3 h-3 text-emerald-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {company.industry && (
                    <span className="text-[10px] text-muted-foreground truncate">{company.industry}</span>
                  )}
                  {company.team_size && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 gap-0.5 border-0">
                      <Users className="w-2.5 h-2.5" />
                      {company.team_size}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {company.distance_km.toFixed(1)}km
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-all" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
};