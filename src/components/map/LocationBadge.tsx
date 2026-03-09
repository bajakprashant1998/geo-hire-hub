import { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LocationBadgeProps {
  latitude: number | null;
  longitude: number | null;
  className?: string;
}

export const LocationBadge = ({ latitude, longitude, className }: LocationBadgeProps) => {
  const [cityName, setCityName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) {
      setCityName(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      { signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        const city = data.address?.city || 
                     data.address?.town || 
                     data.address?.village ||
                     data.address?.state_district ||
                     data.address?.state ||
                     'Near you';
        setCityName(city);
      })
      .catch(() => {
        setCityName('Near you');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [latitude, longitude]);

  if (!latitude || !longitude) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "bg-success/10 border border-success/20",
          "text-xs font-medium text-success",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <MapPin className="w-3 h-3" />
            <span className="max-w-[100px] truncate">{cityName}</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LocationBadge;
