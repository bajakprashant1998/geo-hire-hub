export function useGoogleMapsKey() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('CRITICAL: VITE_GOOGLE_MAPS_API_KEY is not set in environment variables.');
  }

  return {
    apiKey: apiKey || null,
    loading: false,
    error: apiKey ? null : 'VITE_GOOGLE_MAPS_API_KEY is missing'
  };
}
