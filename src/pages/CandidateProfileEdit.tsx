import { useState, useEffect, useRef } from 'react';
import { JobCategorySearch } from '@/components/JobCategorySearch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    User,
    Save,
    Loader2,
    Briefcase,
    GraduationCap,
    Plus,
    X,
    Globe,
    FileText,
    Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import {
    WorkExperienceSection,
    SocialLinksSection,
    LanguagesSection,
    CertificationsSection,
    AvailabilitySection,
    type WorkExperience,
    type SocialLinks,
    type Language,
} from '@/components/profile';

interface Education {
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
}

const CandidateProfileEdit = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, loading: authLoading, profileLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [candidate, setCandidate] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profile');

    // Profile fields
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [bio, setBio] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [expectedSalary, setExpectedSalary] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [education, setEducation] = useState<Education[]>([]);
    const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
    const [portfolioInput, setPortfolioInput] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    // Enhanced profile fields
    const [headline, setHeadline] = useState('');
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
    const [certifications, setCertifications] = useState<string[]>([]);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
    const [availabilityStatus, setAvailabilityStatus] = useState('available');
    const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);

    const initialFetchDone = useRef(false);

    useEffect(() => {
        if (authLoading || profileLoading) return;
        if (!user) {
            navigate('/login');
            return;
        }
        if (profile && !initialFetchDone.current) {
            initialFetchDone.current = true;
            fetchCandidateProfile(true);
        } else if (!profile) {
            setLoading(false);
        }
    }, [profile, user, authLoading, profileLoading]);

    const fetchCandidateProfile = async (isInitialLoad = false) => {
        if (!profile) return;
        try {
            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .eq('profile_id', profile.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setCandidate(data);

                if (isInitialLoad) {
                    setFullName(profile.full_name || '');
                    setAvatarUrl(profile.avatar_url || '');
                    setJobTitle(data.job_title || '');
                    setBio(data.bio || '');
                    setExperienceYears(data.experience_years || 0);
                    setExpectedSalary(data.expected_salary || '');
                    setSkills(data.skills || []);

                    // Parse education
                    let parsedEducation: Education[] = [];
                    if (data.education && Array.isArray(data.education)) {
                        parsedEducation = data.education as unknown as Education[];
                    }
                    setEducation(parsedEducation);

                    setPortfolioUrls(data.portfolio_urls || []);
                    setWhatsappNumber((profile as any).whatsapp_number || '');

                    // Enhanced profile fields
                    setHeadline((data as any).headline || '');

                    let parsedWorkExp: WorkExperience[] = [];
                    if ((data as any).work_experience && Array.isArray((data as any).work_experience)) {
                        parsedWorkExp = (data as any).work_experience;
                    }
                    setWorkExperience(parsedWorkExp);

                    setCertifications((data as any).certifications || []);

                    let parsedLanguages: Language[] = [];
                    if ((data as any).languages && Array.isArray((data as any).languages)) {
                        parsedLanguages = (data as any).languages;
                    }
                    setLanguages(parsedLanguages);

                    setSocialLinks((data as any).social_links || {});
                    setAvailabilityStatus((data as any).availability_status || 'available');
                    setPreferredJobTypes((data as any).preferred_job_types || []);
                }
            }
        } catch (error) {
            console.error('Error fetching candidate:', error);
            toast.error('Failed to load profile');
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => {
        setSkills(skills.filter(s => s !== skill));
    };

    const addPortfolio = () => {
        if (portfolioInput.trim() && !portfolioUrls.includes(portfolioInput.trim())) {
            setPortfolioUrls([...portfolioUrls, portfolioInput.trim()]);
            setPortfolioInput('');
        }
    };

    const removePortfolio = (url: string) => {
        setPortfolioUrls(portfolioUrls.filter(u => u !== url));
    };

    const addEducation = () => {
        setEducation([...education, { institution: '', degree: '', field: '', startYear: '', endYear: '' }]);
    };

    const updateEducation = (index: number, field: keyof Education, value: string) => {
        const newEducation = [...education];
        newEducation[index] = { ...newEducation[index], [field]: value };
        setEducation(newEducation);
    };

    const removeEducation = (index: number) => {
        setEducation(education.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!candidate || !profile) return;
        setSaving(true);
        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    avatar_url: avatarUrl || null,
                    whatsapp_number: whatsappNumber || null,
                })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            const { error: candidateError } = await supabase
                .from('candidates')
                .update({
                    job_title: jobTitle,
                    bio,
                    experience_years: experienceYears,
                    expected_salary: expectedSalary,
                    skills,
                    education: education as unknown as any,
                    portfolio_urls: portfolioUrls,
                    headline: headline || null,
                    work_experience: workExperience as unknown as any,
                    certifications,
                    languages: languages as unknown as any,
                    social_links: socialLinks as unknown as any,
                    availability_status: availabilityStatus,
                    preferred_job_types: preferredJobTypes,
                })
                .eq('id', candidate.id);

            if (candidateError) throw candidateError;

            await refreshProfile();
            toast.success('Profile saved successfully');
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading || profileLoading) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <EmailVerificationGuard fallbackMessage="Please verify your email to edit your profile.">
            <div className="min-h-screen bg-secondary py-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => navigate('/candidate-dashboard')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            </TooltipTrigger><TooltipContent>Back to dashboard</TooltipContent></Tooltip>
                            <div>
                                <h1 className="text-2xl font-bold">Public Profile</h1>
                                <p className="text-muted-foreground">Manage how employers see you</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => navigate('/candidate-dashboard')} className="hidden sm:flex">
                                Skip for now
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Profile
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid grid-cols-3 w-full">
                            <TabsTrigger value="profile" className="gap-2">
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">Profile Basics</span>
                            </TabsTrigger>
                            <TabsTrigger value="career" className="gap-2">
                                <Target className="w-4 h-4" />
                                <span className="hidden sm:inline">Career History</span>
                            </TabsTrigger>
                            <TabsTrigger value="resume" className="gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">Resume Files</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6">
                            <Card className="shadow-google">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-secondary/50 rounded-lg">
                                        {user && (
                                            <PhotoUpload
                                                userId={user.id}
                                                currentPhotoUrl={avatarUrl}
                                                onPhotoUploaded={setAvatarUrl}
                                                size="lg"
                                            />
                                        )}
                                        <div className="text-center md:text-left">
                                            <h3 className="font-semibold">Profile Photo</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Upload a professional photo. Recommended: Square image (1:1 ratio), at least 200x200px.
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName">Full Name *</Label>
                                            <Input
                                                id="fullName"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsapp">WhatsApp Number</Label>
                                            <Input
                                                id="whatsapp"
                                                value={whatsappNumber}
                                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                                placeholder="e.g., 919876543210"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="jobTitle">Current Job Title *</Label>
                                            <JobCategorySearch
                                                value={jobTitle}
                                                onChange={setJobTitle}
                                                placeholder="e.g., Software Engineer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="headline">Professional Headline</Label>
                                            <Input
                                                id="headline"
                                                value={headline}
                                                onChange={(e) => setHeadline(e.target.value)}
                                                placeholder="e.g., Senior Full Stack Developer | React & Node.js"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bio">About / Summary</Label>
                                        <Textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Write a brief summary about yourself..."
                                            rows={4}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-google">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-primary" />
                                        Skills
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                            placeholder="Add a skill..."
                                        />
                                        <Button type="button" onClick={addSkill} variant="outline">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map((skill, index) => (
                                            <Badge key={index} variant="secondary" className="gap-1 py-1.5 px-3">
                                                {skill}
                                                <X
                                                    className="w-3 h-3 cursor-pointer hover:text-destructive ml-1"
                                                    onClick={() => removeSkill(skill)}
                                                />
                                            </Badge>
                                        ))}
                                        {skills.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No skills added yet</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <SocialLinksSection
                                links={socialLinks}
                                onChange={setSocialLinks}
                                showGithub={true}
                            />
                        </TabsContent>

                        <TabsContent value="career" className="space-y-6">
                            <AvailabilitySection
                                status={availabilityStatus}
                                onChange={setAvailabilityStatus}
                            />

                            <WorkExperienceSection
                                experiences={workExperience}
                                onChange={setWorkExperience}
                            />

                            <Card className="shadow-google">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-primary" />
                                            Education
                                        </CardTitle>
                                        <Button type="button" onClick={addEducation} variant="outline" size="sm">
                                            <Plus className="w-4 h-4 mr-1" /> Add
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {education.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No education added yet.
                                        </p>
                                    ) : (
                                        education.map((edu, index) => (
                                            <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => removeEducation(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <Input
                                                        placeholder="Institution"
                                                        value={edu.institution}
                                                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="Degree"
                                                        value={edu.degree}
                                                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <Input
                                                        placeholder="Field of Study"
                                                        value={edu.field}
                                                        onChange={(e) => updateEducation(index, 'field', e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="Start Year"
                                                        value={edu.startYear}
                                                        onChange={(e) => updateEducation(index, 'startYear', e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="End Year"
                                                        value={edu.endYear}
                                                        onChange={(e) => updateEducation(index, 'endYear', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <CertificationsSection
                                certifications={certifications}
                                onChange={setCertifications}
                            />

                            <LanguagesSection
                                languages={languages}
                                onChange={setLanguages}
                            />
                        </TabsContent>

                        <TabsContent value="resume" className="space-y-6">
                            {candidate && (
                                <>
                                    <Card className="shadow-google">
                                        <CardContent className="p-6">
                                            <ResumeUpload
                                                candidate={candidate}
                                                onUpdate={fetchCandidateProfile}
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-google">
                                        <CardContent className="p-6">
                                            <AudioResumeCard
                                                candidate={candidate}
                                                onUpdate={fetchCandidateProfile}
                                            />
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </EmailVerificationGuard>
    );
};

export default CandidateProfileEdit;
