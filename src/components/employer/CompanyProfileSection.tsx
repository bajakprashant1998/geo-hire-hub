import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2, Save, Eye, FileText, Loader2, AlertTriangle, Heart, Gift,
  Globe, Camera, CreditCard, MapPin, Briefcase, Banknote, TrendingUp,
  Target, Star, Users, GraduationCap, Award, Phone, Mail, Link2,
  Laptop, Zap, Shield, BookOpen, BarChart3, Plus, X, Check, Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfileCompletenessBar } from '@/components/employer/ProfileCompletenessBar';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { DocumentUpload } from '@/components/employer/DocumentUpload';
import { LogoUpload } from '@/components/employer/LogoUpload';
import {
  SocialLinksSection,
  CompanyBenefitsSection,
  type SocialLinks,
} from '@/components/profile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const countries = [
  { code: 'US', name: 'United States', taxLabel: 'EIN / Tax ID' },
  { code: 'GB', name: 'United Kingdom', taxLabel: 'VAT Number' },
  { code: 'DE', name: 'Germany', taxLabel: 'VAT Number' },
  { code: 'IN', name: 'India', taxLabel: 'GST Number' },
  { code: 'AU', name: 'Australia', taxLabel: 'ABN' },
  { code: 'CA', name: 'Canada', taxLabel: 'GST/HST Number' },
  { code: 'FR', name: 'France', taxLabel: 'VAT Number' },
  { code: 'JP', name: 'Japan', taxLabel: 'Corporate Number' },
  { code: 'SG', name: 'Singapore', taxLabel: 'UEN' },
  { code: 'AE', name: 'UAE', taxLabel: 'TRN' },
  { code: 'OTHER', name: 'Other', taxLabel: 'Tax ID' },
];

const industries = [
  'Technology', 'Media & Entertainment', 'Healthcare', 'Finance',
  'Education', 'Retail', 'Manufacturing', 'Consulting',
  'Real Estate', 'Hospitality', 'Construction', 'Transportation',
  'Agriculture', 'Energy', 'Legal', 'Automotive', 'Telecom',
  'Aerospace', 'Pharmaceutical', 'Non-Profit', 'Other',
];

interface CompanyProfileSectionProps {
  onViewPublicProfile?: () => void;
}

// Tag input helper
const TagInput = ({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput('');
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:bg-destructive/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export const CompanyProfileSection = ({ onViewPublicProfile }: CompanyProfileSectionProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Basic
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [officePhotoUrl, setOfficePhotoUrl] = useState('');
  const [businessCardUrl, setBusinessCardUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [completeness, setCompleteness] = useState(0);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<string | null>(null);
  const [googleBusinessVerified, setGoogleBusinessVerified] = useState(false);
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
  const [companyRegistrationUrl, setCompanyRegistrationUrl] = useState('');
  const [gstLicenseUrl, setGstLicenseUrl] = useState('');
  const [panUrl, setPanUrl] = useState('');
  const [trustScore, setTrustScore] = useState(0);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Culture & Details
  const [teamSize, setTeamSize] = useState('');
  const [foundingYear, setFoundingYear] = useState<number | null>(null);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [cultureDescription, setCultureDescription] = useState('');
  const [hiringProcess, setHiringProcess] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);

  // Location & Work Setup
  const [workEnvironment, setWorkEnvironment] = useState('onsite');
  const [relocationSupport, setRelocationSupport] = useState(false);
  const [officeLocations, setOfficeLocations] = useState<string[]>([]);

  // Hiring
  const [internshipAvailable, setInternshipAvailable] = useState(false);
  const [fresherHiring, setFresherHiring] = useState(false);
  const [hiringTimeline, setHiringTimeline] = useState('');
  const [interviewRoundsCount, setInterviewRoundsCount] = useState<number | null>(null);
  const [assessmentTypes, setAssessmentTypes] = useState<string[]>([]);

  // Salary & Benefits
  const [avgSalaryRange, setAvgSalaryRange] = useState('');
  const [bonusStructure, setBonusStructure] = useState('');
  const [paidLeavesPolicy, setPaidLeavesPolicy] = useState('');
  const [learningBudget, setLearningBudget] = useState('');

  // Growth
  const [promotionFrequency, setPromotionFrequency] = useState('');
  const [careerGrowthPaths, setCareerGrowthPaths] = useState('');
  const [employeeRetentionRate, setEmployeeRetentionRate] = useState('');

  // Skills & Matching
  const [techStack, setTechStack] = useState<string[]>([]);
  const [keySkillsHiring, setKeySkillsHiring] = useState<string[]>([]);
  const [preferredCertifications, setPreferredCertifications] = useState<string[]>([]);
  const [educationPreference, setEducationPreference] = useState('');

  // Culture
  const [workCultureType, setWorkCultureType] = useState('');
  const [companyValues, setCompanyValues] = useState<string[]>([]);
  const [diversityPolicies, setDiversityPolicies] = useState('');
  const [workLifeBalanceRating, setWorkLifeBalanceRating] = useState<number>(3);

  // Contact
  const [hrContactEmail, setHrContactEmail] = useState('');
  const [careersPageUrl, setCareersPageUrl] = useState('');
  const [awardsRecognition, setAwardsRecognition] = useState<string[]>([]);

  const initialFetchDone = useRef(false);

  const steps = [
    { label: 'Basic Info', icon: Building2, fields: ['companyName', 'industry', 'description', 'countryCode', 'taxId', 'teamSize', 'websiteUrl'] },
    { label: 'Location', icon: MapPin, fields: ['officeLocations'] },
    { label: 'Hiring', icon: Briefcase, fields: ['hiringProcess', 'interviewRoundsCount', 'hiringTimeline', 'assessmentTypes'] },
    { label: 'Compensation', icon: Banknote, fields: ['avgSalaryRange', 'benefits', 'paidLeavesPolicy'] },
    { label: 'Growth', icon: TrendingUp, fields: ['promotionFrequency', 'careerGrowthPaths', 'employeeRetentionRate'] },
    { label: 'Skills Match', icon: Target, fields: ['keySkillsHiring', 'techStack', 'educationPreference'] },
    { label: 'Culture', icon: Heart, fields: ['workCultureType', 'cultureDescription', 'companyValues'] },
    { label: 'Documents', icon: FileText, fields: ['officePhotoUrl', 'businessCardUrl'] },
    { label: 'Contact', icon: Phone, fields: ['hrContactEmail'] },
  ];

  // Calculate per-step completion
  const getStepCompletion = (stepIdx: number): 'complete' | 'partial' | 'empty' => {
    const fieldValues: Record<string, any> = {
      companyName: companyName && companyName !== 'My Company', industry, description: description?.length >= 20,
      countryCode, taxId, teamSize, websiteUrl, officeLocations: officeLocations.length > 0,
      hiringProcess, interviewRoundsCount, hiringTimeline, assessmentTypes: assessmentTypes.length > 0,
      avgSalaryRange, benefits: benefits.length > 0, paidLeavesPolicy,
      promotionFrequency, careerGrowthPaths, employeeRetentionRate,
      keySkillsHiring: keySkillsHiring.length > 0, techStack: techStack.length > 0, educationPreference,
      workCultureType, cultureDescription, companyValues: companyValues.length > 0,
      officePhotoUrl, businessCardUrl, hrContactEmail,
    };
    const stepFields = steps[stepIdx].fields;
    const filled = stepFields.filter(f => !!fieldValues[f]).length;
    if (filled === stepFields.length) return 'complete';
    if (filled > 0) return 'partial';
    return 'empty';
  };

  useEffect(() => {
    if (profile && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchEmployerProfile();
    }
  }, [profile]);

  const fetchEmployerProfile = async () => {
    if (!profile) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('employers')
        .select(`*, profiles!inner(avatar_url, whatsapp_number)`)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEmployerId(data.id);
        setCompanyName(data.company_name || '');
        setDescription(data.description || '');
        setIndustry(data.industry || '');
        setWebsiteUrl(data.website_url || '');
        setCountryCode(data.country_code || '');
        setTaxId(data.tax_id || '');
        setOfficePhotoUrl(data.office_photo_url || '');
        setBusinessCardUrl(data.business_card_url || '');
        setLogoUrl(data.profiles?.avatar_url || '');
        setVerificationStatus((data.verification_status as any) || 'pending');
        setTermsAccepted(!!data.terms_accepted_at);
        setCompleteness(data.profile_completeness || 0);
        setWhatsappNumber(data.profiles?.whatsapp_number || '');
        setTeamSize((data as any).team_size || '');
        setFoundingYear((data as any).founding_year || null);
        setBenefits((data as any).benefits || []);
        setSocialLinks((data as any).social_links || {});
        setCultureDescription((data as any).culture_description || '');
        setHiringProcess((data as any).hiring_process || '');
        setSpecializations((data as any).specializations || []);
        // New fields
        setWorkEnvironment((data as any).work_environment || 'onsite');
        setRelocationSupport((data as any).relocation_support || false);
        setOfficeLocations((data as any).office_locations || []);
        setInternshipAvailable((data as any).internship_available || false);
        setFresherHiring((data as any).fresher_hiring || false);
        setHiringTimeline((data as any).hiring_timeline || '');
        setInterviewRoundsCount((data as any).interview_rounds_count || null);
        setAssessmentTypes((data as any).assessment_types || []);
        setAvgSalaryRange((data as any).avg_salary_range || '');
        setBonusStructure((data as any).bonus_structure || '');
        setPaidLeavesPolicy((data as any).paid_leaves_policy || '');
        setLearningBudget((data as any).learning_budget || '');
        setPromotionFrequency((data as any).promotion_frequency || '');
        setCareerGrowthPaths((data as any).career_growth_paths || '');
        setEmployeeRetentionRate((data as any).employee_retention_rate || '');
        setTechStack((data as any).tech_stack || []);
        setKeySkillsHiring((data as any).key_skills_hiring || []);
        setPreferredCertifications((data as any).preferred_certifications || []);
        setEducationPreference((data as any).education_preference || '');
        setWorkCultureType((data as any).work_culture_type || '');
        setCompanyValues((data as any).company_values || []);
        setDiversityPolicies((data as any).diversity_policies || '');
        setWorkLifeBalanceRating((data as any).work_life_balance_rating || 3);
        setHrContactEmail((data as any).hr_contact_email || '');
        setCareersPageUrl((data as any).careers_page_url || '');
        setAwardsRecognition((data as any).awards_recognition || []);
        setVerificationMethod((data as any).verification_method || null);
        setGoogleBusinessVerified((data as any).google_business_verified || false);
        setGoogleBusinessUrl((data as any).google_business_url || '');
        setCompanyRegistrationUrl((data as any).company_registration_url || '');
        setGstLicenseUrl((data as any).gst_license_url || '');
        setPanUrl((data as any).pan_url || '');
        setTrustScore((data as any).trust_score || 0);

        const { data: calcData } = await supabase
          .rpc('calculate_employer_profile_completeness', { p_employer_id: data.id });
        if (typeof calcData === 'number') setCompleteness(calcData);
      }
    } catch (error) {
      console.error('Error fetching employer:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateMissingFields = () => {
    const missing: string[] = [];
    // Basic Info (35pts)
    if (!companyName || companyName === 'My Company') missing.push('Company Name');
    if (!industry) missing.push('Industry');
    if (!description || description.length < 20) missing.push('Company Description (min 20 chars)');
    if (!countryCode) missing.push('Country');
    if (!taxId) missing.push('Tax ID');
    if (!teamSize) missing.push('Team Size');
    if (!websiteUrl) missing.push('Website URL');
    // Location (10pts)
    if (officeLocations.length === 0) missing.push('Office Locations');
    // Hiring (10pts)
    if (!hiringProcess) missing.push('Hiring Process');
    if (!interviewRoundsCount) missing.push('Interview Rounds');
    if (!hiringTimeline) missing.push('Hiring Timeline');
    if (assessmentTypes.length === 0) missing.push('Assessment Types');
    // Compensation (10pts)
    if (!avgSalaryRange) missing.push('Average Salary Range');
    if (benefits.length === 0) missing.push('Benefits');
    if (!paidLeavesPolicy) missing.push('Paid Leaves Policy');
    // Growth (8pts)
    if (!promotionFrequency) missing.push('Promotion Frequency');
    if (!careerGrowthPaths) missing.push('Career Growth Paths');
    if (!employeeRetentionRate) missing.push('Employee Retention Rate');
    // Skills (10pts)
    if (keySkillsHiring.length === 0) missing.push('Key Skills');
    if (techStack.length === 0) missing.push('Tech Stack');
    if (!educationPreference) missing.push('Education Preference');
    // Culture (7pts)
    if (!workCultureType) missing.push('Work Culture Type');
    if (!cultureDescription) missing.push('Culture Description');
    if (companyValues.length === 0) missing.push('Company Values');
    // Documents (8pts)
    if (!officePhotoUrl) missing.push('Office Photo');
    if (!businessCardUrl) missing.push('Business Card');
    // Contact (2pts)
    if (!hrContactEmail) missing.push('HR Contact Email');
    return missing;
  };

  const handleSave = async () => {
    if (!employerId || !profile) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        company_name: companyName,
        description,
        industry,
        website_url: websiteUrl || null,
        country_code: countryCode,
        tax_id: taxId,
        tax_type: countries.find(c => c.code === countryCode)?.taxLabel || 'Tax ID',
        office_photo_url: officePhotoUrl || null,
        business_card_url: businessCardUrl || null,
        terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
        team_size: teamSize || null,
        founding_year: foundingYear,
        benefits,
        social_links: socialLinks as unknown as any,
        culture_description: cultureDescription || null,
        hiring_process: hiringProcess || null,
        specializations,
        work_environment: workEnvironment,
        relocation_support: relocationSupport,
        office_locations: officeLocations,
        internship_available: internshipAvailable,
        fresher_hiring: fresherHiring,
        hiring_timeline: hiringTimeline || null,
        interview_rounds_count: interviewRoundsCount,
        assessment_types: assessmentTypes,
        avg_salary_range: avgSalaryRange || null,
        bonus_structure: bonusStructure || null,
        paid_leaves_policy: paidLeavesPolicy || null,
        learning_budget: learningBudget || null,
        promotion_frequency: promotionFrequency || null,
        career_growth_paths: careerGrowthPaths || null,
        employee_retention_rate: employeeRetentionRate || null,
        tech_stack: techStack,
        key_skills_hiring: keySkillsHiring,
        preferred_certifications: preferredCertifications,
        education_preference: educationPreference || null,
        work_culture_type: workCultureType || null,
        company_values: companyValues,
        diversity_policies: diversityPolicies || null,
        work_life_balance_rating: workLifeBalanceRating,
        hr_contact_email: hrContactEmail || null,
        careers_page_url: careersPageUrl || null,
        awards_recognition: awardsRecognition,
        google_business_url: googleBusinessUrl || null,
        company_registration_url: companyRegistrationUrl || null,
        gst_license_url: gstLicenseUrl || null,
        pan_url: panUrl || null,
      };

      const { error } = await supabase.from('employers').update(updates).eq('id', employerId);
      if (error) throw error;

      if (logoUrl !== profile.avatar_url || whatsappNumber) {
        await supabase
          .from('profiles')
          .update({ avatar_url: logoUrl || null, whatsapp_number: whatsappNumber || null })
          .eq('id', profile.id);
      }

      const { data: calcData } = await supabase
        .rpc('calculate_employer_profile_completeness', { p_employer_id: employerId });
      if (typeof calcData === 'number') {
        setCompleteness(calcData);
        await supabase.from('employers').update({ profile_completeness: calcData }).eq('id', employerId);
      }

      toast.success('Profile saved successfully');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const autoSaveDocument = async (field: 'office_photo_url' | 'business_card_url' | 'company_registration_url' | 'gst_license_url' | 'pan_url', url: string) => {
    if (!employerId) return;
    try {
      const { error } = await supabase.from('employers').update({ [field]: url || null }).eq('id', employerId);
      if (error) throw error;
      if (field === 'office_photo_url') setOfficePhotoUrl(url);
      else if (field === 'business_card_url') setBusinessCardUrl(url);
      else if (field === 'company_registration_url') setCompanyRegistrationUrl(url);
      else if (field === 'gst_license_url') setGstLicenseUrl(url);
      else if (field === 'pan_url') setPanUrl(url);
      const { data: calcData } = await supabase
        .rpc('calculate_employer_profile_completeness', { p_employer_id: employerId });
      if (typeof calcData === 'number') {
        setCompleteness(calcData);
        await supabase.from('employers').update({ profile_completeness: calcData }).eq('id', employerId);
      }
    } catch (error: any) {
      console.error('Failed to auto-save document:', error);
      toast.error('Failed to link document to profile');
    }
  };

  const handleSubmitVerification = async () => {
    if (!employerId) return;
    setSubmittingVerification(true);
    try {
      // Save current data first
      await handleSave();
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-employer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ employer_id: employerId }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Verification failed');
      }

      const result = await response.json();
      setTrustScore(result.trust_score);
      setVerificationStatus(result.status as any);
      setVerificationMethod(result.verification_method);

      if (result.status === 'approved') {
        toast.success(`🎉 AI Verified! Trust Score: ${result.trust_score}/100`);
      } else if (result.trust_score >= 50) {
        toast.info(`Verification submitted. Score: ${result.trust_score}/100. Under review.`);
      } else {
        toast.warning(`Score: ${result.trust_score}/100. Flagged for manual review.`);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const getTaxLabel = () => countries.find(c => c.code === countryCode)?.taxLabel || 'Tax ID';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedSteps = steps.filter((_, i) => getStepCompletion(i) === 'complete').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Company Profile</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Complete your profile to attract top talent & enable AI matching</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <VerificationBadge status={verificationStatus} verificationMethod={verificationMethod} googleBusinessVerified={googleBusinessVerified} />
          {onViewPublicProfile && (
            <Button variant="outline" size="sm" onClick={onViewPublicProfile} className="gap-1.5 text-xs h-8 rounded-xl">
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
          )}
        </div>
      </div>

      {/* Completeness */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-lg overflow-hidden relative">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-3 sm:p-5 relative z-10">
            <ProfileCompletenessBar completeness={completeness} missingFields={calculateMissingFields()} />
            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-success" />
                <span><strong className="text-foreground">{completedSteps}</strong>/{steps.length} sections complete</span>
              </div>
              {trustScore > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Trust Score: <strong className={cn(
                    trustScore >= 80 ? "text-success" : trustScore >= 50 ? "text-warning" : "text-destructive"
                  )}>{trustScore}/100</strong></span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Verification Warnings */}
      {verificationStatus === 'pending' && completeness >= 100 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-3 sm:p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Pending Admin Approval</p>
              <p className="text-xs text-muted-foreground">Your profile is under review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:flex gap-1.5 sm:gap-2 sm:overflow-x-auto sm:pb-1 scrollbar-hide">
        {steps.map((step, idx) => {
          const status = getStepCompletion(idx);
          return (
            <button
              key={step.label}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap border shrink-0 relative",
                activeStep === idx
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground hover:border-border"
              )}
            >
              <div className="relative">
                <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {activeStep !== idx && status === 'complete' && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                )}
                {activeStep !== idx && status === 'partial' && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning border-2 border-card" />
                )}
              </div>
              <span className="leading-tight text-center sm:text-left">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* 0: Basic Info */}
          {activeStep === 0 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Company Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-3 sm:p-4 bg-muted/30 rounded-xl">
                    {user && (
                      <LogoUpload userId={user.id} currentLogoUrl={logoUrl} onLogoUploaded={setLogoUrl} size="lg" />
                    )}
                    <div className="text-center sm:text-left">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">Company Logo</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Square image, at least 200×200px</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Company Name *</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company Name" className="h-9 sm:h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Industry *</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (<SelectItem key={ind} value={ind}>{ind}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="flex items-center gap-2 text-xs sm:text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        Team Size
                      </Label>
                      <Select value={teamSize} onValueChange={setTeamSize}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select team size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Year Founded</Label>
                      <Select
                        value={foundingYear?.toString() || ''}
                        onValueChange={(val) => setFoundingYear(val ? parseInt(val) : null)}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select year" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Company Description *</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell candidates about your company..." rows={3} className="text-sm" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{description.length}/20 characters minimum</p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Website URL</Label>
                    <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourcompany.com" className="h-9 sm:h-10 text-sm" />
                  </div>
                  <Separator />
                  <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base"><CreditCard className="w-4 h-4 text-primary" /> Legal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Country *</Label>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">{getTaxLabel()} *</Label>
                      <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder={`Enter your ${getTaxLabel()}`} className="h-9 sm:h-10 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1: Location & Work Setup */}
          {activeStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Location & Work Setup</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Important for AI nearby job matching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Work Environment</Label>
                    <Select value={workEnvironment} onValueChange={setWorkEnvironment}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">🏢 Onsite</SelectItem>
                        <SelectItem value="remote">🏠 Remote</SelectItem>
                        <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Office Locations</Label>
                    <TagInput tags={officeLocations} onChange={setOfficeLocations} placeholder="Add city, e.g. New York, Mumbai" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Add all your office locations for better AI matching</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Label className="font-medium text-xs sm:text-sm">Relocation Support</Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Do you offer relocation assistance?</p>
                    </div>
                    <Switch checked={relocationSupport} onCheckedChange={setRelocationSupport} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2: Hiring & Job Information */}
          {activeStep === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Hiring Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Label className="font-medium text-xs sm:text-sm">Internship Available</Label>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Offer internship positions?</p>
                      </div>
                      <Switch checked={internshipAvailable} onCheckedChange={setInternshipAvailable} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Label className="font-medium text-xs sm:text-sm">Fresher Hiring</Label>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Hire fresh graduates?</p>
                      </div>
                      <Switch checked={fresherHiring} onCheckedChange={setFresherHiring} />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Hiring Process</Label>
                    <Textarea value={hiringProcess} onChange={(e) => setHiringProcess(e.target.value)} placeholder="e.g., Application → Phone Screen → Technical → Final → Offer" rows={3} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Interview Rounds</Label>
                      <Select value={interviewRoundsCount?.toString() || ''} onValueChange={(v) => setInterviewRoundsCount(v ? parseInt(v) : null)}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select rounds" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (<SelectItem key={n} value={n.toString()}>{n} round{n > 1 ? 's' : ''}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Typical Hiring Timeline</Label>
                      <Select value={hiringTimeline} onValueChange={setHiringTimeline}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select timeline" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                          <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                          <SelectItem value="1-2 months">1-2 months</SelectItem>
                          <SelectItem value="2-3 months">2-3 months</SelectItem>
                          <SelectItem value="3+ months">3+ months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Assessment Types</Label>
                    <TagInput tags={assessmentTypes} onChange={setAssessmentTypes} placeholder="e.g. Coding test, Case study, Group discussion" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3: Compensation & Benefits */}
          {activeStep === 3 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Salary & Compensation</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Critical for AI salary advice & matching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Average Salary Range</Label>
                    <Input value={avgSalaryRange} onChange={(e) => setAvgSalaryRange(e.target.value)} placeholder="e.g., $50,000 - $150,000 / year" className="h-9 sm:h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Bonus Structure</Label>
                    <Textarea value={bonusStructure} onChange={(e) => setBonusStructure(e.target.value)} placeholder="e.g., Annual performance bonus up to 20%, quarterly incentives..." rows={2} className="text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Paid Leaves Policy</Label>
                    <Input value={paidLeavesPolicy} onChange={(e) => setPaidLeavesPolicy(e.target.value)} placeholder="e.g., 25 days annual leave + 10 sick days" className="h-9 sm:h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Learning & Training Budget</Label>
                    <Input value={learningBudget} onChange={(e) => setLearningBudget(e.target.value)} placeholder="e.g., $2,000/year per employee" className="h-9 sm:h-10 text-sm" />
                  </div>
                </CardContent>
              </Card>
              <CompanyBenefitsSection benefits={benefits} onChange={setBenefits} />
            </div>
          )}

          {/* 4: Growth & Career */}
          {activeStep === 4 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Growth & Career Opportunities</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Critical for AI career prediction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Promotion Frequency</Label>
                    <Select value={promotionFrequency} onValueChange={setPromotionFrequency}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6-12 months">Every 6-12 months</SelectItem>
                        <SelectItem value="1-2 years">Every 1-2 years</SelectItem>
                        <SelectItem value="2-3 years">Every 2-3 years</SelectItem>
                        <SelectItem value="performance-based">Performance-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Career Growth Paths</Label>
                    <Textarea value={careerGrowthPaths} onChange={(e) => setCareerGrowthPaths(e.target.value)} placeholder="Describe career progression, leadership programs, internal mobility..." rows={3} className="text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Employee Retention Rate</Label>
                    <Select value={employeeRetentionRate} onValueChange={setEmployeeRetentionRate}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select retention rate" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90%+">90%+ (Excellent)</SelectItem>
                        <SelectItem value="80-90%">80-90% (Good)</SelectItem>
                        <SelectItem value="70-80%">70-80% (Average)</SelectItem>
                        <SelectItem value="Below 70%">Below 70%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5: Skills & Role Alignment */}
          {activeStep === 5 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Skill & Role Alignment</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Used for AI candidate match % calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Key Skills You Hire For</Label>
                    <TagInput tags={keySkillsHiring} onChange={setKeySkillsHiring} placeholder="e.g. React, Python, Sales, Marketing" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Technology Stack</Label>
                    <TagInput tags={techStack} onChange={setTechStack} placeholder="e.g. AWS, React, PostgreSQL, Docker" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Preferred Certifications</Label>
                    <TagInput tags={preferredCertifications} onChange={setPreferredCertifications} placeholder="e.g. AWS Certified, PMP, Google Analytics" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Education Preference</Label>
                    <Select value={educationPreference} onValueChange={setEducationPreference}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select preference" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Education</SelectItem>
                        <SelectItem value="high-school">High School+</SelectItem>
                        <SelectItem value="bachelors">Bachelor's Degree+</SelectItem>
                        <SelectItem value="masters">Master's Degree+</SelectItem>
                        <SelectItem value="phd">PhD Required</SelectItem>
                        <SelectItem value="skills-based">Skills-based (No Degree Required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Company Specializations</Label>
                    <TagInput tags={specializations} onChange={setSpecializations} placeholder="e.g. AI/ML, FinTech, SaaS" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 6: Culture & Work Environment */}
          {activeStep === 6 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Company Culture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Work Culture Type</Label>
                    <Select value={workCultureType} onValueChange={setWorkCultureType}>
                      <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue placeholder="Select culture type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">🚀 Startup</SelectItem>
                        <SelectItem value="corporate">🏢 Corporate</SelectItem>
                        <SelectItem value="flexible">🌿 Flexible</SelectItem>
                        <SelectItem value="creative">🎨 Creative</SelectItem>
                        <SelectItem value="traditional">📋 Traditional</SelectItem>
                        <SelectItem value="remote-first">🌍 Remote-First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Culture Description</Label>
                    <Textarea value={cultureDescription} onChange={(e) => setCultureDescription(e.target.value)} placeholder="What makes your company culture unique?" rows={4} className="text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Company Values</Label>
                    <TagInput tags={companyValues} onChange={setCompanyValues} placeholder="e.g. Innovation, Transparency, Customer First" />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-xs sm:text-sm">Work-Life Balance Rating</Label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Slider
                        value={[workLifeBalanceRating]}
                        onValueChange={(v) => setWorkLifeBalanceRating(v[0])}
                        min={1} max={5} step={1}
                        className="flex-1"
                      />
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", s <= workLifeBalanceRating ? "text-warning fill-warning" : "text-muted-foreground")} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Diversity & Inclusion Policies</Label>
                    <Textarea value={diversityPolicies} onChange={(e) => setDiversityPolicies(e.target.value)} placeholder="Describe your D&I initiatives..." rows={3} className="text-sm" />
                  </div>
                </CardContent>
              </Card>
              <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={false} />
            </div>
          )}

          {/* 7: Documents & Media */}
          {activeStep === 7 && (
            <div className="space-y-4 sm:space-y-6">
              {/* Verification Documents */}
              <Card className="border-primary/20">
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Verification Documents
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Upload documents for AI-powered verification. Higher quality = faster approval.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                  {user && (
                    <>
                      <DocumentUpload userId={user.id} type="company-registration" currentUrl={companyRegistrationUrl} onUploaded={(url) => autoSaveDocument('company_registration_url', url)} label="Company Registration Certificate *" description="Upload your company registration or incorporation certificate" />
                      <DocumentUpload userId={user.id} type="gst-license" currentUrl={gstLicenseUrl} onUploaded={(url) => autoSaveDocument('gst_license_url', url)} label="GST / Business License *" description="Upload your GST certificate, business license, or trade license" />
                      <DocumentUpload userId={user.id} type="pan-card" currentUrl={panUrl} onUploaded={(url) => autoSaveDocument('pan_url', url)} label="PAN Card (Optional)" description="Upload PAN card for additional verification points" />
                    </>
                  )}
                  <Separator />
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      Google Business Profile URL
                    </Label>
                    <Input
                      type="url"
                      value={googleBusinessUrl}
                      onChange={(e) => setGoogleBusinessUrl(e.target.value)}
                      placeholder="https://g.co/kgs/... or Google Maps link"
                      className="h-9 sm:h-10 text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Providing your Google Business link adds up to +30 trust points
                    </p>
                  </div>
                  <Separator />
                  {trustScore > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className={cn(
                        "text-lg font-bold rounded-full w-12 h-12 flex items-center justify-center",
                        trustScore >= 80 ? "bg-success/10 text-success" :
                        trustScore >= 50 ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      )}>
                        {trustScore}
                      </div>
                      <div>
                        <p className="font-medium text-sm">Trust Score</p>
                        <p className="text-xs text-muted-foreground">
                          {trustScore >= 80 ? 'Excellent — auto-approval eligible' :
                           trustScore >= 50 ? 'Good — under review' : 'Low — manual review required'}
                        </p>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={submittingVerification || verificationStatus === 'approved'}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {submittingVerification ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    {verificationStatus === 'approved'
                      ? 'Already Verified'
                      : submittingVerification
                        ? 'AI Verification in Progress...'
                        : 'Submit for AI Verification'}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Trust Documents & Media</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Upload photos and documents to build trust</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                  {user && (
                    <>
                      <DocumentUpload userId={user.id} type="office" currentUrl={officePhotoUrl} onUploaded={(url) => autoSaveDocument('office_photo_url', url)} label="Office Photo" description="Upload a photo of your office or workspace" />
                      <DocumentUpload userId={user.id} type="business-card" currentUrl={businessCardUrl} onUploaded={(url) => autoSaveDocument('business_card_url', url)} label="Business Card" description="Upload your business or visiting card" />
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Awards & Recognition</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                  <TagInput tags={awardsRecognition} onChange={setAwardsRecognition} placeholder="e.g. Best Workplace 2024, Forbes 500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => {
                      if (checked && !termsAccepted) setShowTermsDialog(true);
                      else setTermsAccepted(false);
                    }} />
                    <div>
                      <Label htmlFor="terms" className="cursor-pointer text-xs sm:text-sm">I agree to the Platform Rules & Terms</Label>
                      <p className="text-[10px] sm:text-sm text-muted-foreground mt-1">By checking this, you agree to follow our posting guidelines and fair hiring practices.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 8: Contact */}
          {activeStep === 8 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Application & Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">HR Contact Email</Label>
                    <Input type="email" value={hrContactEmail} onChange={(e) => setHrContactEmail(e.target.value)} placeholder="hr@company.com" className="h-9 sm:h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">WhatsApp Number</Label>
                    <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="e.g., 919876543210" className="h-9 sm:h-10 text-sm" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Include country code for direct contact</p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Careers Page URL</Label>
                    <Input type="url" value={careersPageUrl} onChange={(e) => setCareersPageUrl(e.target.value)} placeholder="https://company.com/careers" className="h-9 sm:h-10 text-sm" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation & Save - sticky on mobile */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 z-10">
        <div className="flex gap-1.5 sm:gap-2">
          {activeStep > 0 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(activeStep - 1)} className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
              ← Back
            </Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(activeStep + 1)} className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
              Next →
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
            Step {activeStep + 1} of {steps.length}
          </span>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Terms Dialog */}
      <AlertDialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Platform Rules & Terms</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-xs sm:text-sm">
                <p>By using Hire for Job as an employer, you agree to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Post only legitimate job opportunities</li>
                  <li>Provide accurate company and job information</li>
                  <li>Respond to applicants in a timely manner</li>
                  <li>Follow fair hiring practices without discrimination</li>
                  <li>Protect candidate data and privacy</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTermsAccepted(false)}>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setTermsAccepted(true); setShowTermsDialog(false); }}>Accept Terms</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
