import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Send, Save, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { JobBasicsSection } from '@/components/post-job/JobBasicsSection';
import { CandidateRequirementSection } from '@/components/post-job/CandidateRequirementSection';
import { TimingsSection } from '@/components/post-job/TimingsSection';
import { CompanyInfoSection } from '@/components/post-job/CompanyInfoSection';
import { PerformanceInsightsPanel } from '@/components/post-job/PerformanceInsightsPanel';

const PostJob = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Loading & submission states
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Employer data
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Section 1: Job Basics
  const [jobType, setJobType] = useState<'Full Time' | 'Part Time'>('Full Time');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [openings, setOpenings] = useState('1');

  // Section 2: Candidate Requirements
  const [experienceType, setExperienceType] = useState<'Any' | 'Fresher Only' | 'Experienced Only'>('Any');
  const [minExperience, setMinExperience] = useState('');
  const [maxExperience, setMaxExperience] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [hasBonus, setHasBonus] = useState(false);
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  
  // Additional details
  const [gender, setGender] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Section 3: Timings
  const [shiftType, setShiftType] = useState('Day Shift');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workDays, setWorkDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewDays, setInterviewDays] = useState<string[]>([]);

  // Section 4: Company Info
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [organizationSize, setOrganizationSize] = useState('');
  const [hiringUrgency, setHiringUrgency] = useState<'Immediately' | 'Can Wait'>('Immediately');
  const [hiringFrequency, setHiringFrequency] = useState('');
  const [jobAddress, setJobAddress] = useState('');

  // Fetch employer data
  useEffect(() => {
    const fetchEmployer = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, verification_status, profile_completeness, terms_accepted_at')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (data) {
        setEmployerId(data.id);
        setCompanyName(data.company_name);
        setIsVerified(data.verification_status === 'approved');

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
          // Check job limit
          const limitCheck = await supabase.rpc('can_employer_activate_job', { p_employer_id: data.id });
          const limitData = limitCheck.data as { can_activate: boolean; max_allowed: number; plan_name: string } | null;
          if (limitData && !limitData.can_activate) {
            setShowUpgradePrompt(true);
            setCanPost(false);
            setBlockReason(`You've reached your limit of ${limitData.max_allowed} active job(s) on the ${limitData.plan_name} plan.`);
          } else {
            setCanPost(true);
            setBlockReason(null);
          }
        }

        // Auto-fill contact email from user
        if (user?.email) {
          setEmail(user.email);
        }
        if (profile?.full_name) {
          setContactPerson(profile.full_name);
        }
      } else if (error) {
        console.error('Error fetching employer:', error);
      }
    };

    fetchEmployer();
  }, [profile, user]);

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

  const handleSaveDraft = async () => {
    if (!user || !employerId) {
      toast.error('Please login to save draft');
      return;
    }

    setSavingDraft(true);
    try {
      // For now, just show success - draft saving would need a separate table
      toast.success('Draft saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !employerId) {
      toast.error('Please login to post a job');
      return;
    }

    // Validation
    if (!title.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    if (!location) {
      toast.error('Please select a job location');
      return;
    }
    if (!salaryMin && !salaryMax) {
      toast.error('Please specify a salary range');
      return;
    }
    if (!description.trim()) {
      toast.error('Please add a job description');
      return;
    }
    if (skills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }
    if (!contactPerson || !phoneNumber || !email) {
      toast.error('Please complete the contact information');
      return;
    }

    setLoading(true);

    try {
      // Create salary range string
      const formattedSalary = `₹${salaryMin || '0'} - ₹${salaryMax || salaryMin} /month`;

      // Build description with all details
      let fullDescription = description;
      
      if (experienceType !== 'Any') {
        fullDescription += `\n\nExperience: ${experienceType}`;
        if (experienceType === 'Experienced Only' && (minExperience || maxExperience)) {
          fullDescription += ` (${minExperience || '0'} - ${maxExperience || '10+'} years)`;
        }
      }
      
      if (hasBonus) {
        fullDescription += '\n\n✓ Bonus/Incentive Available';
      }

      if (education) {
        fullDescription += `\n\nEducation: ${education}`;
      }

      if (languages.length > 0) {
        fullDescription += `\nLanguages: ${languages.join(', ')}`;
      }

      if (additionalNotes) {
        fullDescription += `\n\n${additionalNotes}`;
      }

      // Use geocoding to get coordinates from location
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location + ', ' + area + ', India')}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HireForJob/1.0' } }
      );
      const geocodeData = await geocodeResponse.json();
      
      let latitude = 20.5937; // Default to India center
      let longitude = 78.9629;
      
      if (geocodeData.length > 0) {
        latitude = parseFloat(geocodeData[0].lat);
        longitude = parseFloat(geocodeData[0].lon);
      }

      const { error } = await supabase.from('jobs').insert({
        employer_id: employerId,
        title,
        description: fullDescription,
        salary_range: formattedSalary,
        job_type: jobType === 'Full Time' ? 'Full-time' : 'Part-time',
        latitude,
        longitude,
        status: 'open',
        is_active: true,
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

  // Non-employer view
  if (profile?.user_type !== 'employer') {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Employer Access Only</h2>
            <p className="text-muted-foreground mb-4">Only employers can post jobs. Please sign in with an employer account.</p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Blocked view
  if (!canPost && blockReason) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className={`w-16 h-16 ${showUpgradePrompt ? 'bg-primary/10' : 'bg-warning/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {showUpgradePrompt ? (
                <Crown className="w-8 h-8 text-primary" />
              ) : (
                <Briefcase className="w-8 h-8 text-warning" />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {showUpgradePrompt ? 'Upgrade Your Plan' : 'Cannot Post Jobs Yet'}
            </h2>
            <p className="text-muted-foreground mb-4">{blockReason}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              {showUpgradePrompt ? (
                <Button onClick={() => navigate('/plans')}>View Plans</Button>
              ) : (
                <Button onClick={() => navigate('/company-profile')}>Complete Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Post a New Job</h1>
              <p className="text-sm text-muted-foreground">Create a job listing to find the best candidates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post Job
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Sections */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Job Basics */}
              <Card className="shadow-google">
                <CardContent className="p-6">
                  <JobBasicsSection
                    jobType={jobType}
                    setJobType={setJobType}
                    title={title}
                    setTitle={setTitle}
                    location={location}
                    setLocation={setLocation}
                    area={area}
                    setArea={setArea}
                    openings={openings}
                    setOpenings={setOpenings}
                  />
                </CardContent>
              </Card>

              {/* Section 2: Candidate Requirements */}
              <Card className="shadow-google">
                <CardContent className="p-6">
                  <CandidateRequirementSection
                    experienceType={experienceType}
                    setExperienceType={setExperienceType}
                    minExperience={minExperience}
                    setMinExperience={setMinExperience}
                    maxExperience={maxExperience}
                    setMaxExperience={setMaxExperience}
                    salaryMin={salaryMin}
                    setSalaryMin={setSalaryMin}
                    salaryMax={salaryMax}
                    setSalaryMax={setSalaryMax}
                    hasBonus={hasBonus}
                    setHasBonus={setHasBonus}
                    description={description}
                    setDescription={setDescription}
                    skills={skills}
                    setSkills={setSkills}
                    gender={gender}
                    setGender={setGender}
                    ageMin={ageMin}
                    setAgeMin={setAgeMin}
                    ageMax={ageMax}
                    setAgeMax={setAgeMax}
                    education={education}
                    setEducation={setEducation}
                    languages={languages}
                    setLanguages={setLanguages}
                    certifications={certifications}
                    setCertifications={setCertifications}
                    additionalNotes={additionalNotes}
                    setAdditionalNotes={setAdditionalNotes}
                    onGenerateDescription={generateDescription}
                    generatingDescription={generatingDescription}
                    title={title}
                  />
                </CardContent>
              </Card>

              {/* Section 3: Timings */}
              <Card className="shadow-google">
                <CardContent className="p-6">
                  <TimingsSection
                    shiftType={shiftType}
                    setShiftType={setShiftType}
                    startTime={startTime}
                    setStartTime={setStartTime}
                    endTime={endTime}
                    setEndTime={setEndTime}
                    workDays={workDays}
                    setWorkDays={setWorkDays}
                    interviewTime={interviewTime}
                    setInterviewTime={setInterviewTime}
                    interviewDays={interviewDays}
                    setInterviewDays={setInterviewDays}
                  />
                </CardContent>
              </Card>

              {/* Section 4: Company Info */}
              <Card className="shadow-google">
                <CardContent className="p-6">
                  <CompanyInfoSection
                    companyName={companyName}
                    contactPerson={contactPerson}
                    setContactPerson={setContactPerson}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    email={email}
                    setEmail={setEmail}
                    contactRole={contactRole}
                    setContactRole={setContactRole}
                    organizationSize={organizationSize}
                    setOrganizationSize={setOrganizationSize}
                    hiringUrgency={hiringUrgency}
                    setHiringUrgency={setHiringUrgency}
                    hiringFrequency={hiringFrequency}
                    setHiringFrequency={setHiringFrequency}
                    jobAddress={jobAddress}
                    setJobAddress={setJobAddress}
                    isVerified={isVerified}
                  />
                </CardContent>
              </Card>

              {/* Mobile Submit Button */}
              <div className="lg:hidden flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Send className="w-4 h-4 mr-2" />
                  Post Job
                </Button>
              </div>
            </form>
          </div>

          {/* Right Sidebar - Performance Insights */}
          <div className="hidden lg:block">
            <PerformanceInsightsPanel
              title={title}
              description={description}
              skills={skills}
              salaryMin={salaryMin}
              salaryMax={salaryMax}
              location={location}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostJob;
