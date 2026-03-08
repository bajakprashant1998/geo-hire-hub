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
    ChevronRight, ChevronLeft, Sparkles, AlertCircle, Camera, Zap, Eye,
    Info
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
import { AIGenerateButton, AIIndustrySuggestButton } from '@/components/candidate/AIGenerateButton';
import { WorldCityAutocomplete } from '@/components/WorldCityAutocomplete';
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

const TAB_CONFIG = [
    { value: 'profile', label: 'Profile', icon: User, description: 'Basic info & skills', tip: 'A complete profile gets 5× more views' },
    { value: 'career', label: 'Career', icon: Target, description: 'Work & education', tip: 'Employers look at experience first' },
    { value: 'preferences', label: 'Preferences', icon: Compass, description: 'Job preferences', tip: 'Better matching = better jobs' },
    { value: 'personal', label: 'Personal', icon: Heart, description: 'Personal details', tip: 'Optional but helps with diversity' },
    { value: 'portfolio', label: 'Portfolio', icon: Trophy, description: 'Projects & awards', tip: 'Stand out from the crowd' },
    { value: 'resume', label: 'Resume', icon: FileText, description: 'Documents', tip: 'PDF resumes are preferred' },
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
                className="bg-background/50"
            />
            <Button type="button" onClick={onAdd} variant="outline" size="icon"
                disabled={maxItems ? items.length >= maxItems : false}
                className="shrink-0">
                <Plus className="w-4 h-4" />
            </Button>
        </div>
        {maxItems && (
            <div className="flex items-center gap-2">
                <Progress value={(items.length / maxItems) * 100} className="h-1.5 flex-1" />
                <span className="text-[11px] text-muted-foreground font-medium">{items.length}/{maxItems}</span>
            </div>
        )}
        {items.length > 0 && (
            <motion.div layout className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <motion.div
                        key={item}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                    >
                        <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 group hover:bg-destructive/10 transition-all cursor-default">
                            {Icon && <Icon className="w-3 h-3 text-primary/70" />}
                            <span className="text-sm">{item}</span>
                            <X className="w-3 h-3 cursor-pointer opacity-40 group-hover:opacity-100 hover:text-destructive ml-0.5 transition-all" onClick={() => onRemove(item)} />
                        </Badge>
                    </motion.div>
                ))}
            </motion.div>
        )}
    </div>
);

const SectionCard = ({ icon: Icon, title, subtitle, children, className, tip }: {
    icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode; className?: string; tip?: string;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
        <Card className={cn(
            "shadow-sm border-border/50 overflow-hidden transition-all duration-300",
            "hover:shadow-md hover:border-border/80",
            "bg-card/80 backdrop-blur-sm",
            className
        )}>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Icon className="w-[18px] h-[18px] text-primary" />
                        </div>
                        <div>
                            <span className="text-base font-semibold">{title}</span>
                            {subtitle && <p className="text-xs font-normal text-muted-foreground mt-0.5">{subtitle}</p>}
                        </div>
                    </CardTitle>
                    {tip && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-help shrink-0">
                                    <Info className="w-4 h-4 text-muted-foreground/60" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[200px]">{tip}</TooltipContent>
                        </Tooltip>
                    )}
                </div>
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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [suggestingSkills, setSuggestingSkills] = useState(false);
    const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
    const [suggestedIndustries, setSuggestedIndustries] = useState<string[]>([]);

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

    const [headline, setHeadline] = useState('');
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
    const [certifications, setCertifications] = useState<string[]>([]);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
    const [availabilityStatus, setAvailabilityStatus] = useState('available');
    const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);

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
    const initialLoadedRef = useRef(false);

    // Mark unsaved after initial load
    useEffect(() => {
        if (initialLoadedRef.current) {
            setHasUnsavedChanges(true);
        }
    }, [fullName, avatarUrl, jobTitle, bio, experienceYears, expectedSalary, skills, education, portfolioUrls, whatsappNumber, headline, workExperience, certifications, languages, socialLinks, availabilityStatus, preferredJobTypes, noticePeriod, workAuthorization, willingToRelocate, remotePreference, currentCompany, currentSalary, salaryCurrency, industryPreference, careerObjective, dateOfBirth, gender, nationality, maritalStatus, addressLine, city, state, country, pincode, drivingLicense, militaryVeteran, disabilityStatus, referencesAvailable, videoIntroUrl, coverLetterDefault, achievements, strengths, hobbies, projects]);

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
                    // Mark initial load complete after a tick
                    setTimeout(() => { initialLoadedRef.current = true; }, 100);
                }
            }
        } catch (error) {
            console.error('Error fetching candidate:', error);
            toast.error('Failed to load profile');
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    };

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
            setHasUnsavedChanges(false);
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (loading || authLoading || profileLoading) {
        return (
            <div className={embedded ? "flex items-center justify-center p-8" : "min-h-screen bg-background flex items-center justify-center"}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-7 h-7 animate-spin text-primary" />
                        </div>
                    </div>
                    <div>
                        <p className="font-medium text-foreground">Loading your profile</p>
                        <p className="text-sm text-muted-foreground mt-1">Just a moment...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    const currentTabIndex = TAB_CONFIG.findIndex(t => t.value === activeTab);
    const currentTab = TAB_CONFIG[currentTabIndex];
    const completenessColor = overallCompleteness >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
        overallCompleteness >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive';
    const completenessLabel = overallCompleteness >= 80 ? 'Strong' :
        overallCompleteness >= 50 ? 'Good start' : 'Needs work';

    const profileContent = (
        <div className={embedded ? "space-y-5 pb-24" : "max-w-4xl mx-auto space-y-5 pb-24"}>
            {/* ═══════════ HERO HEADER ═══════════ */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm"
            >
                {/* Decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04] pointer-events-none" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.06] rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />

                <div className="relative p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="relative shrink-0 group">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="" className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-border/60 shadow-md group-hover:border-primary/30 transition-colors" />
                                ) : (
                                    <div className="w-[72px] h-[72px] rounded-2xl bg-secondary flex items-center justify-center border-2 border-dashed border-border/60">
                                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                                    </div>
                                )}
                                {/* Completeness ring indicator */}
                                <div className={cn(
                                    "absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl border-[2.5px] border-card flex items-center justify-center shadow-sm",
                                    overallCompleteness >= 80 ? "bg-emerald-500" : overallCompleteness >= 50 ? "bg-amber-500" : "bg-destructive"
                                )}>
                                    {overallCompleteness >= 80 ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <span className="text-[9px] font-bold text-white">{overallCompleteness}%</span>
                                    )}
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {!embedded && (
                                        <Tooltip><TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -ml-1" onClick={() => navigate('/candidate-dashboard')}>
                                                <ArrowLeft className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger><TooltipContent>Back to dashboard</TooltipContent></Tooltip>
                                    )}
                                    <h1 className="text-lg sm:text-xl font-bold truncate text-foreground">
                                        {fullName || 'Your Profile'}
                                    </h1>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mt-0.5">{jobTitle || 'Set your job title to get started'}</p>
                                <div className="flex items-center gap-3 mt-2.5">
                                    <span className={cn("text-xs font-semibold", completenessColor)}>{completenessLabel}</span>
                                    <div className="flex-1 max-w-[160px]">
                                        <Progress value={overallCompleteness} className="h-1.5" />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">{overallCompleteness}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => navigate(`/candidate/${profile?.id}`)}>
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Preview</span>
                            </Button>
                            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 flex-1 sm:flex-none">
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══════════ VALIDATION BANNER ═══════════ */}
            <AnimatePresence>
                {(!fullName.trim() || !jobTitle.trim() || jobTitle === 'Not specified') && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-800 dark:text-amber-200">
                                {!fullName.trim() && 'Full name is required. '}
                                {(!jobTitle.trim() || jobTitle === 'Not specified') && 'Please set your job title. '}
                                {skills.length === 0 && 'Add at least one skill for better visibility.'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════ STEP-WIZARD TAB NAVIGATION ═══════════ */}
            <div className="relative">
                {/* Progress line (desktop) */}
                <div className="hidden sm:block absolute top-[22px] left-[40px] right-[40px] h-[2px] bg-border/60 z-0" />
                <div
                    className="hidden sm:block absolute top-[22px] left-[40px] h-[2px] bg-primary/50 z-0 transition-all duration-500"
                    style={{ width: `${(currentTabIndex / (TAB_CONFIG.length - 1)) * (100 - 80 / TAB_CONFIG.length)}%` }}
                />

                {/* Mobile: horizontal scroll chips */}
                <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                    {TAB_CONFIG.map((tab) => {
                        const completeness = tabCompleteness[tab.value as keyof typeof tabCompleteness];
                        const isActive = activeTab === tab.value;
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap shrink-0",
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                        : "bg-card border-border/50 text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                <TabIcon className="w-4 h-4" />
                                {tab.label}
                                {!isActive && completeness === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                {!isActive && completeness < 100 && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        completeness >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                        completeness >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}>{completeness}%</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Desktop: step wizard */}
                <div className="hidden sm:grid grid-cols-6 gap-1 relative z-10">
                    {TAB_CONFIG.map((tab, idx) => {
                        const completeness = tabCompleteness[tab.value as keyof typeof tabCompleteness];
                        const isActive = activeTab === tab.value;
                        const isPast = idx < currentTabIndex;
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.92 }}
                                    className={cn(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative",
                                        isActive
                                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110"
                                            : isPast && completeness === 100
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : isPast
                                            ? "bg-primary/10 border-primary/40 text-primary"
                                            : "bg-card border-border/60 text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/5"
                                    )}
                                >
                                    {isPast && completeness === 100 ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                        <TabIcon className="w-[18px] h-[18px]" />
                                    )}
                                    {!isActive && completeness > 0 && completeness < 100 && (
                                        <div
                                            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary/60"
                                            style={{ width: `${completeness * 0.6}%` }}
                                        />
                                    )}
                                </motion.div>
                                <div className="text-center">
                                    <p className={cn(
                                        "text-xs font-semibold transition-colors",
                                        isActive ? "text-primary" : "text-foreground"
                                    )}>{tab.label}</p>
                                    <p className={cn(
                                        "text-[10px] mt-0.5 transition-colors",
                                        isActive ? "text-primary/70" : "text-muted-foreground"
                                    )}>{tab.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════ CONTEXTUAL TIP ═══════════ */}
            <motion.div
                key={`tip-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/[0.04] border border-primary/10"
            >
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{currentTab.label}:</span>{' '}
                    {currentTab.tip}
                </p>
            </motion.div>

            {/* ═══════════ TAB CONTENT ═══════════ */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-5"
                >
                    {/* ═══════ TAB 1: PROFILE ═══════ */}
                    {activeTab === 'profile' && (
                        <>
                            <SectionCard icon={User} title="Personal Information" subtitle="How employers will identify you" tip="Add a photo & headline to stand out">
                                <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-secondary/40 rounded-xl border border-border/30">
                                    {user && <PhotoUpload userId={user.id} currentPhotoUrl={avatarUrl} onPhotoUploaded={setAvatarUrl} size="lg" />}
                                    <div className="text-center md:text-left space-y-1">
                                        <h3 className="font-semibold flex items-center gap-2 justify-center md:justify-start">
                                            <Camera className="w-4 h-4 text-primary" /> Profile Photo
                                        </h3>
                                        <p className="text-sm text-muted-foreground">Square image (1:1), at least 200×200px</p>
                                        {!avatarUrl && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-center md:justify-start">
                                                <Zap className="w-3 h-3" /> Profiles with photos get 5× more views
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Separator className="bg-border/40" />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
                                        <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                                            className={cn("bg-background/50", !fullName.trim() && 'border-destructive/50 focus-visible:ring-destructive/30')} />
                                        {!fullName.trim() && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>}
                                    </div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">WhatsApp Number</Label>
                                        <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="e.g., 919876543210" className="bg-background/50" /></div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Current Job Title <span className="text-destructive">*</span></Label>
                                        <JobCategorySearch value={jobTitle} onChange={setJobTitle} placeholder="e.g., Software Engineer" />
                                        {(!jobTitle.trim() || jobTitle === 'Not specified') && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">Professional Headline</Label>
                                            <AIGenerateButton
                                                type="headline"
                                                context={{ jobTitle, skills, experienceYears, currentCompany }}
                                                onGenerated={setHeadline}
                                                label="AI Generate"
                                                disabled={!jobTitle.trim() || jobTitle === 'Not specified'}
                                            />
                                        </div>
                                        <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g., Senior Full Stack Developer | React & Node.js" className="bg-background/50" />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium">Current Company</Label>
                                        <Input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="Where you currently work" className="bg-background/50" /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">Experience (years)</Label>
                                        <Input type="number" min={0} max={50} value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} className="bg-background/50" /></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">About / Summary</Label>
                                        <AIGenerateButton
                                            type="summary"
                                            context={{ jobTitle, skills, experienceYears, currentCompany }}
                                            onGenerated={setBio}
                                            label="AI Write"
                                            disabled={!jobTitle.trim() || jobTitle === 'Not specified'}
                                        />
                                    </div>
                                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a brief professional summary..." rows={4} className="bg-background/50" />
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-muted-foreground">{bio?.length || 0} characters</p>
                                        {bio?.length < 50 && <p className="text-[11px] text-amber-600 dark:text-amber-400">Aim for at least 50 characters</p>}
                                    </div>
                                </div>
                                <div className="space-y-2"><Label className="text-sm font-medium">Career Objective</Label>
                                    <Textarea value={careerObjective} onChange={e => setCareerObjective(e.target.value)} placeholder="What are you looking to achieve in your career?" rows={3} className="bg-background/50" /></div>
                            </SectionCard>

                            <SectionCard icon={Zap} title="Skills" subtitle="What you're great at" tip="Add specific, searchable skills for better matching">
                                <TagInput items={skills} onAdd={addSkill} onRemove={removeSkill} input={skillInput} setInput={setSkillInput} placeholder="Add a skill..." maxItems={30} />

                                {/* AI Skill Suggestions */}
                                <Separator className="bg-border/40" />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">AI Suggestions</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">Powered by AI</Badge>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            disabled={suggestingSkills || (!jobTitle.trim() || jobTitle === 'Not specified')}
                                            onClick={async () => {
                                                setSuggestingSkills(true);
                                                setSuggestedSkills([]);
                                                try {
                                                    const { data, error } = await supabase.functions.invoke('suggest-skills', {
                                                        body: { jobTitle, bio, currentSkills: skills, experienceYears },
                                                    });
                                                    if (error) throw error;
                                                    if (data?.error) {
                                                        toast.error(data.error);
                                                    } else {
                                                        setSuggestedSkills(data?.suggestions || []);
                                                        if (!data?.suggestions?.length) {
                                                            toast.info('No new suggestions found. Try updating your job title.');
                                                        }
                                                    }
                                                } catch (err: any) {
                                                    console.error('Skill suggestion error:', err);
                                                    toast.error('Failed to get suggestions. Please try again.');
                                                } finally {
                                                    setSuggestingSkills(false);
                                                }
                                            }}
                                        >
                                            {suggestingSkills ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                            {suggestingSkills ? 'Analyzing...' : 'Suggest Skills'}
                                        </Button>
                                    </div>

                                    {(!jobTitle.trim() || jobTitle === 'Not specified') && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Info className="w-3 h-3" />
                                            Set your job title above to get AI skill suggestions
                                        </p>
                                    )}

                                    <AnimatePresence>
                                        {suggestedSkills.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/10 space-y-3">
                                                    <p className="text-xs text-muted-foreground">Click to add suggested skills to your profile:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {suggestedSkills.map((skill) => (
                                                            <motion.button
                                                                key={skill}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    if (!skills.includes(skill) && skills.length < 30) {
                                                                        setSkills(prev => [...prev, skill]);
                                                                        setSuggestedSkills(prev => prev.filter(s => s !== skill));
                                                                        toast.success(`Added "${skill}"`);
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-primary/20 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                {skill}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-muted-foreground"
                                                            onClick={() => {
                                                                const newSkills = suggestedSkills.filter(s => !skills.includes(s));
                                                                const available = 30 - skills.length;
                                                                const toAdd = newSkills.slice(0, available);
                                                                if (toAdd.length > 0) {
                                                                    setSkills(prev => [...prev, ...toAdd]);
                                                                    setSuggestedSkills([]);
                                                                    toast.success(`Added ${toAdd.length} skills`);
                                                                }
                                                            }}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> Add All
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-muted-foreground"
                                                            onClick={() => setSuggestedSkills([])}
                                                        >
                                                            <X className="w-3 h-3 mr-1" /> Dismiss
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Lightbulb} title="Key Strengths" subtitle="Soft skills and personal qualities">
                                <TagInput items={strengths} onAdd={() => addTag(strengths, setStrengths, strengthInput, setStrengthInput)} onRemove={s => removeTag(strengths, setStrengths, s)} input={strengthInput} setInput={setStrengthInput} placeholder="e.g., Leadership, Problem Solving" />
                            </SectionCard>

                            <SocialLinksSection links={socialLinks} onChange={setSocialLinks} showGithub={true} />
                        </>
                    )}

                    {/* ═══════ TAB 2: CAREER ═══════ */}
                    {activeTab === 'career' && (
                        <>
                            <AvailabilitySection status={availabilityStatus} onChange={setAvailabilityStatus} />
                            <WorkExperienceSection experiences={workExperience} onChange={setWorkExperience} skills={skills} />

                            <SectionCard icon={GraduationCap} title="Education" subtitle="Your academic background" tip="Include your highest qualification at minimum">
                                <div className="flex justify-end">
                                    <Button type="button" onClick={addEducation} variant="outline" size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Education</Button>
                                </div>
                                {education.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                                            <GraduationCap className="w-7 h-7 opacity-40" />
                                        </div>
                                        <p className="text-sm font-medium">No education added yet</p>
                                        <p className="text-xs mt-1">Adding education improves your profile visibility</p>
                                    </div>
                                ) : education.map((edu, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 border border-border/50 rounded-xl space-y-3 relative bg-background/50 hover:border-border transition-colors"
                                    >
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEducation(i)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-3 pr-8">
                                            <Input placeholder="Institution" value={edu.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} className="bg-background/50" />
                                            <Input placeholder="Degree" value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} className="bg-background/50" />
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-3">
                                            <Input placeholder="Field of Study" value={edu.field} onChange={e => updateEducation(i, 'field', e.target.value)} className="bg-background/50" />
                                            <Input placeholder="Start Year" value={edu.startYear} onChange={e => updateEducation(i, 'startYear', e.target.value)} className="bg-background/50" />
                                            <Input placeholder="End Year" value={edu.endYear} onChange={e => updateEducation(i, 'endYear', e.target.value)} className="bg-background/50" />
                                        </div>
                                    </motion.div>
                                ))}
                            </SectionCard>

                            <CertificationsSection certifications={certifications} onChange={setCertifications} />
                            <LanguagesSection languages={languages} onChange={setLanguages} />
                        </>
                    )}

                    {/* ═══════ TAB 3: PREFERENCES ═══════ */}
                    {activeTab === 'preferences' && (
                        <>
                            <SectionCard icon={Compass} title="Job Preferences" subtitle="Help us find the right jobs for you" tip="More details = better job matches">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Preferred Job Types</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {jobTypeOptions.map(type => (
                                            <motion.button
                                                key={type}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleJobType(type)}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all",
                                                    preferredJobTypes.includes(type)
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                        : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                )}
                                            >
                                                {preferredJobTypes.includes(type) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {type}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                                <Separator className="bg-border/40" />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="flex items-center gap-2 text-sm font-medium"><Clock className="w-4 h-4 text-muted-foreground" /> Notice Period</Label>
                                        <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select notice period" /></SelectTrigger>
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
                                    <div className="space-y-2"><Label className="flex items-center gap-2 text-sm font-medium"><Globe className="w-4 h-4 text-muted-foreground" /> Remote Preference</Label>
                                        <Select value={remotePreference} onValueChange={setRemotePreference}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select preference" /></SelectTrigger>
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
                                    <div className="space-y-2"><Label className="flex items-center gap-2 text-sm font-medium"><Shield className="w-4 h-4 text-muted-foreground" /> Work Authorization</Label>
                                        <Select value={workAuthorization} onValueChange={setWorkAuthorization}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select authorization" /></SelectTrigger>
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
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 border border-border/30">
                                        <Switch checked={willingToRelocate} onCheckedChange={setWillingToRelocate} />
                                        <Label className="cursor-pointer flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> Willing to Relocate</Label>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Banknote} title="Salary Details" subtitle="Keep this private — only used for matching" tip="Being transparent helps avoid mismatches">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium">Currency</Label>
                                        <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                                            <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
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
                                    <div className="space-y-2"><Label className="text-sm font-medium">Current Salary (Annual)</Label>
                                        <Input value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g., 8,00,000" className="bg-background/50" /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">Expected Salary (Annual)</Label>
                                        <Input value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} placeholder="e.g., 12,00,000" className="bg-background/50" /></div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Building2} title="Industry Preferences" subtitle="Which industries interest you?">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-muted-foreground">Add industries or get AI suggestions</span>
                                    <AIIndustrySuggestButton
                                        jobTitle={jobTitle}
                                        currentIndustries={industryPreference}
                                        onSuggest={(suggestions) => {
                                            setSuggestedIndustries(suggestions);
                                        }}
                                    />
                                </div>
                                <TagInput items={industryPreference} onAdd={() => addTag(industryPreference, setIndustryPreference, industryInput, setIndustryInput)} onRemove={s => removeTag(industryPreference, setIndustryPreference, s)} input={industryInput} setInput={setIndustryInput} placeholder="e.g., IT, Healthcare, Finance" />
                                <AnimatePresence>
                                    {suggestedIndustries.length > 0 && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="p-3 rounded-xl bg-primary/[0.04] border border-primary/10 space-y-2 mt-3">
                                                <p className="text-xs text-muted-foreground">Click to add:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestedIndustries.map((ind) => (
                                                        <motion.button key={ind} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}
                                                            onClick={() => {
                                                                if (!industryPreference.includes(ind)) {
                                                                    setIndustryPreference(prev => [...prev, ind]);
                                                                    setSuggestedIndustries(prev => prev.filter(s => s !== ind));
                                                                    toast.success(`Added "${ind}"`);
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-primary/20 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer"
                                                        >
                                                            <Plus className="w-3 h-3" />{ind}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setSuggestedIndustries([])}>
                                                    <X className="w-3 h-3 mr-1" /> Dismiss
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </SectionCard>
                        </>
                    )}

                    {/* ═══════ TAB 4: PERSONAL ═══════ */}
                    {activeTab === 'personal' && (
                        <>
                            <SectionCard icon={User} title="Personal Details" subtitle="Optional — helps with compliance and diversity">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium">Date of Birth</Label>
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
                                    <div className="space-y-2"><Label className="text-sm font-medium">Gender</Label>
                                        <Select value={gender} onValueChange={setGender}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="non_binary">Non-binary</SelectItem>
                                                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">Marital Status</Label>
                                        <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="single">Single</SelectItem>
                                                <SelectItem value="married">Married</SelectItem>
                                                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="flex items-center gap-2 text-sm font-medium"><Flag className="w-4 h-4 text-muted-foreground" /> Nationality</Label>
                                        <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g., Indian" className="bg-background/50" /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">Disability Status</Label>
                                        <Select value={disabilityStatus} onValueChange={setDisabilityStatus}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="yes">Yes (Person with disability)</SelectItem>
                                                <SelectItem value="prefer_not">Prefer not to disclose</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Separator className="bg-border/40" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { checked: drivingLicense, onChange: setDrivingLicense, icon: Car, label: 'Driving License' },
                                        { checked: militaryVeteran, onChange: setMilitaryVeteran, icon: Shield, label: 'Military Veteran' },
                                        { checked: referencesAvailable, onChange: setReferencesAvailable, icon: User, label: 'References Available' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/30">
                                            <Switch checked={item.checked} onCheckedChange={item.onChange} />
                                            <Label className="cursor-pointer flex items-center gap-2 text-sm">
                                                <item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>

                            <SectionCard icon={MapPin} title="Address" subtitle="Your current location">
                                <div className="space-y-2"><Label className="text-sm font-medium">Address Line</Label>
                                    <Input value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="Street address" className="bg-background/50" /></div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium">City</Label>
                                        <WorldCityAutocomplete
                                            value={city}
                                            onChange={(val, structured) => {
                                                if (structured) {
                                                    setCity(structured.city);
                                                    if (structured.state) setState(structured.state);
                                                    setCountry(structured.country);
                                                } else {
                                                    setCity(val);
                                                }
                                            }}
                                            placeholder="Start typing city..."
                                            inputClassName="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">State / Province</Label><Input value={state} onChange={e => setState(e.target.value)} placeholder="State" className="bg-background/50" /></div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium">Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="bg-background/50" /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium">PIN / ZIP Code</Label><Input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="PIN code" className="bg-background/50" /></div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Heart} title="Hobbies & Interests" subtitle="Show your personality">
                                <TagInput items={hobbies} onAdd={() => addTag(hobbies, setHobbies, hobbyInput, setHobbyInput)} onRemove={s => removeTag(hobbies, setHobbies, s)} input={hobbyInput} setInput={setHobbyInput} placeholder="e.g., Reading, Traveling, Coding" />
                            </SectionCard>
                        </>
                    )}

                    {/* ═══════ TAB 5: PORTFOLIO ═══════ */}
                    {activeTab === 'portfolio' && (
                        <>
                            <SectionCard icon={Trophy} title="Achievements & Awards" subtitle="Highlight your accomplishments" tip="Achievements set you apart from other candidates">
                                <TagInput items={achievements} onAdd={() => addTag(achievements, setAchievements, achievementInput, setAchievementInput)} onRemove={s => removeTag(achievements, setAchievements, s)} input={achievementInput} setInput={setAchievementInput} placeholder="e.g., Employee of the Year 2024" icon={Trophy} />
                            </SectionCard>

                            <SectionCard icon={Briefcase} title="Projects" subtitle="Showcase what you've built" tip="Include live links for maximum impact">
                                <div className="flex justify-end">
                                    <Button type="button" onClick={addProject} variant="outline" size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Project</Button>
                                </div>
                                {projects.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                                            <Briefcase className="w-7 h-7 opacity-40" />
                                        </div>
                                        <p className="text-sm font-medium">No projects yet</p>
                                        <p className="text-xs mt-1">Showcase your projects to stand out</p>
                                    </div>
                                ) : projects.map((proj, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 border border-border/50 rounded-xl space-y-3 relative bg-background/50 hover:border-border transition-colors"
                                    >
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProject(i)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <div className="grid md:grid-cols-2 gap-3 pr-8">
                                            <div className="space-y-1"><Label className="text-xs font-medium">Project Name</Label>
                                                <Input value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} placeholder="Project name" className="bg-background/50" /></div>
                                            <div className="space-y-1"><Label className="text-xs font-medium">Project URL</Label>
                                                <Input value={proj.url} onChange={e => updateProject(i, 'url', e.target.value)} placeholder="https://..." className="bg-background/50" /></div>
                                        </div>
                                        <div className="space-y-1"><Label className="text-xs font-medium">Description</Label>
                                            <Textarea value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} placeholder="Brief description..." rows={2} className="bg-background/50" /></div>
                                    </motion.div>
                                ))}
                            </SectionCard>

                            <SectionCard icon={Globe} title="Portfolio Links" subtitle="Website, Behance, Dribbble, etc.">
                                <TagInput items={portfolioUrls} onAdd={addPortfolio} onRemove={removePortfolio} input={portfolioInput} setInput={setPortfolioInput} placeholder="Add portfolio URL..." icon={Globe} />
                            </SectionCard>

                            <SectionCard icon={Video} title="Video Introduction" subtitle="Stand out with a personal video intro">
                                <p className="text-sm text-muted-foreground">Add a video intro URL (YouTube, Loom, etc.)</p>
                                <Input value={videoIntroUrl} onChange={e => setVideoIntroUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="bg-background/50" />
                            </SectionCard>

                            <SectionCard icon={FileText} title="Default Cover Letter" subtitle="Pre-filled when you apply to jobs">
                                <Textarea value={coverLetterDefault} onChange={e => setCoverLetterDefault(e.target.value)}
                                    placeholder="Write a default cover letter..." rows={5} className="bg-background/50" />
                                <p className="text-[11px] text-muted-foreground">{coverLetterDefault?.length || 0} characters</p>
                            </SectionCard>
                        </>
                    )}

                    {/* ═══════ TAB 6: RESUME ═══════ */}
                    {activeTab === 'resume' && (
                        <>
                            {candidate && (
                                <>
                                    <SectionCard icon={FileText} title="Resume Upload" subtitle="Upload your latest resume (PDF recommended)" tip="Keep your resume under 2 pages for best results">
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

            {/* ═══════════ BOTTOM STEP NAVIGATION ═══════════ */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between pt-2"
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateTab('prev')}
                    disabled={currentTabIndex === 0}
                    className="gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{currentTabIndex > 0 ? TAB_CONFIG[currentTabIndex - 1].label : 'Previous'}</span>
                    <span className="sm:hidden">Back</span>
                </Button>
                <div className="flex items-center gap-1.5">
                    {TAB_CONFIG.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveTab(TAB_CONFIG[idx].value)}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300 cursor-pointer hover:bg-primary/50",
                                idx === currentTabIndex ? "bg-primary w-6" : idx < currentTabIndex ? "bg-primary/40 w-2" : "bg-border w-2"
                            )}
                        />
                    ))}
                </div>
                {currentTabIndex < TAB_CONFIG.length - 1 ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateTab('next')}
                        className="gap-2"
                    >
                        <span className="hidden sm:inline">{TAB_CONFIG[currentTabIndex + 1].label}</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Profile
                    </Button>
                )}
            </motion.div>

            {/* ═══════════ STICKY SAVE BAR (appears when unsaved changes) ═══════════ */}
            <AnimatePresence>
                {hasUnsavedChanges && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
                    >
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/10">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                <p className="text-sm text-muted-foreground truncate">Unsaved changes</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => setHasUnsavedChanges(false)} className="text-muted-foreground">
                                    Dismiss
                                </Button>
                                <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (embedded) return profileContent;

    return (
        <EmailVerificationGuard fallbackMessage="Please verify your email to edit your profile.">
            <div className="min-h-screen bg-background py-6 sm:py-8 px-4">{profileContent}</div>
        </EmailVerificationGuard>
    );
};

export default CandidateProfileEdit;
