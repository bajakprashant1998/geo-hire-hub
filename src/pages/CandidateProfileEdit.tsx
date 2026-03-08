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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft, User, Save, Loader2, Briefcase, GraduationCap, Plus, X,
    Globe, FileText, Target, MapPin, Heart, Trophy, Clock, Shield, Car,
    Video, Lightbulb, Building2, DollarSign, Compass, Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DatePicker } from '@/components/ui/date-picker';
import {
    WorkExperienceSection, SocialLinksSection, LanguagesSection,
    CertificationsSection, AvailabilitySection,
    type WorkExperience, type SocialLinks, type Language,
} from '@/components/profile';

interface Education {
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
}

interface Project {
    name: string;
    description: string;
    url: string;
    technologies: string[];
}

interface CandidateProfileEditProps {
    embedded?: boolean;
}

const TagInput = ({ items, onAdd, onRemove, input, setInput, placeholder, icon: Icon }: {
    items: string[]; onAdd: () => void; onRemove: (s: string) => void;
    input: string; setInput: (v: string) => void; placeholder: string; icon?: any;
}) => (
    <div className="space-y-3">
        <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
                placeholder={placeholder} />
            <Button type="button" onClick={onAdd} variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
        </div>
        {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 py-1.5 px-3">
                        {Icon && <Icon className="w-3 h-3" />}
                        {item}
                        <X className="w-3 h-3 cursor-pointer hover:text-destructive ml-1" onClick={() => onRemove(item)} />
                    </Badge>
                ))}
            </div>
        )}
    </div>
);

const CandidateProfileEdit = ({ embedded = false }: CandidateProfileEditProps) => {
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

    // NEW: Job Preferences
    const [noticePeriod, setNoticePeriod] = useState('');
    const [workAuthorization, setWorkAuthorization] = useState('');
    const [willingToRelocate, setWillingToRelocate] = useState(false);
    const [remotePreference, setRemotePreference] = useState('no_preference');
    const [currentCompany, setCurrentCompany] = useState('');
    const [currentSalary, setCurrentSalary] = useState('');
    const [salaryCurrency, setSalaryCurrency] = useState('INR');
    const [industryPreference, setIndustryPreference] = useState<string[]>([]);
    const [industryInput, setIndustryInput] = useState('');
    const [careerObjective, setCareerObjective] = useState('');

    // NEW: Personal Details
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [nationality, setNationality] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [addressLine, setAddressLine] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [pincode, setPincode] = useState('');
    const [drivingLicense, setDrivingLicense] = useState(false);
    const [militaryVeteran, setMilitaryVeteran] = useState(false);
    const [disabilityStatus, setDisabilityStatus] = useState('');
    const [referencesAvailable, setReferencesAvailable] = useState(false);

    // NEW: Portfolio & Achievements
    const [videoIntroUrl, setVideoIntroUrl] = useState('');
    const [coverLetterDefault, setCoverLetterDefault] = useState('');
    const [achievements, setAchievements] = useState<string[]>([]);
    const [achievementInput, setAchievementInput] = useState('');
    const [strengths, setStrengths] = useState<string[]>([]);
    const [strengthInput, setStrengthInput] = useState('');
    const [hobbies, setHobbies] = useState<string[]>([]);
    const [hobbyInput, setHobbyInput] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);

    const initialFetchDone = useRef(false);

    useEffect(() => {
        if (authLoading || profileLoading) return;
        if (!user) { navigate('/login'); return; }
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
                .from('candidates').select('*').eq('profile_id', profile.id).maybeSingle();
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
                    setEducation(Array.isArray(data.education) ? data.education as unknown as Education[] : []);
                    setPortfolioUrls(data.portfolio_urls || []);
                    setWhatsappNumber((profile as any).whatsapp_number || '');
                    setHeadline((data as any).headline || '');
                    setWorkExperience(Array.isArray((data as any).work_experience) ? (data as any).work_experience : []);
                    setCertifications((data as any).certifications || []);
                    setLanguages(Array.isArray((data as any).languages) ? (data as any).languages : []);
                    setSocialLinks((data as any).social_links || {});
                    setAvailabilityStatus((data as any).availability_status || 'available');
                    setPreferredJobTypes((data as any).preferred_job_types || []);

                    // New fields
                    setNoticePeriod((data as any).notice_period || '');
                    setWorkAuthorization((data as any).work_authorization || '');
                    setWillingToRelocate((data as any).willing_to_relocate || false);
                    setRemotePreference((data as any).remote_preference || 'no_preference');
                    setCurrentCompany((data as any).current_company || '');
                    setCurrentSalary((data as any).current_salary || '');
                    setSalaryCurrency((data as any).salary_currency || 'INR');
                    setIndustryPreference((data as any).industry_preference || []);
                    setCareerObjective((data as any).career_objective || '');
                    setDateOfBirth((data as any).date_of_birth || '');
                    setGender((data as any).gender || '');
                    setNationality((data as any).nationality || '');
                    setMaritalStatus((data as any).marital_status || '');
                    setAddressLine((data as any).address_line || '');
                    setCity((data as any).city || '');
                    setState((data as any).state || '');
                    setCountry((data as any).country || '');
                    setPincode((data as any).pincode || '');
                    setDrivingLicense((data as any).driving_license || false);
                    setMilitaryVeteran((data as any).military_veteran || false);
                    setDisabilityStatus((data as any).disability_status || '');
                    setReferencesAvailable((data as any).references_available || false);
                    setVideoIntroUrl((data as any).video_intro_url || '');
                    setCoverLetterDefault((data as any).cover_letter_default || '');
                    setAchievements((data as any).achievements || []);
                    setStrengths((data as any).strengths || []);
                    setHobbies((data as any).hobbies || []);
                    setProjects(Array.isArray((data as any).projects) ? (data as any).projects : []);
                }
            }
        } catch (error) {
            console.error('Error fetching candidate:', error);
            toast.error('Failed to load profile');
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    };

    // Tag helpers
    const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
        const val = input.trim();
        if (val && !list.includes(val)) { setList([...list, val]); setInput(''); }
    };
    const removeTag = (list: string[], setList: (v: string[]) => void, item: string) => {
        setList(list.filter(i => i !== item));
    };

    const addSkill = () => addTag(skills, setSkills, skillInput, setSkillInput);
    const removeSkill = (s: string) => removeTag(skills, setSkills, s);
    const addPortfolio = () => addTag(portfolioUrls, setPortfolioUrls, portfolioInput, setPortfolioInput);
    const removePortfolio = (u: string) => removeTag(portfolioUrls, setPortfolioUrls, u);

    const addEducation = () => setEducation([...education, { institution: '', degree: '', field: '', startYear: '', endYear: '' }]);
    const updateEducation = (i: number, f: keyof Education, v: string) => {
        const n = [...education]; n[i] = { ...n[i], [f]: v }; setEducation(n);
    };
    const removeEducation = (i: number) => setEducation(education.filter((_, idx) => idx !== i));

    const addProject = () => setProjects([...projects, { name: '', description: '', url: '', technologies: [] }]);
    const updateProject = (i: number, f: keyof Project, v: any) => {
        const n = [...projects]; n[i] = { ...n[i], [f]: v }; setProjects(n);
    };
    const removeProject = (i: number) => setProjects(projects.filter((_, idx) => idx !== i));

    const jobTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Temporary', 'Remote'];
    const toggleJobType = (type: string) => {
        setPreferredJobTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleSave = async () => {
        if (!candidate || !profile) return;

        // Inline validation
        const errors: string[] = [];
        if (!fullName.trim()) errors.push('Full name is required');
        if (!jobTitle.trim() || jobTitle === 'Not specified') errors.push('Job title is required');
        if (expectedSalary && isNaN(Number(expectedSalary))) errors.push('Expected salary must be a number');
        if (videoIntroUrl && !videoIntroUrl.startsWith('http')) errors.push('Video URL must be a valid link');

        if (errors.length > 0) {
            errors.forEach(e => toast.error(e));
            return;
        }

        setSaving(true);
        try {
            const { error: profileError } = await supabase.from('profiles').update({
                full_name: fullName, avatar_url: avatarUrl || null, whatsapp_number: whatsappNumber || null,
            }).eq('id', profile.id);
            if (profileError) throw profileError;

            const { error: candidateError } = await supabase.from('candidates').update({
                job_title: jobTitle, bio, experience_years: experienceYears,
                expected_salary: expectedSalary, skills,
                education: education as unknown as any, portfolio_urls: portfolioUrls,
                headline: headline || null,
                work_experience: workExperience as unknown as any,
                certifications, languages: languages as unknown as any,
                social_links: socialLinks as unknown as any,
                availability_status: availabilityStatus, preferred_job_types: preferredJobTypes,
                notice_period: noticePeriod || null,
                work_authorization: workAuthorization || null,
                willing_to_relocate: willingToRelocate,
                remote_preference: remotePreference,
                current_company: currentCompany || null,
                current_salary: currentSalary || null,
                salary_currency: salaryCurrency,
                industry_preference: industryPreference,
                career_objective: careerObjective || null,
                date_of_birth: dateOfBirth || null,
                gender: gender || null,
                nationality: nationality || null,
                marital_status: maritalStatus || null,
                address_line: addressLine || null,
                city: city || null,
                state: state || null,
                country: country || null,
                pincode: pincode || null,
                driving_license: drivingLicense,
                military_veteran: militaryVeteran,
                disability_status: disabilityStatus || null,
                references_available: referencesAvailable,
                video_intro_url: videoIntroUrl || null,
                cover_letter_default: coverLetterDefault || null,
                achievements, strengths, hobbies,
                projects: projects as unknown as any,
            }).eq('id', candidate.id);
            if (candidateError) throw candidateError;

            await refreshProfile();
            toast.success('Profile saved successfully ✓');
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || 'Failed to save profile');
        } finally { setSaving(false); }
    };

    if (loading || authLoading || profileLoading) {
        return (
            <div className={embedded ? "flex items-center justify-center p-8" : "min-h-screen bg-secondary flex items-center justify-center"}>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const profileContent = (
        <div className={embedded ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {!embedded && (
                        <Tooltip><TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => navigate('/candidate-dashboard')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger><TooltipContent>Back to dashboard</TooltipContent></Tooltip>
                    )}
                    <div>
                        <h1 className={embedded ? "text-xl font-bold" : "text-2xl font-bold"}>Edit Profile</h1>
                        <p className="text-muted-foreground text-sm">Manage how employers see you</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </Button>
                </div>
            </div>

            {/* Validation hints */}
            {(!fullName.trim() || !jobTitle.trim() || jobTitle === 'Not specified') && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-sm text-amber-800 dark:text-amber-200">
                    <Flag className="w-4 h-4 shrink-0" />
                    <span>
                        {!fullName.trim() && 'Full name is required. '}
                        {(!jobTitle.trim() || jobTitle === 'Not specified') && 'Please set your job title. '}
                        {skills.length === 0 && 'Add at least one skill for better visibility.'}
                    </span>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto gap-1">
                    <TabsTrigger value="profile" className="gap-1.5 text-xs px-2">
                        <User className="w-3.5 h-3.5" /><span className="hidden sm:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="career" className="gap-1.5 text-xs px-2">
                        <Target className="w-3.5 h-3.5" /><span className="hidden sm:inline">Career</span>
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-1.5 text-xs px-2">
                        <Compass className="w-3.5 h-3.5" /><span className="hidden sm:inline">Preferences</span>
                    </TabsTrigger>
                    <TabsTrigger value="personal" className="gap-1.5 text-xs px-2">
                        <Heart className="w-3.5 h-3.5" /><span className="hidden sm:inline">Personal</span>
                    </TabsTrigger>
                    <TabsTrigger value="portfolio" className="gap-1.5 text-xs px-2">
                        <Trophy className="w-3.5 h-3.5" /><span className="hidden sm:inline">Portfolio</span>
                    </TabsTrigger>
                    <TabsTrigger value="resume" className="gap-1.5 text-xs px-2">
                        <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Resume</span>
                    </TabsTrigger>
                </TabsList>

                {/* ======================== TAB 1: PROFILE BASICS ======================== */}
                <TabsContent value="profile" className="space-y-6">
                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Information</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-secondary/50 rounded-lg">
                                {user && <PhotoUpload userId={user.id} currentPhotoUrl={avatarUrl} onPhotoUploaded={setAvatarUrl} size="lg" />}
                                <div className="text-center md:text-left">
                                    <h3 className="font-semibold">Profile Photo</h3>
                                    <p className="text-sm text-muted-foreground">Square image (1:1), at least 200×200px</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                                        className={!fullName.trim() ? 'border-destructive/50 focus-visible:ring-destructive/30' : ''} />
                                    {!fullName.trim() && <p className="text-[11px] text-destructive">Required</p>}
                                </div>
                                <div className="space-y-2"><Label>WhatsApp Number</Label>
                                    <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="e.g., 919876543210" /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Current Job Title *</Label>
                                    <JobCategorySearch value={jobTitle} onChange={setJobTitle} placeholder="e.g., Software Engineer" />
                                    {(!jobTitle.trim() || jobTitle === 'Not specified') && <p className="text-[11px] text-destructive">Required</p>}
                                </div>
                                <div className="space-y-2"><Label>Professional Headline</Label>
                                    <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g., Senior Full Stack Developer | React & Node.js" /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Current Company</Label>
                                    <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="Where you currently work" /></div>
                                <div className="space-y-2"><Label>Experience (years)</Label>
                                    <Input type="number" min={0} max={50} value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} /></div>
                            </div>
                            <div className="space-y-2"><Label>About / Summary</Label>
                                <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a brief professional summary..." rows={4} /></div>
                            <div className="space-y-2"><Label>Career Objective</Label>
                                <Textarea value={careerObjective} onChange={e => setCareerObjective(e.target.value)} placeholder="What are you looking to achieve in your career?" rows={3} /></div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Skills</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={skills} onAdd={addSkill} onRemove={removeSkill} input={skillInput} setInput={setSkillInput} placeholder="Add a skill..." />
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> Key Strengths</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={strengths} onAdd={() => addTag(strengths, setStrengths, strengthInput, setStrengthInput)} onRemove={s => removeTag(strengths, setStrengths, s)} input={strengthInput} setInput={setStrengthInput} placeholder="e.g., Leadership, Problem Solving" />
                        </CardContent>
                    </Card>

                    <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={true} />
                </TabsContent>

                {/* ======================== TAB 2: CAREER HISTORY ======================== */}
                <TabsContent value="career" className="space-y-6">
                    <AvailabilitySection status={availabilityStatus} onChange={setAvailabilityStatus} />
                    <WorkExperienceSection experiences={workExperience} onChange={setWorkExperience} />

                    <Card className="shadow-google border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Education</CardTitle>
                                <Button type="button" onClick={addEducation} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {education.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No education added yet.</p>
                            ) : education.map((edu, i) => (
                                <div key={i} className="p-4 border border-border rounded-lg space-y-3 relative bg-card">
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeEducation(i)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <div className="grid md:grid-cols-2 gap-3 pr-8">
                                        <Input placeholder="Institution" value={edu.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} />
                                        <Input placeholder="Degree" value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <Input placeholder="Field of Study" value={edu.field} onChange={e => updateEducation(i, 'field', e.target.value)} />
                                        <Input placeholder="Start Year" value={edu.startYear} onChange={e => updateEducation(i, 'startYear', e.target.value)} />
                                        <Input placeholder="End Year" value={edu.endYear} onChange={e => updateEducation(i, 'endYear', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <CertificationsSection certifications={certifications} onChange={setCertifications} />
                    <LanguagesSection languages={languages} onChange={setLanguages} />
                </TabsContent>

                {/* ======================== TAB 3: JOB PREFERENCES ======================== */}
                <TabsContent value="preferences" className="space-y-6">
                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Compass className="w-5 h-5 text-primary" /> Job Preferences</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-3">
                                <Label>Preferred Job Types</Label>
                                <div className="flex flex-wrap gap-2">
                                    {jobTypeOptions.map(type => (
                                        <Badge key={type} variant={preferredJobTypes.includes(type) ? "default" : "outline"}
                                            className="cursor-pointer select-none transition-colors" onClick={() => toggleJobType(type)}>
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Notice Period</Label>
                                    <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                                        <SelectTrigger><SelectValue placeholder="Select notice period" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="immediate">Immediately Available</SelectItem>
                                            <SelectItem value="15_days">15 Days</SelectItem>
                                            <SelectItem value="1_month">1 Month</SelectItem>
                                            <SelectItem value="2_months">2 Months</SelectItem>
                                            <SelectItem value="3_months">3 Months</SelectItem>
                                            <SelectItem value="negotiable">Negotiable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Remote Preference</Label>
                                    <Select value={remotePreference} onValueChange={setRemotePreference}>
                                        <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no_preference">No Preference</SelectItem>
                                            <SelectItem value="remote_only">Remote Only</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                            <SelectItem value="onsite">On-site</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="flex items-center gap-2"><Shield className="w-4 h-4" /> Work Authorization</Label>
                                    <Select value={workAuthorization} onValueChange={setWorkAuthorization}>
                                        <SelectTrigger><SelectValue placeholder="Select authorization" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="citizen">Citizen</SelectItem>
                                            <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                                            <SelectItem value="work_visa">Work Visa</SelectItem>
                                            <SelectItem value="student_visa">Student Visa</SelectItem>
                                            <SelectItem value="need_sponsorship">Need Sponsorship</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <Switch checked={willingToRelocate} onCheckedChange={setWillingToRelocate} />
                                    <Label className="cursor-pointer flex items-center gap-2"><MapPin className="w-4 h-4" /> Willing to Relocate</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Salary Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Currency</Label>
                                    <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">₹ INR</SelectItem>
                                            <SelectItem value="USD">$ USD</SelectItem>
                                            <SelectItem value="EUR">€ EUR</SelectItem>
                                            <SelectItem value="GBP">£ GBP</SelectItem>
                                            <SelectItem value="AED">AED</SelectItem>
                                            <SelectItem value="SAR">SAR</SelectItem>
                                            <SelectItem value="SGD">SGD</SelectItem>
                                            <SelectItem value="AUD">AUD</SelectItem>
                                            <SelectItem value="CAD">CAD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Current Salary (Annual)</Label>
                                    <Input value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g., 8,00,000" /></div>
                                <div className="space-y-2"><Label>Expected Salary (Annual)</Label>
                                    <Input value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g., 12,00,000" /></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Industry Preferences</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={industryPreference} onAdd={() => addTag(industryPreference, setIndustryPreference, industryInput, setIndustryInput)} onRemove={s => removeTag(industryPreference, setIndustryPreference, s)} input={industryInput} setInput={setIndustryInput} placeholder="e.g., IT, Healthcare, Finance" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ======================== TAB 4: PERSONAL DETAILS ======================== */}
                <TabsContent value="personal" className="space-y-6">
                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Details</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Date of Birth</Label>
                                    <DatePicker
                                        date={dateOfBirth ? new Date(dateOfBirth) : null}
                                        setDate={(d) => {
                                            if (d) {
                                                const offset = d.getTimezoneOffset()
                                                const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000))
                                                setDateOfBirth(adjustedDate.toISOString().split('T')[0]);
                                            } else {
                                                setDateOfBirth('');
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2"><Label>Gender</Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="non_binary">Non-binary</SelectItem>
                                            <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Marital Status</Label>
                                    <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single</SelectItem>
                                            <SelectItem value="married">Married</SelectItem>
                                            <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="flex items-center gap-2"><Flag className="w-4 h-4" /> Nationality</Label>
                                    <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g., Indian" /></div>
                                <div className="space-y-2"><Label>Disability Status</Label>
                                    <Select value={disabilityStatus} onValueChange={setDisabilityStatus}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="yes">Yes (Person with disability)</SelectItem>
                                            <SelectItem value="prefer_not">Prefer not to disclose</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch checked={drivingLicense} onCheckedChange={setDrivingLicense} />
                                    <Label className="cursor-pointer flex items-center gap-2"><Car className="w-4 h-4" /> Driving License</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={militaryVeteran} onCheckedChange={setMilitaryVeteran} />
                                    <Label className="cursor-pointer flex items-center gap-2"><Shield className="w-4 h-4" /> Military Veteran</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={referencesAvailable} onCheckedChange={setReferencesAvailable} />
                                    <Label className="cursor-pointer">References Available</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Address</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2"><Label>Address Line</Label>
                                <Input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="Street address" /></div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>City</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" /></div>
                                <div className="space-y-2"><Label>State / Province</Label><Input value={state} onChange={e => setState(e.target.value)} placeholder="State" /></div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" /></div>
                                <div className="space-y-2"><Label>PIN / ZIP Code</Label><Input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="PIN code" /></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Hobbies & Interests</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={hobbies} onAdd={() => addTag(hobbies, setHobbies, hobbyInput, setHobbyInput)} onRemove={s => removeTag(hobbies, setHobbies, s)} input={hobbyInput} setInput={setHobbyInput} placeholder="e.g., Reading, Traveling, Coding" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ======================== TAB 5: PORTFOLIO & ACHIEVEMENTS ======================== */}
                <TabsContent value="portfolio" className="space-y-6">
                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Achievements & Awards</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={achievements} onAdd={() => addTag(achievements, setAchievements, achievementInput, setAchievementInput)} onRemove={s => removeTag(achievements, setAchievements, s)} input={achievementInput} setInput={setAchievementInput} placeholder="e.g., Employee of the Year 2024" icon={Trophy} />
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Projects</CardTitle>
                                <Button type="button" onClick={addProject} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {projects.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Showcase your projects to stand out</p>
                                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addProject}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Project
                                    </Button>
                                </div>
                            ) : projects.map((proj, i) => (
                                <div key={i} className="p-4 border border-border rounded-lg space-y-3 relative bg-card">
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProject(i)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <div className="grid md:grid-cols-2 gap-3 pr-8">
                                        <div className="space-y-1"><Label className="text-xs">Project Name</Label>
                                            <Input value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} placeholder="Project name" /></div>
                                        <div className="space-y-1"><Label className="text-xs">Project URL</Label>
                                            <Input value={proj.url} onChange={e => updateProject(i, 'url', e.target.value)} placeholder="https://..." /></div>
                                    </div>
                                    <div className="space-y-1"><Label className="text-xs">Description</Label>
                                        <Textarea value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} placeholder="Brief description..." rows={2} /></div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Portfolio Links</CardTitle></CardHeader>
                        <CardContent>
                            <TagInput items={portfolioUrls} onAdd={addPortfolio} onRemove={removePortfolio} input={portfolioInput} setInput={setPortfolioInput} placeholder="Add portfolio URL..." icon={Globe} />
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Video Introduction</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">Add a video intro URL (YouTube, Loom, etc.) to make your profile stand out</p>
                            <Input value={videoIntroUrl} onChange={e => setVideoIntroUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                        </CardContent>
                    </Card>

                    <Card className="shadow-google border-border">
                        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Default Cover Letter</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea value={coverLetterDefault} onChange={e => setCoverLetterDefault(e.target.value)}
                                placeholder="Write a default cover letter that will be pre-filled when you apply to jobs..." rows={5} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ======================== TAB 6: RESUME FILES ======================== */}
                <TabsContent value="resume" className="space-y-6">
                    {candidate && (
                        <>
                            <Card className="shadow-google border-border">
                                <CardContent className="p-6">
                                    <ResumeUpload candidate={candidate} onUpdate={fetchCandidateProfile} />
                                </CardContent>
                            </Card>
                            <Card className="shadow-google border-border">
                                <CardContent className="p-6">
                                    <AudioResumeCard candidate={candidate} onUpdate={fetchCandidateProfile} />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );

    if (embedded) return profileContent;

    return (
        <EmailVerificationGuard fallbackMessage="Please verify your email to edit your profile.">
            <div className="min-h-screen bg-secondary py-8 px-4">{profileContent}</div>
        </EmailVerificationGuard>
    );
};

export default CandidateProfileEdit;
