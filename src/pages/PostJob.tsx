import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Briefcase, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Audition'];

const PostJob = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);

  // Fetch employer ID
  useEffect(() => {
    const fetchEmployer = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('employers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (data) {
        setEmployerId(data.id);
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
      const { error } = await supabase.from('jobs').insert({
        employer_id: employerId,
        title,
        description,
        salary_range: salaryRange,
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
                  <Input
                    id="title"
                    placeholder="e.g., Senior React Developer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    placeholder="e.g., ₹15L - ₹25L per annum"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                  />
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
                      ? `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
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
