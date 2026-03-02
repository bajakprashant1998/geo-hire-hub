import { APIProvider } from '@vis.gl/react-google-maps';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { Loader2, MapPin } from 'lucide-react';

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const { apiKey, error } = useGoogleMapsKey();

  if (error || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center p-8 rounded-2xl bg-card shadow-lg border border-border/30">
          <MapPin className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-semibold">Map unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">{error || 'API key missing'}</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'visualization']}>
      {children}
    </APIProvider>
  );
};
