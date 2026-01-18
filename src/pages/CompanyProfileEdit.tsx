import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft,
  Building2,
  Save,
  Eye,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfileCompletenessBar } from '@/components/employer/ProfileCompletenessBar';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { DocumentUpload } from '@/components/employer/DocumentUpload';

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
  'Technology',
  'Media & Entertainment',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Hospitality',
  'Construction',
  'Transportation',
  'Other',
];

const CompanyProfileEdit = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  
  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [officePhotoUrl, setOfficePhotoUrl] = useState('');
  const [businessCardUrl, setBusinessCardUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    fetchEmployerProfile();
  }, [profile]);

  const fetchEmployerProfile = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
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
        setVerificationStatus((data.verification_status as 'pending' | 'approved' | 'rejected') || 'pending');
        setTermsAccepted(!!data.terms_accepted_at);
        setCompleteness(data.profile_completeness || 0);

        // Recalculate completeness
        const { data: calcData } = await supabase
          .rpc('calculate_employer_profile_completeness', { p_employer_id: data.id });
        if (typeof calcData === 'number') {
          setCompleteness(calcData);
        }
      }
    } catch (error) {
      console.error('Error fetching employer:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMissingFields = () => {
    const missing: string[] = [];
    if (!companyName) missing.push('Company Name');
    if (!industry) missing.push('Industry');
    if (!description || description.length < 20) missing.push('Company Description (min 20 chars)');
    if (!countryCode) missing.push('Country');
    if (!taxId) missing.push('Tax ID');
    if (!officePhotoUrl) missing.push('Office Photo');
    if (!businessCardUrl) missing.push('Business Card');
    return missing;
  };

  const handleSave = async () => {
    if (!employerId) return;

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
      };

      const { error } = await supabase
        .from('employers')
        .update(updates)
        .eq('id', employerId);

      if (error) throw error;

      // Recalculate completeness
      const { data: calcData } = await supabase
        .rpc('calculate_employer_profile_completeness', { p_employer_id: employerId });
      
      if (typeof calcData === 'number') {
        setCompleteness(calcData);
        
        // Update the completeness in DB
        await supabase
          .from('employers')
          .update({ profile_completeness: calcData })
          .eq('id', employerId);
      }

      toast.success('Profile saved successfully');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getTaxLabel = () => {
    return countries.find(c => c.code === countryCode)?.taxLabel || 'Tax ID';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Company Profile</h1>
              <p className="text-muted-foreground">Complete your profile to post jobs</p>
            </div>
          </div>
          <VerificationBadge status={verificationStatus} />
        </div>

        {/* Completeness Bar */}
        <Card className="shadow-google">
          <CardContent className="p-6">
            <ProfileCompletenessBar 
              completeness={completeness}
              missingFields={calculateMissingFields()}
            />
          </CardContent>
        </Card>

        {/* Verification Warning */}
        {verificationStatus === 'pending' && completeness >= 100 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Pending Admin Approval</p>
                <p className="text-sm text-muted-foreground">
                  Your profile is complete and under review. You'll be notified once approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {verificationStatus === 'rejected' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Verification Rejected</p>
                <p className="text-sm text-muted-foreground">
                  Please update your profile and resubmit for verification.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info */}
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                {description.length}/20 characters minimum
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Legal Information
            </CardTitle>
            <CardDescription>
              Required for verification and compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">{getTaxLabel()} *</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder={`Enter your ${getTaxLabel()}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle>Trust Documents</CardTitle>
            <CardDescription>
              Upload photos to build trust with candidates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <>
                <DocumentUpload
                  userId={user.id}
                  type="office"
                  currentUrl={officePhotoUrl}
                  onUploaded={setOfficePhotoUrl}
                  label="Office Photo"
                  description="Upload a photo of your office or workspace"
                />
                <DocumentUpload
                  userId={user.id}
                  type="business-card"
                  currentUrl={businessCardUrl}
                  onUploaded={setBusinessCardUrl}
                  label="Business Card"
                  description="Upload your business or visiting card"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Terms Acceptance */}
        <Card className="shadow-google">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  if (checked && !termsAccepted) {
                    setShowTermsDialog(true);
                  } else {
                    setTermsAccepted(false);
                  }
                }}
              />
              <div>
                <Label htmlFor="terms" className="cursor-pointer">
                  I agree to the Platform Rules & Terms
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  By checking this box, you agree to follow our posting guidelines and fair hiring practices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(`/employers/${employerId}`)}>
            <Eye className="w-4 h-4 mr-2" />
            View as Candidate
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Profile
          </Button>
        </div>
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
                <p className="text-muted-foreground">
                  Violation of these terms may result in account suspension.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTermsAccepted(false)}>
              Decline
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setTermsAccepted(true);
              setShowTermsDialog(false);
            }}>
              Accept Terms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyProfileEdit;
