import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

interface LocationContextType {
  latitude: number | null;
  longitude: number | null;
}

const LocationContext = createContext<LocationContextType>({ latitude: null, longitude: null });

export const useLocationGate = () => useContext(LocationContext);

export const LocationGate = ({ children }: { children: ReactNode }) => {
  const [coords, setCoords] = useState<LocationContextType>({ latitude: null, longitude: null });

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        // Location denied — app continues with null coords
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  return (
    <LocationContext.Provider value={coords}>
      {children}
    </LocationContext.Provider>
  );
};
