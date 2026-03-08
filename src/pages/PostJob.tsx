import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Briefcase, 
  Send, 
  Save, 
  Loader2, 
  Crown,
  Check,
  Users,
  Clock,
  Building2,
  Eye,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { getCurrencyByCode } from '@/lib/currencies';

import { JobBasicsSection } from '@/components/post-job/JobBasicsSection';
import type { GeoComponents } from '@/components/post-job/LocationMapPicker';
import { CandidateRequirementSection } from '@/components/post-job/CandidateRequirementSection';
import { TimingsSection } from '@/components/post-job/TimingsSection';
import { CompanyInfoSection } from '@/components/post-job/CompanyInfoSection';
import { JobPreviewStep } from '@/components/post-job/JobPreviewStep';
import { PerformanceInsightsPanel } from '@/components/post-job/PerformanceInsightsPanel';

const STEPS = [
  { id: 1, title: 'Job Basics', icon: Briefcase, description: 'Title, type & location', tip: 'A clear title gets 3x more views' },
  { id: 2, title: 'Requirements', icon: Users, description: 'Skills & experience', tip: 'Jobs with 4-6 skills get the most applications' },
  { id: 3, title: 'Timings', icon: Clock, description: 'Work hours & interview', tip: 'Adding work hours increases trust by 40%' },
  { id: 4, title: 'Company', icon: Building2, description: 'Contact & details', tip: 'Complete contact info builds candidate confidence' },
  { id: 5, title: 'Preview', icon: Eye, description: 'Review & publish', tip: 'Double-check before going live!' },
];

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
  }),
};

interface PostJobProps {
  embedded?: boolean;
}

const PostJob = ({ embedded = false }: PostJobProps) => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!jobId;
  const { user, profile } = useAuth();
  
  // Track animation direction
  const [direction, setDirection] = useState(0);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Loading & submission states
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // Employer data
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isGovernmentEmployer, setIsGovernmentEmployer] = useState(false);

  // Job category for government jobs
  const [jobCategory, setJobCategory] = useState<'private' | 'government'>('private');

  // Section 1: Job Basics
  const [jobType, setJobType] = useState<'Full Time' | 'Part Time'>('Full Time');
  const [title, setTitle] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [openings, setOpenings] = useState('1');
  const [workMode, setWorkMode] = useState<'onsite' | 'remote' | 'hybrid'>('onsite');
  const [geoComponents, setGeoComponents] = useState<GeoComponents>({ country: '', state: '', city: '' });

  // Section 2: Candidate Requirements
  const [experienceType, setExperienceType] = useState<'Any' | 'Fresher Only' | 'Experienced Only'>('Any');
  const [minExperience, setMinExperience] = useState('');
  const [maxExperience, setMaxExperience] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [hasBonus, setHasBonus] = useState(false);
  const [referralBounty, setReferralBounty] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [salaryCurrency, setSalaryCurrency] = useState('INR');
  
  // Additional details
  const [gender, setGender] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);

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

  // Fetch employer data and load draft
  useEffect(() => {
    const fetchEmployerAndDraft = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, verification_status, profile_completeness, terms_accepted_at, is_government, government_domain_verified')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (data) {
        setEmployerId(data.id);
        setCompanyName(data.company_name);
        setIsVerified(data.verification_status === 'approved');
        setIsGovernmentEmployer(data.is_government === true && data.government_domain_verified === true);

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

        // Load existing draft
        const { data: draftData } = await supabase
          .from('job_drafts')
          .select('*')
          .eq('employer_id', data.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draftData?.draft_data) {
          const draft = draftData.draft_data as Record<string, any>;
          // Restore draft values
          if (draft.title) setTitle(draft.title);
          if (draft.jobType) setJobType(draft.jobType);
          if (draft.coordinates) setCoordinates(draft.coordinates);
          if (draft.address) setAddress(draft.address);
          if (draft.openings) setOpenings(draft.openings);
          if (draft.workMode) setWorkMode(draft.workMode);
          if (draft.experienceType) setExperienceType(draft.experienceType);
          if (draft.minExperience) setMinExperience(draft.minExperience);
          if (draft.maxExperience) setMaxExperience(draft.maxExperience);
          if (draft.salaryMin) setSalaryMin(draft.salaryMin);
          if (draft.salaryMax) setSalaryMax(draft.salaryMax);
          if (draft.hasBonus !== undefined) setHasBonus(draft.hasBonus);
          if (draft.description) setDescription(draft.description);
          if (draft.skills) setSkills(draft.skills);
          if (draft.gender) setGender(draft.gender);
          if (draft.ageMin) setAgeMin(draft.ageMin);
          if (draft.ageMax) setAgeMax(draft.ageMax);
          if (draft.education) setEducation(draft.education);
          if (draft.languages) setLanguages(draft.languages);
          if (draft.certifications) setCertifications(draft.certifications);
          if (draft.additionalNotes) setAdditionalNotes(draft.additionalNotes);
          if (draft.benefits) setBenefits(draft.benefits);
          if (draft.shiftType) setShiftType(draft.shiftType);
          if (draft.startTime) setStartTime(draft.startTime);
          if (draft.endTime) setEndTime(draft.endTime);
          if (draft.workDays) setWorkDays(draft.workDays);
          if (draft.interviewTime) setInterviewTime(draft.interviewTime);
          if (draft.interviewDays) setInterviewDays(draft.interviewDays);
          if (draft.contactPerson) setContactPerson(draft.contactPerson);
          if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
          if (draft.email) setEmail(draft.email);
          if (draft.contactRole) setContactRole(draft.contactRole);
          if (draft.organizationSize) setOrganizationSize(draft.organizationSize);
          if (draft.hiringUrgency) setHiringUrgency(draft.hiringUrgency);
          if (draft.hiringFrequency) setHiringFrequency(draft.hiringFrequency);
          if (draft.jobAddress) setJobAddress(draft.jobAddress);
          
          toast.info('Draft restored from your last session');
        }
      } else if (error) {
        console.error('Error fetching employer:', error);
      }
    };

    fetchEmployerAndDraft();
  }, [profile, user]);

  // Load existing job data when editing
  useEffect(() => {
    const loadExistingJob = async () => {
      if (!jobId || !employerId) return;
      
      setInitialLoading(true);
      try {
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .eq('employer_id', employerId)
          .single();

        if (error) throw error;
        if (!jobData) {
          toast.error('Job not found');
          navigate('/employer-dashboard');
          return;
        }

        // Populate form with existing job data
        setTitle(jobData.title || '');
        setJobType(jobData.job_type === 'Part-time' ? 'Part Time' : 'Full Time');
        if (jobData.latitude && jobData.longitude) {
          setCoordinates({ lat: jobData.latitude, lng: jobData.longitude });
        }
        setAddress(jobData.job_address || '');
        setJobAddress(jobData.job_address || '');
        setOpenings(String(jobData.openings || 1));
        setExperienceType((jobData.experience_type as 'Any' | 'Fresher Only' | 'Experienced Only') || 'Any');
        setMinExperience(jobData.min_experience ? String(jobData.min_experience) : '');
        setMaxExperience(jobData.max_experience ? String(jobData.max_experience) : '');
        
        // Parse salary range
        if (jobData.salary_range) {
          const salaryMatch = jobData.salary_range.match(/₹(\d+)\s*-\s*₹(\d+)/);
          if (salaryMatch) {
            setSalaryMin(salaryMatch[1]);
            setSalaryMax(salaryMatch[2]);
          }
        }
        
        setHasBonus(jobData.has_bonus || false);
        setReferralBounty(jobData.referral_bounty ? String(jobData.referral_bounty) : '');
        setDescription(jobData.description || '');
        setSkills(jobData.skills || []);
        setGender((jobData.gender_preference as 'Any' | 'Male' | 'Female') || 'Any');
        setAgeMin(jobData.min_age ? String(jobData.min_age) : '');
        setAgeMax(jobData.max_age ? String(jobData.max_age) : '');
        setEducation(jobData.education || '');
        setLanguages(jobData.languages || []);
        setCertifications(jobData.certifications || '');
        setAdditionalNotes(jobData.additional_notes || '');
        setShiftType((jobData.shift_type as 'Day Shift' | 'Night Shift' | 'Rotational') || 'Day Shift');
        setStartTime(jobData.start_time || '');
        setEndTime(jobData.end_time || '');
        setWorkDays(jobData.work_days || []);
        setInterviewTime(jobData.interview_time || '');
        setInterviewDays(jobData.interview_days || []);
        setContactPerson(jobData.contact_person || '');
        setPhoneNumber(jobData.contact_phone || '');
        setEmail(jobData.contact_email || '');
        setContactRole(jobData.contact_role || '');
        setOrganizationSize(jobData.organization_size || '');
        setHiringUrgency((jobData.hiring_urgency as 'Immediately' | 'Can Wait') || 'Immediately');
        setHiringFrequency(jobData.hiring_frequency || '');

        // In edit mode, skip job limit check since we're editing existing job
        setCanPost(true);
        setBlockReason(null);
        setShowUpgradePrompt(false);
        
      } catch (error: any) {
        console.error('Error loading job:', error);
        toast.error('Failed to load job data');
        navigate('/employer-dashboard');
      } finally {
        setInitialLoading(false);
      }
    };

    loadExistingJob();
  }, [jobId, employerId, navigate]);

  const generateDescription = async () => {
    if (!title.trim()) {
      toast.error('Please enter a job title first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in to generate descriptions');
        setGeneratingDescription(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

  // Silent auto-save function (no toast)
  const autoSaveDraft = useCallback(async () => {
    if (!user || !employerId || savingDraft) return;

    try {
      const draftData = {
        title, jobType, coordinates, address, openings, workMode,
        experienceType, minExperience, maxExperience,
        salaryMin, salaryMax, hasBonus, description, skills,
        gender, ageMin, ageMax, education, languages,
        certifications, additionalNotes, benefits,
        shiftType, startTime, endTime, workDays,
        interviewTime, interviewDays,
        contactPerson, phoneNumber, email, contactRole,
        organizationSize, hiringUrgency, hiringFrequency, jobAddress,
      };

      // Only save if there's some content
      if (!title && !description && skills.length === 0) return;

      const { data: existingDraft } = await supabase
        .from('job_drafts')
        .select('id')
        .eq('employer_id', employerId)
        .limit(1)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('job_drafts')
          .update({ draft_data: draftData, title: title || 'Untitled Draft', updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id);
      } else {
        await supabase
          .from('job_drafts')
          .insert({ employer_id: employerId, draft_data: draftData, title: title || 'Untitled Draft' });
      }

      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [
    user, employerId, savingDraft, title, jobType, coordinates, address, openings,
    experienceType, minExperience, maxExperience, salaryMin, salaryMax, hasBonus,
    description, skills, gender, ageMin, ageMax, education, languages,
    certifications, additionalNotes, shiftType, startTime, endTime, workDays,
    interviewTime, interviewDays, contactPerson, phoneNumber, email, contactRole,
    organizationSize, hiringUrgency, hiringFrequency, jobAddress
  ]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!employerId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Set up new timer
    autoSaveTimerRef.current = setInterval(() => {
      autoSaveDraft();
    }, 30000); // 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [employerId, autoSaveDraft]);

  // Manual save with toast
  const handleSaveDraft = async () => {
    if (!user || !employerId) {
      toast.error('Please login to save draft');
      return;
    }

    setSavingDraft(true);
    try {
      const draftData = {
        title, jobType, coordinates, address, openings, workMode,
        experienceType, minExperience, maxExperience,
        salaryMin, salaryMax, hasBonus, description, skills,
        gender, ageMin, ageMax, education, languages,
        certifications, additionalNotes, benefits,
        shiftType, startTime, endTime, workDays,
        interviewTime, interviewDays,
        contactPerson, phoneNumber, email, contactRole,
        organizationSize, hiringUrgency, hiringFrequency, jobAddress,
      };

      const { data: existingDraft } = await supabase
        .from('job_drafts')
        .select('id')
        .eq('employer_id', employerId)
        .limit(1)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('job_drafts')
          .update({ draft_data: draftData, title: title || 'Untitled Draft', updated_at: new Date().toISOString() })
          .eq('id', existingDraft.id);
      } else {
        await supabase
          .from('job_drafts')
          .insert({ employer_id: employerId, draft_data: draftData, title: title || 'Untitled Draft' });
      }

      setLastAutoSave(new Date());
      toast.success('Draft saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!title.trim()) {
          toast.error('Please enter a job title');
          return false;
        }
        if (workMode !== 'remote' && !coordinates) {
          toast.error('Please select a job location on the map');
          return false;
        }
        return true;
      case 2:
        if (!salaryMin && !salaryMax) {
          toast.error('Please specify a salary range');
          return false;
        }
        if (!description.trim()) {
          toast.error('Please add a job description');
          return false;
        }
        if (skills.length === 0) {
          toast.error('Please add at least one skill');
          return false;
        }
        return true;
      case 3:
        return true; // Timings are optional
      case 4:
        if (!contactPerson || !phoneNumber || !email) {
          toast.error('Please complete the contact information');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (step: number) => {
    // Allow going back without validation, but validate when going forward
    if (step < currentStep) {
      setDirection(-1);
      setCurrentStep(step);
    } else if (step > currentStep) {
      // Validate all steps up to the target
      for (let i = currentStep; i < step; i++) {
        if (!validateStep(i)) return;
      }
      setDirection(1);
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    for (let i = 1; i <= 4; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    if (!user || !employerId) {
      toast.error('Please login to post a job');
      return;
    }

    setLoading(true);

    try {
      const currency = getCurrencyByCode(salaryCurrency);
      const formattedSalary = `${currency.symbol}${salaryMin || '0'} - ${currency.symbol}${salaryMax || salaryMin} /month`;

      // Use coordinates from map picker or default for remote
      const latitude = workMode === 'remote' ? 0 : coordinates!.lat;
      const longitude = workMode === 'remote' ? 0 : coordinates!.lng;

      const jobData = {
        employer_id: employerId,
        title,
        description,
        salary_range: formattedSalary,
        job_type: jobType === 'Full Time' ? 'Full-time' : 'Part-time',
        latitude,
        longitude,
        openings: parseInt(openings) || 1,
        experience_type: experienceType,
        min_experience: minExperience ? parseInt(minExperience) : null,
        max_experience: maxExperience ? parseInt(maxExperience) : null,
        has_bonus: hasBonus,
        referral_bounty: referralBounty ? parseInt(referralBounty) : 0,
        skills,
        gender_preference: gender,
        min_age: ageMin ? parseInt(ageMin) : null,
        max_age: ageMax ? parseInt(ageMax) : null,
        education,
        languages,
        certifications,
        additional_notes: additionalNotes,
        shift_type: shiftType,
        start_time: startTime || null,
        end_time: endTime || null,
        work_days: workDays,
        interview_time: interviewTime || null,
        interview_days: interviewDays,
        contact_person: contactPerson,
        contact_phone: phoneNumber,
        contact_email: email,
        contact_role: contactRole,
        organization_size: organizationSize,
        hiring_urgency: hiringUrgency,
        hiring_frequency: hiringFrequency,
        job_address: jobAddress || address,
        job_category: jobCategory,
        location_country: geoComponents.country || null,
        location_state: geoComponents.state || null,
        location_city: geoComponents.city || null,
        moderation_status: 'approved',

      if (isEditMode && jobId) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', jobId)
          .eq('employer_id', employerId);

        if (error) throw error;
        toast.success('Job updated successfully!');
      } else {
        // Create new job
        const { error } = await supabase.from('jobs').insert({
          ...jobData,
          status: 'open',
          is_active: true,
        });

        if (error) throw error;

        // Delete draft after successful posting
        await supabase
          .from('job_drafts')
          .delete()
          .eq('employer_id', employerId);

        toast.success('Job posted successfully!');
      }
      
      navigate('/employer-dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / 5) * 100;
  const currentStepData = STEPS.find(s => s.id === currentStep);

  // Keyboard shortcuts - before early returns to satisfy hooks rules
  const handleNextRef = useRef(handleNext);
  const handlePrevRef = useRef(handlePrev);
  const handleSaveDraftRef = useRef(handleSaveDraft);
  handleNextRef.current = handleNext;
  handlePrevRef.current = handlePrev;
  handleSaveDraftRef.current = handleSaveDraft;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); handleNextRef.current(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); handlePrevRef.current(); }
      if (e.altKey && e.key === 's') { e.preventDefault(); handleSaveDraftRef.current(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading existing job data
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Non-employer view
  if (profile?.user_type !== 'employer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md shadow-google-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Employer Access Only</h2>
            <p className="text-muted-foreground mb-6">Only employers can post jobs. Please sign in with an employer account.</p>
            <Button onClick={() => navigate('/')} size="lg">Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Blocked view
  if (!canPost && blockReason) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md shadow-google-lg">
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 ${showUpgradePrompt ? 'bg-primary/10' : 'bg-warning/10'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {showUpgradePrompt ? (
                <Crown className="w-10 h-10 text-primary" />
              ) : (
                <Briefcase className="w-10 h-10 text-warning" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-3">
              {showUpgradePrompt ? 'Upgrade Your Plan' : 'Cannot Post Jobs Yet'}
            </h2>
            <p className="text-muted-foreground mb-6">{blockReason}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/employer-dashboard')}>
                Dashboard
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
    <EmailVerificationGuard fallbackMessage="Please verify your email to post jobs.">
      <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background'}>
      {/* Header - hidden when embedded */}
      {!embedded && (
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate('/employer-dashboard')} className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              </TooltipTrigger><TooltipContent>Back to dashboard</TooltipContent></Tooltip>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">{isEditMode ? 'Edit Job Posting' : 'Create Job Posting'}</h1>
                {lastAutoSave && !isEditMode && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="w-3 h-3 text-success" />
                    Auto-saved at {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="gap-1.5"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Embedded header with save + mobile step indicator */}
      {embedded && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{isEditMode ? 'Edit Job Posting' : 'Create New Job'}</h2>
              {lastAutoSave && !isEditMode && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Auto-saved at {lastAutoSave.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="gap-1.5 rounded-xl"
            >
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </Button>
          </div>

          {/* Mobile step progress dots */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className={`h-1.5 w-full rounded-full transition-all ${
                  currentStep === step.id
                    ? 'bg-primary'
                    : currentStep > step.id
                    ? 'bg-success'
                    : 'bg-muted'
                }`} />
                <span className={`text-[9px] font-medium transition-colors ${
                  currentStep === step.id ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className={embedded ? '' : 'max-w-6xl mx-auto px-4 py-6'}>
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Steps */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24">
              <Card className="shadow-google overflow-hidden rounded-xl">
                <CardContent className="p-0">
                  {/* Progress */}
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-foreground">Progress</span>
                      <span className="text-xs text-muted-foreground font-medium">{currentStep} of 5</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">{Math.round(progressPercent)}% complete</p>
                  </div>

                  {/* Steps */}
                  <nav className="p-2">
                    {STEPS.map((step, idx) => {
                      const StepIcon = step.icon;
                      const isActive = currentStep === step.id;
                      const isCompleted = currentStep > step.id;

                      return (
                        <motion.button
                          key={step.id}
                          initial={false}
                          animate={isActive ? { scale: 1.01 } : { scale: 1 }}
                          onClick={() => handleStepClick(step.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-0.5 ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : isCompleted
                              ? 'bg-success/10 text-success hover:bg-success/20'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-primary-foreground/20'
                              : isCompleted
                              ? 'bg-success/20'
                              : 'bg-muted'
                          }`}>
                            {isCompleted ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium text-sm truncate ${isActive ? 'text-primary-foreground' : ''}`}>
                              {step.title}
                            </p>
                            <p className={`text-xs truncate ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {step.description}
                            </p>
                          </div>
                          {isCompleted && (
                            <Check className="w-4 h-4 text-success shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>

                  {/* Keyboard shortcuts hint */}
                  <div className="px-4 pb-3">
                    <p className="text-[9px] text-muted-foreground/60 text-center">
                      Alt+← / Alt+→ to navigate · Alt+S to save
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights - Desktop */}
              <div className="mt-6">
                <PerformanceInsightsPanel
                  title={title}
                  description={description}
                  skills={skills}
                  salaryMin={salaryMin}
                  salaryMax={salaryMax}
                  location={address}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Contextual tip banner */}
            {currentStepData?.tip && (
              <motion.div
                key={`tip-${currentStep}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{currentStepData.tip}</span>
              </motion.div>
            )}

            <Card className="shadow-google-lg rounded-xl">
              <CardContent className="p-5 sm:p-8">
                {/* Step Content with Animations */}
                <div className="min-h-[500px] overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      {currentStep === 1 && (
                        <JobBasicsSection
                          jobType={jobType}
                          setJobType={setJobType}
                          title={title}
                          setTitle={setTitle}
                          coordinates={coordinates}
                          setCoordinates={setCoordinates}
                          address={address}
                          setAddress={setAddress}
                          openings={openings}
                          setOpenings={setOpenings}
                          jobCategory={jobCategory}
                          setJobCategory={setJobCategory}
                          isGovernmentEmployer={isGovernmentEmployer}
                          workMode={workMode}
                          setWorkMode={setWorkMode}
                        />
                      )}

                      {currentStep === 2 && (
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
                          referralBounty={referralBounty}
                          setReferralBounty={setReferralBounty}
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
                          salaryCurrency={salaryCurrency}
                          setSalaryCurrency={setSalaryCurrency}
                          benefits={benefits}
                          setBenefits={setBenefits}
                        />
                      )}

                      {currentStep === 3 && (
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
                      )}

                      {currentStep === 4 && (
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
                      )}

                      {currentStep === 5 && (
                        <JobPreviewStep
                          title={title}
                          jobType={jobType}
                          address={address}
                          openings={openings}
                          experienceType={experienceType}
                          minExperience={minExperience}
                          maxExperience={maxExperience}
                          salaryMin={salaryMin}
                          salaryMax={salaryMax}
                          hasBonus={hasBonus}
                          description={description}
                          skills={skills}
                          gender={gender}
                          ageMin={ageMin}
                          ageMax={ageMax}
                          education={education}
                          languages={languages}
                          certifications={certifications}
                          shiftType={shiftType}
                          startTime={startTime}
                          endTime={endTime}
                          workDays={workDays}
                          interviewTime={interviewTime}
                          interviewDays={interviewDays}
                          companyName={companyName}
                          contactPerson={contactPerson}
                          phoneNumber={phoneNumber}
                          email={email}
                          contactRole={contactRole}
                          organizationSize={organizationSize}
                          hiringUrgency={hiringUrgency}
                          isVerified={isVerified}
                          workMode={workMode}
                          benefits={benefits}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 1}
                    className="gap-2 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Back</span>
                  </Button>

                  <div className="flex items-center gap-1.5 sm:hidden">
                    {STEPS.map(s => (
                      <div key={s.id} className={`w-2 h-2 rounded-full transition-colors ${
                        currentStep === s.id ? 'bg-primary' : currentStep > s.id ? 'bg-success' : 'bg-muted'
                      }`} />
                    ))}
                  </div>

                  {currentStep < 5 ? (
                    <Button onClick={handleNext} className="gap-2 rounded-xl">
                      {currentStep === 4 ? 'Preview' : 'Next'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading}
                      className="gap-2 bg-success hover:bg-success/90 rounded-xl shadow-sm"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isEditMode ? 'Update Job' : 'Post Job'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights - Mobile */}
            <div className="lg:hidden mt-6">
              <PerformanceInsightsPanel
                title={title}
                description={description}
                skills={skills}
                salaryMin={salaryMin}
                salaryMax={salaryMax}
                location={address}
              />
            </div>
          </div>
        </div>
      </main>
      </div>
    </EmailVerificationGuard>
  );
};

export default PostJob;
