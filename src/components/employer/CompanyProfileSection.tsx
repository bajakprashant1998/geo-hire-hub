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
  Building2,
  Save,
  Eye,
  FileText,
  Loader2,
  AlertTriangle,
  Heart,
  Gift,
  Globe,
  Camera,
  CreditCard,
  CheckCircle2,
  Shield,
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
import { motion } from 'framer-motion';

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
  'Real Estate', 'Hospitality', 'Construction', 'Transportation', 'Other',
];

interface CompanyProfileSectionProps {
  onViewPublicProfile?: () => void;
}

export const CompanyProfileSection = ({ onViewPublicProfile }: CompanyProfileSectionProps) => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Form fields
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

  // Enhanced fields
  const [teamSize, setTeamSize] = useState('');
  const [foundingYear, setFoundingYear] = useState<number | null>(null);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [cultureDescription, setCultureDescription] = useState('');
  const [hiringProcess, setHiringProcess] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);

  const initialFetchDone = useRef(false);

  const steps = [
    { label: 'Branding', icon: Building2, description: 'Logo & basic info' },
    { label: 'Details', icon: Globe, description: 'Legal & contact' },
    { label: 'Culture', icon: Heart, description: 'Culture & benefits' },
    { label: 'Documents', icon: FileText, description: 'Trust & verify' },
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
      const updates = {
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
      {/* Header with verification badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Company Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete your profile to attract top talent</p>
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

      {/* Completeness Card */}
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
              <p className="text-xs text-muted-foreground">Your profile is under review. You'll be notified once approved.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {verificationStatus === 'rejected' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Verification Rejected</p>
              <p className="text-xs text-muted-foreground">Please update your profile and resubmit for verification.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, idx) => (
          <button
            key={step.label}
            onClick={() => setActiveStep(idx)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
              activeStep === idx
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            <step.icon className="w-4 h-4 shrink-0" />
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <motion.div
        key={activeStep}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeStep === 0 && (
          <div className="space-y-6">
            {/* Logo & Branding */}
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
                    <LogoUpload
                      userId={user.id}
                      currentLogoUrl={logoUrl}
                      onLogoUploaded={setLogoUrl}
                      size="lg"
                    />
                  )}
                  <div className="text-center md:text-left">
                    <h3 className="font-semibold text-foreground">Company Logo</h3>
                    <p className="text-sm text-muted-foreground">Square image, at least 200×200px</p>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Company Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell candidates about your company (min 20 characters)"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">{description.length}/20 characters minimum</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-6">
            {/* Contact & Legal */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Contact & Website
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input id="website" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input id="whatsapp" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="e.g., 919876543210" />
                  <p className="text-xs text-muted-foreground">Include country code for direct WhatsApp contact</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Legal Information
                </CardTitle>
                <CardDescription>Required for verification and compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
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

        {activeStep === 2 && (
          <div className="space-y-6">
            <CompanyCultureSection
              culture={cultureDescription}
              hiringProcess={hiringProcess}
              teamSize={teamSize}
              foundingYear={foundingYear}
              onCultureChange={setCultureDescription}
              onHiringProcessChange={setHiringProcess}
              onTeamSizeChange={setTeamSize}
              onFoundingYearChange={setFoundingYear}
            />
            <CompanyBenefitsSection benefits={benefits} onChange={setBenefits} />
            <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={false} />
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Trust Documents
                </CardTitle>
                <CardDescription>Upload photos to build trust with candidates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user && (
                  <>
                    <DocumentUpload
                      userId={user.id}
                      type="office"
                      currentUrl={officePhotoUrl}
                      onUploaded={(url) => autoSaveDocument('office_photo_url', url)}
                      label="Office Photo"
                      description="Upload a photo of your office or workspace"
                    />
                    <DocumentUpload
                      userId={user.id}
                      type="business-card"
                      currentUrl={businessCardUrl}
                      onUploaded={(url) => autoSaveDocument('business_card_url', url)}
                      label="Business Card"
                      description="Upload your business or visiting card"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      if (checked && !termsAccepted) setShowTermsDialog(true);
                      else setTermsAccepted(false);
                    }}
                  />
                  <div>
                    <Label htmlFor="terms" className="cursor-pointer font-medium">
                      I agree to the Platform Rules & Terms
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      By checking this box, you agree to follow our posting guidelines and fair hiring practices.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Sticky Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          {activeStep > 0 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(s => s - 1)}>
              Previous
            </Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button variant="outline" size="sm" onClick={() => setActiveStep(s => s + 1)}>
              Next
            </Button>
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
                  <li>Not misuse candidate contact information</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTermsAccepted(false)}>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setTermsAccepted(true); setShowTermsDialog(false); }}>
              Accept Terms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
