import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { MapPin, Loader2, Shield, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
}

const LocationContext = createContext<LocationContextType>({ latitude: null, longitude: null });

export const useLocationGate = () => useContext(LocationContext);

type PermState = 'loading' | 'granted' | 'denied' | 'prompt';

export const LocationGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PermState>('loading');
  const [coords, setCoords] = useState<LocationContextType>({ latitude: null, longitude: null });

  const requestLocation = useCallback(() => {
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setState('granted');
      },
      () => {
        setState('denied');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState('denied');
      return;
    }

    // Try to listen to permission changes
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        requestLocation();
      } else if (result.state === 'denied') {
        setState('denied');
      } else {
        // prompt – trigger the browser prompt
        requestLocation();
      }

      result.addEventListener('change', () => {
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'denied') {
          setState('denied');
        }
      });
    }).catch(() => {
      // Fallback if permissions API not available
      requestLocation();
    });
  }, [requestLocation]);

  if (state === 'granted') {
    return (
      <LocationContext.Provider value={coords}>
        {children}
      </LocationContext.Provider>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 max-w-md w-full mx-4"
        >
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-8 text-center space-y-6">
            {/* Icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg">
                {state === 'loading' ? (
                  <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
                ) : (
                  <MapPin className="w-9 h-9 text-primary-foreground" />
                )}
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {state === 'loading' ? 'Detecting Location...' : 'Location Access Required'}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {state === 'loading'
                  ? 'Please allow location access when prompted by your browser.'
                  : 'Location access is required to use this website. Please enable location services to continue.'}
              </p>
            </div>

            {/* Action */}
            {state === 'denied' && (
              <div className="space-y-4">
                <Button
                  onClick={requestLocation}
                  className="w-full h-12 text-base font-semibold rounded-xl gap-2"
                  size="lg"
                >
                  <Navigation className="w-5 h-5" />
                  Enable Location Access
                </Button>

                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">How to enable:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 text-left list-decimal list-inside">
                    <li>Click the lock/info icon in your browser address bar</li>
                    <li>Find "Location" and set it to "Allow"</li>
                    <li>Refresh the page or click the button above</li>
                  </ol>
                </div>
              </div>
            )}

            {state === 'loading' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for permission...
              </div>
            )}

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Your location is used only for job matching</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
