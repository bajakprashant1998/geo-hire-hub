import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Briefcase, Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JobCategorySearch } from '@/components/JobCategorySearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Audition'];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
];

// Map country codes to currencies
const countryCurrencyMap: Record<string, string> = {
  US: 'USD', CA: 'CAD', MX: 'MXN',
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR',
  CH: 'CHF',
  SE: 'SEK', NO: 'NOK', DK: 'EUR',
  PL: 'PLN', RU: 'RUB', TR: 'TRY',
  IN: 'INR', PK: 'PKR', BD: 'BDT',
  CN: 'CNY', JP: 'JPY', KR: 'KRW', TW: 'TWD', HK: 'HKD',
  SG: 'SGD', MY: 'MYR', TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND',
  AU: 'AUD', NZ: 'NZD',
  AE: 'AED', SA: 'SAR', IL: 'ILS', EG: 'EGP',
  ZA: 'ZAR', NG: 'NGN',
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
};

const PostJob = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [jobType, setJobType] = useState('Full-time');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Reverse geocode to detect country from coordinates
  const detectCurrencyFromLocation = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'GeoHireHub/1.0' } }
      );
      const data = await response.json();
      const countryCode = data.address?.country_code?.toUpperCase();
      
      if (countryCode) {
        setDetectedCountry(data.address?.country || countryCode);
        const detectedCurrency = countryCurrencyMap[countryCode];
        if (detectedCurrency && currencies.some(c => c.code === detectedCurrency)) {
          setCurrency(detectedCurrency);
          toast.success(`Currency set to ${detectedCurrency} for ${data.address?.country || countryCode}`);
        }
      }
    } catch (error) {
      console.error('Failed to detect location:', error);
    }
  };

  const generateDescription = async () => {
    if (!title.trim()) {
      toast.error('Please enter a job title first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ jobTitle: title, jobType }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description');
      }

      setDescription(data.description);
      toast.success('Description generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  // State for employer verification
  const [canPost, setCanPost] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // Fetch employer ID and check posting eligibility
  useEffect(() => {
    const fetchEmployer = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('employers')
        .select('id, verification_status, profile_completeness, terms_accepted_at')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (data) {
        setEmployerId(data.id);
        
        // Check posting eligibility
        if (data.profile_completeness < 100) {
          setCanPost(false);
          setBlockReason('Complete your company profile to 100% before posting jobs.');
        } else if (data.verification_status !== 'approved') {
          setCanPost(false);
          setBlockReason('Your company profile is pending admin approval. You can post jobs once approved.');
        } else if (!data.terms_accepted_at) {
          setCanPost(false);
          setBlockReason('Please accept the platform terms in your company profile settings.');
        } else {
          setCanPost(true);
          setBlockReason(null);
        }
      } else if (error) {
        console.error('Error fetching employer:', error);
      }
    };

    fetchEmployer();
  }, [profile]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Click to place marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });
      
      // Auto-detect currency based on location
      detectCurrencyFromLocation(lat, lng);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background: hsl(4, 90%, 58%);
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
        }).addTo(map);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !employerId || !location) {
      toast.error('Please select a location on the map');
      return;
    }

    setLoading(true);

    try {
      // Format salary range with currency
      const selectedCurrency = currencies.find(c => c.code === currency);
      const formattedSalary = salaryMin || salaryMax 
        ? `${selectedCurrency?.symbol || ''}${salaryMin}${salaryMax ? ` - ${selectedCurrency?.symbol || ''}${salaryMax}` : ''} ${currency}`
        : null;

      const { error } = await supabase.from('jobs').insert({
        employer_id: employerId,
        title,
        description,
        salary_range: formattedSalary,
        job_type: jobType,
        latitude: location.lat,
        longitude: location.lng,
        status: 'open',
      });

      if (error) throw error;

      toast.success('Job posted successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.user_type !== 'employer') {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Only employers can post jobs.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canPost && blockReason) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Cannot Post Jobs Yet</h2>
            <p className="text-muted-foreground mb-4">{blockReason}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button onClick={() => navigate('/company-profile')}>
                Complete Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Post a New Job</h1>
            <p className="text-muted-foreground">Create a job listing to find candidates</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <Card className="shadow-google-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Job Details
              </CardTitle>
              <CardDescription>Fill in the job information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <JobCategorySearch
                    value={title}
                    onChange={setTitle}
                    placeholder="Search job category (e.g., Software Engineer, Nurse, AI Engineer...)"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI-powered suggestions from 30,000+ global job categories
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateDescription}
                      disabled={generatingDescription || !title.trim()}
                      className="gap-1.5"
                    >
                      {generatingDescription ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {generatingDescription ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Salary Range</Label>
                  <div className="flex gap-2">
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {currencies.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Min"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="flex-1"
                    />
                    <span className="flex items-center text-muted-foreground">-</span>
                    <Input
                      placeholder="Max"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    e.g., {currencies.find(c => c.code === currency)?.symbol}50,000 - {currencies.find(c => c.code === currency)?.symbol}75,000
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    location ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {location
                      ? `${detectedCountry ? detectedCountry + ' • ' : ''}${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                      : 'Click on the map to set job location'}
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !location}>
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Posting...' : 'Post Job'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="shadow-google-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-destructive" />
                Select Location
              </CardTitle>
              <CardDescription>Click on the map to set where this job is located</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={containerRef} className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PostJob;
