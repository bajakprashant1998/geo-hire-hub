import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft, User, Save, Loader2, Briefcase, GraduationCap, Plus, X,
    Globe, FileText, Target, MapPin, Heart, Trophy, Clock, Shield, Car,
    Video, Lightbulb, Building2, Banknote, Compass, Flag, CheckCircle2,
    ChevronRight, Sparkles, AlertCircle, Camera, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DatePicker } from '@/components/ui/date-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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

// Tab configuration with metadata
const TAB_CONFIG = [
    { value: 'profile', label: 'Profile', icon: User, description: 'Basic info & skills', color: 'text-blue-500' },
    { value: 'career', label: 'Career', icon: Target, description: 'Work & education', color: 'text-emerald-500' },
    { value: 'preferences', label: 'Preferences', icon: Compass, description: 'Job preferences', color: 'text-violet-500' },
    { value: 'personal', label: 'Personal', icon: Heart, description: 'Personal details', color: 'text-rose-500' },
    { value: 'portfolio', label: 'Portfolio', icon: Trophy, description: 'Projects & awards', color: 'text-amber-500' },
    { value: 'resume', label: 'Resume', icon: FileText, description: 'Documents', color: 'text-cyan-500' },
];

const TagInput = ({ items, onAdd, onRemove, input, setInput, placeholder, icon: Icon, maxItems }: {
    items: string[]; onAdd: () => void; onRemove: (s: string) => void;
    input: string; setInput: (v: string) => void; placeholder: string; icon?: any; maxItems?: number;
}) => (
    <div className="space-y-3">
        <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
                placeholder={placeholder}
                disabled={maxItems ? items.length >= maxItems : false}
            />
            <Button type="button" onClick={onAdd} variant="outline" size="icon"
                disabled={maxItems ? items.length >= maxItems : false}>
                <Plus className="w-4 h-4" />
            </Button>
        </div>
        {maxItems && (
            <p className="text-[11px] text-muted-foreground">{items.length}/{maxItems} added</p>
        )}
        {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 py-1.5 px-3 group hover:bg-destructive/10 transition-colors">
                        {Icon && <Icon className="w-3 h-3" />}
                        {item}
                        <X className="w-3 h-3 cursor-pointer opacity-50 group-hover:opacity-100 hover:text-destructive ml-1 transition-opacity" onClick={() => onRemove(item)} />
                    </Badge>
                ))}
            </div>
        )}
    </div>
);

// Section wrapper with visual improvement
const SectionCard = ({ icon: Icon, title, subtitle, children, className }: {
    icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <Card className={cn("shadow-sm border-border/60 overflow-hidden hover:shadow-md transition-shadow", className)}>
            <CardHeader className="pb-4 bg-gradient-to-r from-secondary/50 to-transparent">
                <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <span className="text-base">{title}</span>
                        {subtitle && <p className="text-xs font-normal text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">{children}</CardContent>
        </Card>
    </motion.div>
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

    // Job Preferences
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

    // Personal Details
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

    // Portfolio & Achievements
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

    // Calculate per-tab completeness
    const tabCompleteness = useMemo(() => {
        const profile_items = [fullName, avatarUrl, jobTitle, skills.length > 0, bio?.length > 20, strengths.length > 0];
        const career_items = [workExperience.length > 0, education.length > 0, certifications.length > 0, languages.length > 0];
        const preferences_items = [preferredJobTypes.length > 0, noticePeriod, remotePreference !== 'no_preference', expectedSalary];
        const personal_items = [dateOfBirth, gender, nationality, city, country];
        const portfolio_items = [achievements.length > 0, projects.length > 0, portfolioUrls.length > 0];
        const resume_items = [candidate?.resume_url, candidate?.audio_resume_url];

        const calc = (items: any[]) => Math.round((items.filter(Boolean).length / items.length) * 100);
        return {
            profile: calc(profile_items),
            career: calc(career_items),
            preferences: calc(preferences_items),
            personal: calc(personal_items),
            portfolio: calc(portfolio_items),
            resume: calc(resume_items),
        };
    }, [fullName, avatarUrl, jobTitle, skills, bio, strengths, workExperience, education, certifications, languages, preferredJobTypes, noticePeriod, remotePreference, expectedSalary, dateOfBirth, gender, nationality, city, country, achievements, projects, portfolioUrls, candidate]);

    const overallCompleteness = useMemo(() => {
        const vals = Object.values(tabCompleteness);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [tabCompleteness]);

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
            toast.success('Profile saved successfully! ✓');
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || 'Failed to save profile');
        } finally { setSaving(false); }
    };

    const navigateTab = (direction: 'next' | 'prev') => {
        const currentIdx = TAB_CONFIG.findIndex(t => t.value === activeTab);
        const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
        if (newIdx >= 0 && newIdx < TAB_CONFIG.length) {
            setActiveTab(TAB_CONFIG[newIdx].value);
        }
    };

    if (loading || authLoading || profileLoading) {
        return (
            <div className={embedded ? "flex items-center justify-center p-8" : "min-h-screen bg-secondary flex items-center justify-center"}>
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your profile...</p>
                </div>
            </div>
        );
    }

    const currentTabIndex = TAB_CONFIG.findIndex(t => t.value === activeTab);

    const profileContent = (
        <div className={embedded ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>
            {/* Hero Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/60 p-5 sm:p-6"
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-lg" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                                    <Camera className="w-6 h-6 text-primary/50" />
                                </div>
                            )}
                            <div className={cn(
                                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold",
                                overallCompleteness >= 80 ? "bg-emerald-500 text-white" : overallCompleteness >= 50 ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                            )}>
                                {overallCompleteness >= 80 ? '✓' : overallCompleteness + '%'}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {!embedded && (
                                    <Tooltip><TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigate('/candidate-dashboard')}>
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger><TooltipContent>Back to dashboard</TooltipContent></Tooltip>
                                )}
                                <h1 className="text-lg sm:text-xl font-bold truncate">
                                    {fullName || 'Your Profile'}
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{jobTitle || 'Set your job title to get started'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                        <div className="flex-1 sm:hidden">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Progress value={overallCompleteness} className="h-2 flex-1" />
                                <span className="font-semibold text-foreground">{overallCompleteness}%</span>
                            </div>
                        </div>
                        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 shrink-0">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </Button>
                    </div>
                </div>

                {/* Desktop progress bar */}
                <div className="hidden sm:flex items-center gap-3 mt-4 pt-4 border-t border-border/40">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <Progress value={overallCompleteness} className="h-2 flex-1" />
                    <span className="text-xs font-semibold text-foreground shrink-0">{overallCompleteness}% complete</span>
                </div>
            </motion.div>

            {/* Validation Banner */}
            {(!fullName.trim() || !jobTitle.trim() || jobTitle === 'Not specified') && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-sm text-amber-800 dark:text-amber-200"
                >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                        {!fullName.trim() && 'Full name is required. '}
                        {(!jobTitle.trim() || jobTitle === 'Not specified') && 'Please set your job title. '}
                        {skills.length === 0 && 'Add at least one skill for better visibility.'}
                    </span>
                </motion.div>
            )}

            {/* Tab Navigation - Horizontal scrollable with completion indicators */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {TAB_CONFIG.map((tab, idx) => {
                    const completeness = tabCompleteness[tab.value as keyof typeof tabCompleteness];
                    const isActive = activeTab === tab.value;
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all whitespace-nowrap min-w-0 shrink-0",
                                isActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                    : "bg-card border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <div className="relative">
                                <TabIcon className="w-4 h-4" />
                                {completeness === 100 && !isActive && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 absolute -top-1 -right-1" />
                                )}
                            </div>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {!isActive && completeness < 100 && (
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    completeness >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                    completeness >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    {completeness}%
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                >
                    {/* ======================== TAB 1: PROFILE BASICS ======================== */}
                    {activeTab === 'profile' && (
                        <>
                            <SectionCard icon={User} title="Personal Information" subtitle="How employers will identify you">
                                <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-secondary/30 rounded-xl border border-border/40">
                                    {user && <PhotoUpload userId={user.id} currentPhotoUrl={avatarUrl} onPhotoUploaded={setAvatarUrl} size="lg" />}
                                    <div className="text-center md:text-left">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Camera className="w-4 h-4 text-primary" /> Profile Photo
                                        </h3>
                                        <p className="text-sm text-muted-foreground">Square image (1:1), at least 200×200px</p>
                                        {!avatarUrl && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> Profiles with photos get 5× more views
                                            </p>
                                        )}
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
                                <div className="space-y-2">
                                    <Label>About / Summary</Label>
                                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a brief professional summary..." rows={4} />
                                    <p className="text-[11px] text-muted-foreground">{bio?.length || 0} characters {bio?.length < 50 && '• Aim for at least 50 characters'}</p>
                                </div>
                                <div className="space-y-2"><Label>Career Objective</Label>
                                    <Textarea value={careerObjective} onChange={e => setCareerObjective(e.target.value)} placeholder="What are you looking to achieve in your career?" rows={3} /></div>
                            </SectionCard>

                            <SectionCard icon={Zap} title="Skills" subtitle="What you're great at — add up to 30 skills">
                                <TagInput items={skills} onAdd={addSkill} onRemove={removeSkill} input={skillInput} setInput={setSkillInput} placeholder="Add a skill..." maxItems={30} />
                            </SectionCard>

                            <SectionCard icon={Lightbulb} title="Key Strengths" subtitle="Soft skills and personal qualities">
                                <TagInput items={strengths} onAdd={() => addTag(strengths, setStrengths, strengthInput, setStrengthInput)} onRemove={s => removeTag(strengths, setStrengths, s)} input={strengthInput} setInput={setStrengthInput} placeholder="e.g., Leadership, Problem Solving" />
                            </SectionCard>

                            <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={true} />
                        </>
                    )}

                    {/* ======================== TAB 2: CAREER HISTORY ======================== */}
                    {activeTab === 'career' && (
                        <>
                            <AvailabilitySection status={availabilityStatus} onChange={setAvailabilityStatus} />
                            <WorkExperienceSection experiences={workExperience} onChange={setWorkExperience} />

                            <SectionCard icon={GraduationCap} title="Education" subtitle="Your academic background">
                                <div className="flex justify-end">
                                    <Button type="button" onClick={addEducation} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Education</Button>
                                </div>
                                {education.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No education added yet</p>
                                        <p className="text-xs mt-1">Adding education improves your profile visibility</p>
                                    </div>
                                ) : education.map((edu, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 border border-border/60 rounded-xl space-y-3 relative bg-card hover:border-border transition-colors"
                                    >
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEducation(i)}>
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
                                    </motion.div>
                                ))}
                            </SectionCard>

                            <CertificationsSection certifications={certifications} onChange={setCertifications} />
                            <LanguagesSection languages={languages} onChange={setLanguages} />
                        </>
                    )}

                    {/* ======================== TAB 3: JOB PREFERENCES ======================== */}
                    {activeTab === 'preferences' && (
                        <>
                            <SectionCard icon={Compass} title="Job Preferences" subtitle="Help us find the right jobs for you">
                                <div className="space-y-3">
                                    <Label>Preferred Job Types</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {jobTypeOptions.map(type => (
                                            <Badge key={type} variant={preferredJobTypes.includes(type) ? "default" : "outline"}
                                                className="cursor-pointer select-none transition-all hover:scale-105" onClick={() => toggleJobType(type)}>
                                                {preferredJobTypes.includes(type) && <CheckCircle2 className="w-3 h-3 mr-1" />}
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
                            </SectionCard>

                            <SectionCard icon={Banknote} title="Salary Details" subtitle="Keep this private — only used for matching">
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
                            </SectionCard>

                            <SectionCard icon={Building2} title="Industry Preferences" subtitle="Which industries interest you?">
                                <TagInput items={industryPreference} onAdd={() => addTag(industryPreference, setIndustryPreference, industryInput, setIndustryInput)} onRemove={s => removeTag(industryPreference, setIndustryPreference, s)} input={industryInput} setInput={setIndustryInput} placeholder="e.g., IT, Healthcare, Finance" />
                            </SectionCard>
                        </>
                    )}

                    {/* ======================== TAB 4: PERSONAL DETAILS ======================== */}
                    {activeTab === 'personal' && (
                        <>
                            <SectionCard icon={User} title="Personal Details" subtitle="Optional — helps with compliance and diversity">
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
                                <div className="flex flex-wrap gap-x-8 gap-y-4">
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
                            </SectionCard>

                            <SectionCard icon={MapPin} title="Address" subtitle="Your current location">
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
                            </SectionCard>

                            <SectionCard icon={Heart} title="Hobbies & Interests" subtitle="Show your personality">
                                <TagInput items={hobbies} onAdd={() => addTag(hobbies, setHobbies, hobbyInput, setHobbyInput)} onRemove={s => removeTag(hobbies, setHobbies, s)} input={hobbyInput} setInput={setHobbyInput} placeholder="e.g., Reading, Traveling, Coding" />
                            </SectionCard>
                        </>
                    )}

                    {/* ======================== TAB 5: PORTFOLIO & ACHIEVEMENTS ======================== */}
                    {activeTab === 'portfolio' && (
                        <>
                            <SectionCard icon={Trophy} title="Achievements & Awards" subtitle="Highlight your accomplishments">
                                <TagInput items={achievements} onAdd={() => addTag(achievements, setAchievements, achievementInput, setAchievementInput)} onRemove={s => removeTag(achievements, setAchievements, s)} input={achievementInput} setInput={setAchievementInput} placeholder="e.g., Employee of the Year 2024" icon={Trophy} />
                            </SectionCard>

                            <SectionCard icon={Briefcase} title="Projects" subtitle="Showcase what you've built">
                                <div className="flex justify-end">
                                    <Button type="button" onClick={addProject} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Project</Button>
                                </div>
                                {projects.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No projects yet</p>
                                        <p className="text-xs mt-1">Showcase your projects to stand out</p>
                                    </div>
                                ) : projects.map((proj, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 border border-border/60 rounded-xl space-y-3 relative bg-card hover:border-border transition-colors"
                                    >
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
                                    </motion.div>
                                ))}
                            </SectionCard>

                            <SectionCard icon={Globe} title="Portfolio Links" subtitle="Website, Behance, Dribbble, etc.">
                                <TagInput items={portfolioUrls} onAdd={addPortfolio} onRemove={removePortfolio} input={portfolioInput} setInput={setPortfolioInput} placeholder="Add portfolio URL..." icon={Globe} />
                            </SectionCard>

                            <SectionCard icon={Video} title="Video Introduction" subtitle="Stand out with a personal video intro">
                                <p className="text-sm text-muted-foreground">Add a video intro URL (YouTube, Loom, etc.)</p>
                                <Input value={videoIntroUrl} onChange={e => setVideoIntroUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                            </SectionCard>

                            <SectionCard icon={FileText} title="Default Cover Letter" subtitle="Pre-filled when you apply to jobs">
                                <Textarea value={coverLetterDefault} onChange={e => setCoverLetterDefault(e.target.value)}
                                    placeholder="Write a default cover letter..." rows={5} />
                                <p className="text-[11px] text-muted-foreground">{coverLetterDefault?.length || 0} characters</p>
                            </SectionCard>
                        </>
                    )}

                    {/* ======================== TAB 6: RESUME FILES ======================== */}
                    {activeTab === 'resume' && (
                        <>
                            {candidate && (
                                <>
                                    <SectionCard icon={FileText} title="Resume Upload" subtitle="Upload your latest resume (PDF recommended)">
                                        <ResumeUpload candidate={candidate} onUpdate={fetchCandidateProfile} />
                                    </SectionCard>
                                    <SectionCard icon={Briefcase} title="Audio Resume" subtitle="Record a voice introduction">
                                        <AudioResumeCard candidate={candidate} onUpdate={fetchCandidateProfile} />
                                    </SectionCard>
                                </>
                            )}
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between pt-2 pb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateTab('prev')}
                    disabled={currentTabIndex === 0}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {currentTabIndex > 0 ? TAB_CONFIG[currentTabIndex - 1].label : 'Previous'}
                </Button>
                <div className="flex items-center gap-1.5">
                    {TAB_CONFIG.map((_, idx) => (
                        <div key={idx} className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            idx === currentTabIndex ? "bg-primary w-5" : "bg-border"
                        )} />
                    ))}
                </div>
                {currentTabIndex < TAB_CONFIG.length - 1 ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTab('next')}
                        className="gap-2"
                    >
                        {TAB_CONFIG[currentTabIndex + 1].label}
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Profile
                    </Button>
                )}
            </div>
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
