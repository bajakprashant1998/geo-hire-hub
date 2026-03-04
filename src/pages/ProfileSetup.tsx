import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobCategorySearch } from '@/components/JobCategorySearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus, X, MapPin, Briefcase, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { PhotoUpload } from '@/components/PhotoUpload';

const industries = [
  'Technology',
  'Media & Entertainment',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Other',
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading, refreshProfile } = useAuth();
  const geolocation = useGeolocation();

  useEffect(() => {
    if (!authLoading && !profileLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, profileLoading, user, navigate]);

  // Profile photo
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url || '');

  // Candidate fields
  const [jobTitle, setJobTitle] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [bio, setBio] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');

  // Employer fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addPortfolioUrl = () => {
    if (newPortfolioUrl.trim() && !portfolioUrls.includes(newPortfolioUrl.trim())) {
      setPortfolioUrls([...portfolioUrls, newPortfolioUrl.trim()]);
      setNewPortfolioUrl('');
    }
  };

  const removePortfolioUrl = (url: string) => {
    setPortfolioUrls(portfolioUrls.filter((u) => u !== url));
  };

  const handlePhotoUploaded = (url: string) => {
    setAvatarUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast.error('Please sign in first');
      return;
    }

    if (isCandidate && !jobTitle.trim()) {
      toast.error('Please enter your job title');
      return;
    }
    if (!isCandidate && !companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }

    setLoading(true);

    try {
      // Update profile with location and avatar
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          latitude: geolocation.latitude,
          longitude: geolocation.longitude,
          avatar_url: avatarUrl || null,
          profile_completed: true,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      if (profile.user_type === 'candidate') {
        // Create candidate record
        const { error: candidateError } = await supabase
          .from('candidates')
          .upsert({
            profile_id: profile.id,
            job_title: jobTitle,
            experience_years: parseInt(experienceYears),
            skills,
            bio,
            expected_salary: expectedSalary,
            portfolio_urls: portfolioUrls,
          }, { onConflict: 'profile_id' });

        if (candidateError) throw candidateError;
      } else {
        // Create employer record
        const { error: employerError } = await supabase
          .from('employers')
          .upsert({
            profile_id: profile.id,
            company_name: companyName,
            industry,
            website_url: websiteUrl,
            description,
          }, { onConflict: 'profile_id' });

        if (employerError) throw employerError;
      }

      await refreshProfile();
      toast.success('Profile completed successfully!');
      navigate(profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-profile');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  const isCandidate = profile?.user_type === 'candidate';

  return (
    <div className="min-h-screen bg-secondary py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
            {isCandidate ? (
              <Briefcase className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Building2 className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            {isCandidate
              ? 'Tell employers about yourself to appear on the map'
              : 'Add your company details to start posting jobs'}
          </p>
        </div>

        {/* Profile Photo Upload */}
        {user && (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Profile Photo</CardTitle>
              <CardDescription>Add a photo to help others recognize you</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <PhotoUpload
                userId={user.id}
                currentPhotoUrl={avatarUrl}
                onPhotoUploaded={handlePhotoUploaded}
                size="lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Location Status */}
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${geolocation.latitude
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning-foreground'
            }`}
        >
          <MapPin className="w-5 h-5" />
          <span>
            {geolocation.loading
              ? 'Detecting your location...'
              : geolocation.latitude
                ? 'Location captured - you will appear on the map'
                : 'Enable location to appear on the map'}
          </span>
        </div>

        {/* Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{isCandidate ? 'Candidate Profile' : 'Company Profile'}</CardTitle>
            <CardDescription>
              {isCandidate
                ? 'Add your skills and experience to attract employers'
                : 'Add your company information to post jobs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isCandidate ? (
                <>
                  {/* Job Title */}
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title / Role *</Label>
                    <JobCategorySearch
                      value={jobTitle}
                      onChange={setJobTitle}
                      placeholder="e.g., Full Stack Developer, Actor, Designer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Search from 12,000+ job categories
                    </p>
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Select value={experienceYears} onValueChange={setExperienceYears}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '10+'].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year === 0 ? 'Fresher' : year === '10+' ? '10+ years' : `${year} years`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" variant="secondary" onClick={addSkill}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell employers about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Expected Salary */}
                  <div className="space-y-2">
                    <Label htmlFor="salary">Expected Salary</Label>
                    <Input
                      id="salary"
                      placeholder="e.g., ₹5L - ₹10L per annum"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                    />
                  </div>

                  {/* Portfolio URLs */}
                  <div className="space-y-2">
                    <Label>Portfolio / Work Samples</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a link (e.g., GitHub, Portfolio)"
                        value={newPortfolioUrl}
                        onChange={(e) => setNewPortfolioUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPortfolioUrl())}
                      />
                      <Button type="button" variant="secondary" onClick={addPortfolioUrl}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 mt-2">
                      {portfolioUrls.map((url) => (
                        <div
                          key={url}
                          className="flex items-center justify-between bg-secondary p-2 rounded text-sm"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-xs"
                          >
                            {url}
                          </a>
                          <button type="button" onClick={() => removePortfolioUrl(url)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={industry} onValueChange={setIndustry} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell candidates about your company..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Profile'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
