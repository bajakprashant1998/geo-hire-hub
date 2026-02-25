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
  Globe, Camera, CreditCard, MapPin, Briefcase, DollarSign, TrendingUp,
  Target, Star, Users, GraduationCap, Award, Phone, Mail, Link2,
  Laptop, Zap, Shield, BookOpen, BarChart3, Plus, X, Check,
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
  CompanyCultureSection,
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
    { label: 'Basic Info', icon: Building2 },
    { label: 'Location', icon: MapPin },
    { label: 'Hiring', icon: Briefcase },
    { label: 'Compensation', icon: DollarSign },
    { label: 'Growth', icon: TrendingUp },
    { label: 'Skills Match', icon: Target },
    { label: 'Culture', icon: Heart },
    { label: 'Documents', icon: FileText },
    { label: 'Contact', icon: Phone },
  ];

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
    if (!companyName) missing.push('Company Name');
    if (!industry) missing.push('Industry');
    if (!description || description.length < 20) missing.push('Company Description');
    if (!countryCode) missing.push('Country');
    if (!taxId) missing.push('Tax ID');
    if (!officePhotoUrl) missing.push('Office Photo');
    if (!businessCardUrl) missing.push('Business Card');
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

  const autoSaveDocument = async (field: 'office_photo_url' | 'business_card_url', url: string) => {
    if (!employerId) return;
    try {
      const { error } = await supabase.from('employers').update({ [field]: url || null }).eq('id', employerId);
      if (error) throw error;
      if (field === 'office_photo_url') setOfficePhotoUrl(url);
      else setBusinessCardUrl(url);
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

  const getTaxLabel = () => countries.find(c => c.code === countryCode)?.taxLabel || 'Tax ID';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Company Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete your profile to attract top talent & enable AI matching</p>
        </div>
        <div className="flex items-center gap-3">
          <VerificationBadge status={verificationStatus} />
          {onViewPublicProfile && (
            <Button variant="outline" size="sm" onClick={onViewPublicProfile} className="gap-1.5">
              <Eye className="w-4 h-4" /> Preview
            </Button>
          )}
        </div>
      </div>

      {/* Completeness */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardContent className="p-5">
            <ProfileCompletenessBar completeness={completeness} missingFields={calculateMissingFields()} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Verification Warnings */}
      {verificationStatus === 'pending' && completeness >= 100 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Pending Admin Approval</p>
              <p className="text-xs text-muted-foreground">Your profile is under review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Navigation - scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {steps.map((step, idx) => (
          <button
            key={step.label}
            onClick={() => setActiveStep(idx)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border shrink-0",
              activeStep === idx
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
            <step.icon className="w-3.5 h-3.5 shrink-0" />
            <span>{step.label}</span>
          </button>
        ))}
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
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Camera className="w-5 h-5 text-primary" />
                    Company Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-muted/30 rounded-xl">
                    {user && (
                      <LogoUpload userId={user.id} currentLogoUrl={logoUrl} onLogoUploaded={setLogoUrl} size="lg" />
                    )}
                    <div className="text-center md:text-left">
                      <h3 className="font-semibold text-foreground">Company Logo</h3>
                      <p className="text-sm text-muted-foreground">Square image, at least 200×200px</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company Name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry *</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (<SelectItem key={ind} value={ind}>{ind}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <CompanyCultureSection
                      culture="" hiringProcess="" teamSize={teamSize} foundingYear={foundingYear}
                      onCultureChange={() => {}} onHiringProcessChange={() => {}}
                      onTeamSizeChange={setTeamSize} onFoundingYearChange={setFoundingYear}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Description *</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell candidates about your company..." rows={4} />
                    <p className="text-xs text-muted-foreground">{description.length}/20 characters minimum</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourcompany.com" />
                  </div>
                  {/* Legal */}
                  <Separator />
                  <h4 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Legal Information</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{getTaxLabel()} *</Label>
                      <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder={`Enter your ${getTaxLabel()}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1: Location & Work Setup */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="w-5 h-5 text-primary" /> Location & Work Setup</CardTitle>
                  <CardDescription>Important for AI nearby job matching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Work Environment</Label>
                    <Select value={workEnvironment} onValueChange={setWorkEnvironment}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">🏢 Onsite</SelectItem>
                        <SelectItem value="remote">🏠 Remote</SelectItem>
                        <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Office Locations</Label>
                    <TagInput tags={officeLocations} onChange={setOfficeLocations} placeholder="Add city, e.g. New York, Mumbai" />
                    <p className="text-xs text-muted-foreground">Add all your office locations for better AI matching</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Label className="font-medium">Relocation Support</Label>
                      <p className="text-xs text-muted-foreground">Do you offer relocation assistance?</p>
                    </div>
                    <Switch checked={relocationSupport} onCheckedChange={setRelocationSupport} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2: Hiring & Job Information */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="w-5 h-5 text-primary" /> Hiring Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Label className="font-medium">Internship Available</Label>
                        <p className="text-xs text-muted-foreground">Offer internship positions?</p>
                      </div>
                      <Switch checked={internshipAvailable} onCheckedChange={setInternshipAvailable} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Label className="font-medium">Fresher Hiring</Label>
                        <p className="text-xs text-muted-foreground">Hire fresh graduates?</p>
                      </div>
                      <Switch checked={fresherHiring} onCheckedChange={setFresherHiring} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Hiring Process</Label>
                    <Textarea value={hiringProcess} onChange={(e) => setHiringProcess(e.target.value)} placeholder="e.g., Application → Phone Screen → Technical → Final → Offer" rows={3} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Interview Rounds</Label>
                      <Select value={interviewRoundsCount?.toString() || ''} onValueChange={(v) => setInterviewRoundsCount(v ? parseInt(v) : null)}>
                        <SelectTrigger><SelectValue placeholder="Select rounds" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (<SelectItem key={n} value={n.toString()}>{n} round{n > 1 ? 's' : ''}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Typical Hiring Timeline</Label>
                      <Select value={hiringTimeline} onValueChange={setHiringTimeline}>
                        <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Assessment Types</Label>
                    <TagInput tags={assessmentTypes} onChange={setAssessmentTypes} placeholder="e.g. Coding test, Case study, Group discussion" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3: Compensation & Benefits */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="w-5 h-5 text-primary" /> Salary & Compensation</CardTitle>
                  <CardDescription>Critical for AI salary advice & matching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Average Salary Range</Label>
                    <Input value={avgSalaryRange} onChange={(e) => setAvgSalaryRange(e.target.value)} placeholder="e.g., $50,000 - $150,000 / year" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus Structure</Label>
                    <Textarea value={bonusStructure} onChange={(e) => setBonusStructure(e.target.value)} placeholder="e.g., Annual performance bonus up to 20%, quarterly incentives..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid Leaves Policy</Label>
                    <Input value={paidLeavesPolicy} onChange={(e) => setPaidLeavesPolicy(e.target.value)} placeholder="e.g., 25 days annual leave + 10 sick days" />
                  </div>
                  <div className="space-y-2">
                    <Label>Learning & Training Budget</Label>
                    <Input value={learningBudget} onChange={(e) => setLearningBudget(e.target.value)} placeholder="e.g., $2,000/year per employee" />
                  </div>
                </CardContent>
              </Card>
              <CompanyBenefitsSection benefits={benefits} onChange={setBenefits} />
            </div>
          )}

          {/* 4: Growth & Career */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="w-5 h-5 text-primary" /> Growth & Career Opportunities</CardTitle>
                  <CardDescription>Critical for AI career prediction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Promotion Frequency</Label>
                    <Select value={promotionFrequency} onValueChange={setPromotionFrequency}>
                      <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6-12 months">Every 6-12 months</SelectItem>
                        <SelectItem value="1-2 years">Every 1-2 years</SelectItem>
                        <SelectItem value="2-3 years">Every 2-3 years</SelectItem>
                        <SelectItem value="performance-based">Performance-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Career Growth Paths</Label>
                    <Textarea value={careerGrowthPaths} onChange={(e) => setCareerGrowthPaths(e.target.value)} placeholder="Describe career progression, leadership programs, internal mobility..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Retention Rate</Label>
                    <Select value={employeeRetentionRate} onValueChange={setEmployeeRetentionRate}>
                      <SelectTrigger><SelectValue placeholder="Select retention rate" /></SelectTrigger>
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
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-primary" /> Skill & Role Alignment</CardTitle>
                  <CardDescription>Used for AI candidate match % calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Key Skills You Hire For</Label>
                    <TagInput tags={keySkillsHiring} onChange={setKeySkillsHiring} placeholder="e.g. React, Python, Sales, Marketing" />
                  </div>
                  <div className="space-y-2">
                    <Label>Technology Stack</Label>
                    <TagInput tags={techStack} onChange={setTechStack} placeholder="e.g. AWS, React, PostgreSQL, Docker" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Certifications</Label>
                    <TagInput tags={preferredCertifications} onChange={setPreferredCertifications} placeholder="e.g. AWS Certified, PMP, Google Analytics" />
                  </div>
                  <div className="space-y-2">
                    <Label>Education Preference</Label>
                    <Select value={educationPreference} onValueChange={setEducationPreference}>
                      <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Company Specializations</Label>
                    <TagInput tags={specializations} onChange={setSpecializations} placeholder="e.g. AI/ML, FinTech, SaaS" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 6: Culture & Work Environment */}
          {activeStep === 6 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><Heart className="w-5 h-5 text-primary" /> Company Culture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Work Culture Type</Label>
                    <Select value={workCultureType} onValueChange={setWorkCultureType}>
                      <SelectTrigger><SelectValue placeholder="Select culture type" /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Culture Description</Label>
                    <Textarea value={cultureDescription} onChange={(e) => setCultureDescription(e.target.value)} placeholder="What makes your company culture unique?" rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Values</Label>
                    <TagInput tags={companyValues} onChange={setCompanyValues} placeholder="e.g. Innovation, Transparency, Customer First" />
                  </div>
                  <div className="space-y-3">
                    <Label>Work-Life Balance Rating</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[workLifeBalanceRating]}
                        onValueChange={(v) => setWorkLifeBalanceRating(v[0])}
                        min={1} max={5} step={1}
                        className="flex-1"
                      />
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={cn("w-4 h-4", s <= workLifeBalanceRating ? "text-warning fill-warning" : "text-muted-foreground")} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Diversity & Inclusion Policies</Label>
                    <Textarea value={diversityPolicies} onChange={(e) => setDiversityPolicies(e.target.value)} placeholder="Describe your D&I initiatives..." rows={3} />
                  </div>
                </CardContent>
              </Card>
              <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={false} />
            </div>
          )}

          {/* 7: Documents & Media */}
          {activeStep === 7 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-primary" /> Trust Documents & Media</CardTitle>
                  <CardDescription>Upload photos and documents to build trust</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user && (
                    <>
                      <DocumentUpload userId={user.id} type="office" currentUrl={officePhotoUrl} onUploaded={(url) => autoSaveDocument('office_photo_url', url)} label="Office Photo" description="Upload a photo of your office or workspace" />
                      <DocumentUpload userId={user.id} type="business-card" currentUrl={businessCardUrl} onUploaded={(url) => autoSaveDocument('business_card_url', url)} label="Business Card" description="Upload your business or visiting card" />
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><Award className="w-5 h-5 text-primary" /> Awards & Recognition</CardTitle>
                </CardHeader>
                <CardContent>
                  <TagInput tags={awardsRecognition} onChange={setAwardsRecognition} placeholder="e.g. Best Workplace 2024, Forbes 500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => {
                      if (checked && !termsAccepted) setShowTermsDialog(true);
                      else setTermsAccepted(false);
                    }} />
                    <div>
                      <Label htmlFor="terms" className="cursor-pointer">I agree to the Platform Rules & Terms</Label>
                      <p className="text-sm text-muted-foreground mt-1">By checking this, you agree to follow our posting guidelines and fair hiring practices.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 8: Contact */}
          {activeStep === 8 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg"><Phone className="w-5 h-5 text-primary" /> Application & Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>HR Contact Email</Label>
                    <Input type="email" value={hrContactEmail} onChange={(e) => setHrContactEmail(e.target.value)} placeholder="hr@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="e.g., 919876543210" />
                    <p className="text-xs text-muted-foreground">Include country code for direct contact</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Careers Page URL</Label>
                    <Input type="url" value={careersPageUrl} onChange={(e) => setCareersPageUrl(e.target.value)} placeholder="https://company.com/careers" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation & Save */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          {activeStep > 0 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(activeStep - 1)}>← Previous</Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(activeStep + 1)}>Next →</Button>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </Button>
      </div>

      {/* Terms Dialog */}
      <AlertDialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Platform Rules & Terms</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
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
