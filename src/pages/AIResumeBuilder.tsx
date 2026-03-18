import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Loader2, Wand2, Plus, Trash2, Upload,
  FileDown, Image as ImageIcon, Save, Phone, Mail, MapPin, Linkedin,
  GraduationCap, Briefcase, Settings, User as UserIcon, Check, ChevronsUpDown,
  ChevronRight, ChevronLeft, Eye, FileText, Lightbulb, Target, Award,
  CheckCircle2, Circle, Palette, Download, Share2, Zap, Star
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COMMON_JOB_TITLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Product Manager", "Project Manager", "UI/UX Designer", "Graphic Designer",
  "Data Scientist", "Data Analyst", "Machine Learning Engineer", "DevOps Engineer",
  "Marketing Manager", "Digital Marketing Specialist", "Content Writer", "Copywriter",
  "Sales Manager", "Account Executive", "Business Analyst", "Financial Analyst",
  "HR Manager", "Recruiter", "Customer Success Manager", "Operations Manager",
  "Nursing Assistant", "Registered Nurse", "Teacher", "Administrative Assistant",
  "Customer Service Representative", "Retail Sales Associate"
];

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'IN' },
  { code: '+61', country: 'AU' },
  { code: '+86', country: 'CN' },
  { code: '+81', country: 'JP' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+55', country: 'BR' },
  { code: '+27', country: 'ZA' },
  { code: '+971', country: 'AE' },
];

const STEPS = [
  { id: 'basics', label: 'Basics', icon: UserIcon, description: 'Name, title & photo' },
  { id: 'contact', label: 'Contact', icon: Phone, description: 'How to reach you' },
  { id: 'experience', label: 'Experience', icon: Briefcase, description: 'Work history' },
  { id: 'education', label: 'Education', icon: GraduationCap, description: 'Academic background' },
  { id: 'skills', label: 'Skills', icon: Settings, description: 'Your expertise' },
  { id: 'preview', label: 'Preview', icon: Eye, description: 'Review & export' },
];

const TIPS = {
  basics: [
    'Use a professional headshot with good lighting',
    'Keep your job title specific and relevant to target roles',
    'Write a compelling 2-3 sentence summary',
  ],
  contact: [
    'Use a professional email address',
    'Include LinkedIn if it\'s up-to-date',
    'Only include location if relevant',
  ],
  experience: [
    'Start with your most recent position',
    'Use action verbs: Led, Developed, Increased',
    'Quantify achievements when possible',
  ],
  education: [
    'List highest degree first',
    'Include relevant certifications',
    'Add graduation year or expected date',
  ],
  skills: [
    'Match skills to job requirements',
    'Include both technical and soft skills',
    'Keep the list focused and relevant',
  ],
  preview: [
    'Proofread everything carefully',
    'Check for consistent formatting',
    'Save both PDF and profile versions',
  ],
};

// Types
interface Education {
  year: string;
  degree: string;
  institution: string;
}

interface Experience {
  duration: string;
  company: string;
  title: string;
  description: string;
}

interface Skill {
  name: string;
  subtitle: string;
}

interface ResumeFormData {
  fullName: string;
  jobTitle: string;
  summary: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  website: string;
  photoUrl: string;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
}

// Calculate completion percentage
const calculateCompletion = (data: ResumeFormData): number => {
  let filled = 0;
  let total = 0;

  // Basics (30%)
  total += 3;
  if (data.fullName?.trim()) filled++;
  if (data.jobTitle?.trim()) filled++;
  if (data.summary?.trim() && data.summary.length > 20) filled++;

  // Contact (20%)
  total += 2;
  if (data.email?.trim()) filled++;
  if (data.phone?.trim() || data.location?.trim()) filled++;

  // Experience (25%)
  total += 2;
  const validExp = data.experience.filter(e => e.title && e.company);
  if (validExp.length > 0) filled++;
  if (validExp.some(e => e.description?.length > 20)) filled++;

  // Education (15%)
  total += 1;
  const validEdu = data.education.filter(e => e.degree && e.institution);
  if (validEdu.length > 0) filled++;

  // Skills (10%)
  total += 1;
  const validSkills = data.skills.filter(s => s.name);
  if (validSkills.length >= 3) filled++;

  return Math.round((filled / total) * 100);
};

// Resume Template Component
const ResumeTemplate = ({ data, innerRef, compact = false }: { data: ResumeFormData; innerRef?: React.RefObject<HTMLDivElement>; compact?: boolean }) => {
  const accentColor = '#d4874e';
  const scale = compact ? 0.35 : 1;

  return (
    <div
      ref={innerRef}
      className="bg-[#f0ebe4] mx-auto font-sans text-[#222] relative overflow-hidden"
      style={{ 
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        width: compact ? 278 : 794,
        minHeight: compact ? 393 : 1123,
        transform: compact ? 'none' : undefined,
      }}
    >
      {/* HEADER */}
      <div className="flex items-start gap-6 p-8 pb-6" style={{ padding: compact ? '12px' : undefined, gap: compact ? '8px' : undefined }}>
        {/* Photo */}
        <div 
          className="rounded-2xl overflow-hidden shrink-0 bg-gray-200 border-4 border-white shadow-lg"
          style={{ 
            width: compact ? 50 : 160, 
            height: compact ? 56 : 180,
            borderWidth: compact ? 2 : 4,
            borderRadius: compact ? 8 : 16,
          }}
        >
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <UserIcon className="text-gray-500" style={{ width: compact ? 16 : 64, height: compact ? 16 : 64 }} />
            </div>
          )}
        </div>

        {/* Name & Summary */}
        <div className="flex-1 pt-2" style={{ paddingTop: compact ? 0 : undefined }}>
          <h1 
            className="font-extrabold tracking-wide text-[#1a2332] mb-1"
            style={{ fontSize: compact ? 12 : 36, marginBottom: compact ? 2 : undefined }}
          >
            {data.fullName || 'YOUR NAME'}
          </h1>
          <div className="flex items-center gap-3 mb-4" style={{ gap: compact ? 4 : undefined, marginBottom: compact ? 4 : undefined }}>
            <span className="text-[#555]" style={{ fontSize: compact ? 8 : 18 }}>{data.jobTitle || 'Job Title'}</span>
            <div className="flex-1 h-[3px] rounded" style={{ backgroundColor: accentColor, height: compact ? 1 : 3 }} />
          </div>
          {!compact && (
            <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
              <p className="text-sm leading-relaxed text-[#444]">
                {data.summary || 'Your professional summary will appear here...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BODY: Two Columns */}
      <div className="flex gap-6 px-8 pb-8" style={{ padding: compact ? 12 : undefined, paddingTop: 0, gap: compact ? 8 : undefined }}>
        {/* LEFT COLUMN */}
        <div className="shrink-0 space-y-6" style={{ width: compact ? 90 : 280, gap: compact ? 8 : undefined }}>
          {/* Education */}
          <div>
            <div className="flex items-center gap-2 mb-3" style={{ gap: compact ? 4 : undefined, marginBottom: compact ? 4 : undefined }}>
              <div 
                className="rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: accentColor, width: compact ? 16 : 32, height: compact ? 16 : 32, borderRadius: compact ? 4 : 8 }}
              >
                <GraduationCap className="text-white" style={{ width: compact ? 8 : 16, height: compact ? 8 : 16 }} />
              </div>
              <h2 className="font-bold text-[#1a2332] tracking-wide" style={{ fontSize: compact ? 8 : 20 }}>EDUCATION</h2>
            </div>
            <div className="space-y-4" style={{ gap: compact ? 4 : undefined }}>
              {data.education.slice(0, compact ? 1 : undefined).map((edu, i) => (
                <div key={i}>
                  <p className="text-[#888] font-medium" style={{ fontSize: compact ? 6 : 14 }}>{edu.year}</p>
                  <p className="font-bold text-[#333]" style={{ fontSize: compact ? 6 : 14 }}>{edu.degree}</p>
                  <p className="text-[#666]" style={{ fontSize: compact ? 5 : 14 }}>{edu.institution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          {!compact && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-[#1a2332] tracking-wide">SKILLS</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {data.skills.map((skill, i) => (
                  <div key={i} className="flex flex-col items-center p-3 bg-white/70 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                      style={{ backgroundColor: `hsl(${(i * 60) % 360}, 40%, 92%)` }}>
                      <span className="text-xs font-bold" style={{ color: `hsl(${(i * 60) % 360}, 50%, 40%)` }}>
                        {skill.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-center text-[#333]">{skill.name}</p>
                    <p className="text-[10px] text-[#888] text-center">{skill.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 space-y-6" style={{ gap: compact ? 8 : undefined }}>
          {/* Working Experience */}
          <div>
            <div className="flex items-center gap-2 mb-3" style={{ gap: compact ? 4 : undefined, marginBottom: compact ? 4 : undefined }}>
              <div 
                className="rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: accentColor, width: compact ? 16 : 32, height: compact ? 16 : 32, borderRadius: compact ? 4 : 8 }}
              >
                <Briefcase className="text-white" style={{ width: compact ? 8 : 16, height: compact ? 8 : 16 }} />
              </div>
              <h2 className="font-bold text-[#1a2332] tracking-wide" style={{ fontSize: compact ? 8 : 20 }}>EXPERIENCE</h2>
            </div>
            <div className="space-y-4" style={{ gap: compact ? 4 : undefined }}>
              {data.experience.slice(0, compact ? 2 : undefined).map((exp, i) => (
                <div key={i} className="flex gap-4 border-b border-gray-200 pb-4 last:border-0" style={{ gap: compact ? 4 : undefined, paddingBottom: compact ? 4 : undefined }}>
                  <div className="shrink-0" style={{ width: compact ? 35 : 110 }}>
                    <p className="font-medium text-[#555]" style={{ fontSize: compact ? 5 : 14 }}>{exp.duration}</p>
                    <p className="font-bold text-[#333]" style={{ fontSize: compact ? 5 : 14 }}>{exp.company}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#333]" style={{ fontSize: compact ? 6 : 14 }}>{exp.title}</p>
                    {!compact && <p className="text-sm text-[#666] leading-relaxed">{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step indicator component
const StepIndicator = ({ currentStep, steps, onStepClick }: { currentStep: number; steps: typeof STEPS; onStepClick: (idx: number) => void }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-8 overflow-x-auto scrollbar-hide -mx-2 px-2">
      <div className="flex items-center justify-between min-w-[320px]">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => onStepClick(idx)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-[hsl(var(--success))] text-white'
                      : isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-4 sm:w-12 lg:w-16 h-0.5 mx-0.5 sm:mx-2 ${isCompleted ? 'bg-[hsl(var(--success))]' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tips Card Component
const TipsCard = ({ tips }: { tips: string[] }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20"
  >
    <div className="flex items-center gap-2 mb-3">
      <Lightbulb className="w-4 h-4 text-amber-500" />
      <span className="font-medium text-sm">Pro Tips</span>
    </div>
    <ul className="space-y-2">
      {tips.map((tip, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
          <Star className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
          {tip}
        </li>
      ))}
    </ul>
  </motion.div>
);

// Main Page Component
const AIResumeBuilder = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const resumeRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // States for autocompletes
  const [jobTitleOpen, setJobTitleOpen] = useState(false);
  const [locationPredictions, setLocationPredictions] = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);

  const [formData, setFormData] = useState<ResumeFormData>({
    fullName: profile?.full_name || '',
    jobTitle: '',
    summary: '',
    phone: '',
    email: '',
    location: '',
    linkedin: '',
    website: '',
    photoUrl: profile?.avatar_url || '',
    education: [{ year: '', degree: '', institution: '' }],
    experience: [{ duration: '', company: '', title: '', description: '' }],
    skills: [{ name: '', subtitle: '' }],
  });

  const completion = calculateCompletion(formData);

  const updateField = (field: keyof ResumeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill from Profile
  const autoFillFromProfile = async () => {
    if (!profile) {
      toast.error('Please log in first');
      return;
    }
    setAutoFilling(true);
    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!candidate) {
        toast.error('No candidate profile found');
        return;
      }

      const updates: Partial<ResumeFormData> = {};

      updates.fullName = profile.full_name || formData.fullName;
      updates.photoUrl = profile.avatar_url || formData.photoUrl;
      if (candidate.job_title && candidate.job_title !== 'Not specified') updates.jobTitle = candidate.job_title;
      if (candidate.bio) updates.summary = candidate.bio;
      if ((profile as any).whatsapp_number) updates.phone = (profile as any).whatsapp_number;

      const locationParts = [candidate.city, candidate.state, candidate.country].filter(Boolean);
      if (locationParts.length > 0) updates.location = locationParts.join(', ');

      const socialLinks = candidate.social_links as any;
      if (socialLinks?.linkedin) updates.linkedin = socialLinks.linkedin;
      if (socialLinks?.website || socialLinks?.portfolio) updates.website = socialLinks.website || socialLinks.portfolio;

      if (candidate.skills?.length) {
        updates.skills = candidate.skills.map((s: string) => ({ name: s, subtitle: '' }));
      }

      const edu = candidate.education as any[];
      if (Array.isArray(edu) && edu.length > 0) {
        updates.education = edu.map((e: any) => ({
          year: [e.startYear, e.endYear].filter(Boolean).join(' - ') || '',
          degree: [e.degree, e.field].filter(Boolean).join(' in ') || '',
          institution: e.institution || '',
        }));
      }

      const workExp = candidate.work_experience as any[];
      if (Array.isArray(workExp) && workExp.length > 0) {
        updates.experience = workExp.map((w: any) => ({
          duration: [w.startDate, w.endDate || 'Present'].filter(Boolean).join(' - ') || '',
          company: w.company || '',
          title: w.title || '',
          description: w.description || '',
        }));
      }

      setFormData(prev => ({ ...prev, ...updates }));
      toast.success('Profile data imported! Review and adjust as needed.');
    } catch (err) {
      console.error('Auto-fill error:', err);
      toast.error('Failed to import profile data');
    } finally {
      setAutoFilling(false);
    }
  };

  // Debounced Location Fetch
  const fetchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationPredictions([]);
      return;
    }
    setLocationLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { signal: controller.signal }
      );
      const data = await response.json();
      setLocationPredictions(data);
    } catch {
      setLocationPredictions([]);
    } finally {
      clearTimeout(timeout);
      setLocationLoading(false);
    }
  };

  const handlePhoneChange = (code: string, num: string) => {
    setPhoneCode(code);
    setPhoneNumber(num);
    updateField('phone', `${code} ${num}`);
  };

  const addEducation = () => updateField('education', [...formData.education, { year: '', degree: '', institution: '' }]);
  const removeEducation = (i: number) => updateField('education', formData.education.filter((_, idx) => idx !== i));

  const addExperience = () => updateField('experience', [...formData.experience, { duration: '', company: '', title: '', description: '' }]);
  const removeExperience = (i: number) => updateField('experience', formData.experience.filter((_, idx) => idx !== i));

  const addSkill = () => updateField('skills', [...formData.skills, { name: '', subtitle: '' }]);
  const removeSkill = (i: number) => updateField('skills', formData.skills.filter((_, idx) => idx !== i));

  const updateListItem = <T extends keyof ResumeFormData>(
    field: T,
    index: number,
    key: string,
    value: string
  ) => {
    const list = [...(formData[field] as any[])];
    list[index] = { ...list[index], [key]: value };
    updateField(field, list);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField('photoUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const getEdgeFunctionErrorMessage = async (error: any, fallback = 'Request failed') => {
    if (!error) return fallback;
    const context = error.context;
    if (context) {
      try {
        const body = await context.json();
        if (body?.error) return body.error;
      } catch {
        try {
          const text = await context.text();
          if (text) return text;
        } catch {}
      }
    }
    return error.message || fallback;
  };

  const generateExperienceWithAI = async (index: number) => {
    const exp = formData.experience[index];
    if (!exp.title) {
      toast.error('Please enter a Job Title for this experience first');
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-resume', {
        body: {
          candidateData: {
            title: exp.title,
            experience_years: 0,
            options: { single_experience_only: true, company: exp.company }
          },
          style: 'professional',
          targetRole: exp.title,
        },
      });

      if (response.error) {
        const detailedError = await getEdgeFunctionErrorMessage(response.error, 'Failed to generate');
        throw new Error(detailedError);
      }

      const resume = response.data?.resume;
      if (resume?.experience?.length) {
        updateListItem('experience', index, 'description', resume.experience[0].highlights?.join('. ') || '');
        toast.success('Experience description AI-generated!');
      } else {
        updateListItem('experience', index, 'description', `Successfully led initiatives and projects as a ${exp.title}. Demonstrated strong problem-solving skills and collaborated with cross-functional teams to deliver high-quality results.`);
        toast.success('Experience description generated!');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const generateSummaryWithAI = async () => {
    if (!formData.jobTitle) {
      toast.error('Please enter your main Job Title first');
      return;
    }
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-resume', {
        body: {
          candidateData: {
            name: formData.fullName || 'Candidate',
            title: formData.jobTitle,
            skills: formData.skills.map(s => s.name).filter(Boolean),
            experience_years: formData.experience.length,
            bio: formData.summary || 'Not provided',
          },
          style: 'professional',
          targetRole: formData.jobTitle,
        },
      });

      if (response.error) {
        const detailedError = await getEdgeFunctionErrorMessage(response.error, 'Failed to generate summary');
        throw new Error(detailedError);
      }

      const resume = response.data?.resume;
      if (resume?.summary) {
        updateField('summary', resume.summary);
        toast.success('Summary AI-generated!');
      } else {
        updateField('summary', `Dedicated and results-driven ${formData.jobTitle} with a proven track record of success. Skilled in driving project execution, optimizing processes, and delivering high-quality solutions.`);
        toast.success('Summary generated!');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!resumeRef.current) return null;
    return html2canvas(resumeRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f0ebe4',
      width: 794,
    });
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`${formData.fullName || 'Resume'}_Resume.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error('PDF export failed');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const exportToJPEG = async () => {
    setExporting(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${formData.fullName || 'Resume'}_Resume.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      toast.success('JPEG downloaded!');
    } catch (err) {
      toast.error('JPEG export failed');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const saveToProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!candidate) {
        toast.error('Candidate profile not found');
        return;
      }

      const { error } = await supabase
        .from('candidate_resumes')
        .insert({
          candidate_id: candidate.id,
          name: `${formData.jobTitle || 'Professional'} Resume`,
          style: 'professional',
          content: formData as any,
          resume_score: Math.max(completion, 75),
          is_default: false,
        });

      if (error) throw error;
      toast.success('Resume saved to your profile!');
    } catch (error: any) {
      toast.error('Failed to save resume');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const goPrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const currentStepId = STEPS[currentStep].id;

  // Step Content Renderers
  const renderBasicsStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Photo */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div
          className="w-32 h-32 rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors flex items-center justify-center group relative"
          onClick={() => photoInputRef.current?.click()}
        >
          {formData.photoUrl ? (
            <>
              <img src={formData.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Upload Photo</p>
            </div>
          )}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        <div className="flex-1 space-y-4 w-full">
          <div>
            <Label className="text-sm font-medium">Full Name *</Label>
            <Input 
              value={formData.fullName} 
              onChange={e => updateField('fullName', e.target.value)} 
              placeholder="John Doe"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Job Title *</Label>
            <Popover open={jobTitleOpen} onOpenChange={setJobTitleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal mt-1.5"
                >
                  {formData.jobTitle || "Select or type job title..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search or type custom title..."
                    value={formData.jobTitle}
                    onValueChange={(val) => updateField('jobTitle', val)}
                  />
                  <CommandList>
                    <CommandEmpty>Using custom title.</CommandEmpty>
                    <CommandGroup>
                      {COMMON_JOB_TITLES.map((title) => (
                        <CommandItem
                          key={title}
                          value={title}
                          onSelect={() => {
                            updateField('jobTitle', title);
                            setJobTitleOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${formData.jobTitle === title ? "opacity-100" : "opacity-0"}`} />
                          {title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-sm font-medium">Professional Summary</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary"
            onClick={generateSummaryWithAI}
            disabled={generating || !formData.jobTitle}
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            AI Generate
          </Button>
        </div>
        <Textarea
          value={formData.summary}
          onChange={e => updateField('summary', e.target.value)}
          placeholder="Write a brief summary about your experience and expertise..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {formData.summary.length}/500 characters
        </p>
      </div>
    </motion.div>
  );

  const renderContactStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Phone</Label>
          <div className="flex gap-2 mt-1.5">
            <Select value={phoneCode} onValueChange={(val) => handlePhoneChange(val, phoneNumber)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Code" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="flex-1"
              value={phoneNumber}
              onChange={e => handlePhoneChange(phoneCode, e.target.value)}
              placeholder="9876543210"
            />
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Email *</Label>
          <Input 
            value={formData.email} 
            onChange={e => updateField('email', e.target.value)} 
            placeholder="you@email.com"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="relative">
        <Label className="text-sm font-medium">Location</Label>
        <Input
          value={formData.location}
          onChange={e => {
            updateField('location', e.target.value);
            fetchLocations(e.target.value);
          }}
          onBlur={() => setTimeout(() => setLocationPredictions([]), 200)}
          placeholder="City, Country"
          className="mt-1.5"
        />
        {locationPredictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
            {locationPredictions.map((pred, idx) => (
              <div
                key={idx}
                className="p-3 hover:bg-muted cursor-pointer text-sm border-b last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const parts = pred.display_name.split(', ');
                  const shortName = `${parts[0]}, ${parts[parts.length - 1]}`;
                  updateField('location', shortName);
                  setLocationPredictions([]);
                }}
              >
                <MapPin className="w-4 h-4 inline mr-2 text-muted-foreground" />
                {pred.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium">LinkedIn URL</Label>
        <Input 
          value={formData.linkedin} 
          onChange={e => updateField('linkedin', e.target.value)} 
          placeholder="linkedin.com/in/yourprofile"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Portfolio / Website</Label>
        <Input 
          value={formData.website} 
          onChange={e => updateField('website', e.target.value)} 
          placeholder="https://yoursite.com"
          className="mt-1.5"
        />
      </div>
    </motion.div>
  );

  const renderExperienceStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {formData.experience.map((exp, i) => (
        <Card key={i} className="relative">
          <CardContent className="p-4 space-y-4">
            {formData.experience.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-destructive" 
                onClick={() => removeExperience(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Duration</Label>
                <Input 
                  value={exp.duration} 
                  onChange={e => updateListItem('experience', i, 'duration', e.target.value)} 
                  placeholder="2023 - Present"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Company</Label>
                <Input 
                  value={exp.company} 
                  onChange={e => updateListItem('experience', i, 'company', e.target.value)} 
                  placeholder="Company Name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Job Title</Label>
                <Input 
                  value={exp.title} 
                  onChange={e => updateListItem('experience', i, 'title', e.target.value)} 
                  placeholder="Sr. Designer"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-primary"
                  onClick={() => generateExperienceWithAI(i)}
                  disabled={generating || !exp.title}
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  AI Write
                </Button>
              </div>
              <Textarea 
                value={exp.description} 
                onChange={e => updateListItem('experience', i, 'description', e.target.value)} 
                placeholder="Describe your responsibilities and achievements..."
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addExperience} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Add Another Experience
      </Button>
    </motion.div>
  );

  const renderEducationStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {formData.education.map((edu, i) => (
        <Card key={i} className="relative">
          <CardContent className="p-4">
            {formData.education.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-destructive" 
                onClick={() => removeEducation(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Year</Label>
                <Input 
                  value={edu.year} 
                  onChange={e => updateListItem('education', i, 'year', e.target.value)} 
                  placeholder="2020 - 2024"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Degree</Label>
                <Input 
                  value={edu.degree} 
                  onChange={e => updateListItem('education', i, 'degree', e.target.value)} 
                  placeholder="B.Tech Computer Science"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Institution</Label>
                <Input 
                  value={edu.institution} 
                  onChange={e => updateListItem('education', i, 'institution', e.target.value)} 
                  placeholder="University Name"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addEducation} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Add Another Education
      </Button>
    </motion.div>
  );

  const renderSkillsStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="grid gap-3">
        {formData.skills.map((skill, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input
              value={skill.name}
              onChange={e => updateListItem('skills', i, 'name', e.target.value)}
              placeholder="Skill name (e.g. React)"
              className="flex-1"
            />
            <Input
              value={skill.subtitle}
              onChange={e => updateListItem('skills', i, 'subtitle', e.target.value)}
              placeholder="Category (e.g. Frontend)"
              className="flex-1"
            />
            {formData.skills.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-destructive shrink-0" 
                onClick={() => removeSkill(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addSkill} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Add Another Skill
      </Button>

      <div className="p-4 rounded-xl bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Add 5-10 of your strongest skills that match your target roles.
        </p>
      </div>
    </motion.div>
  );

  const renderPreviewStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Export Actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-semibold">Your resume is ready!</h3>
          <p className="text-sm text-muted-foreground">Download or save to your profile</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveToProfile} disabled={saving} variant="outline" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save to Profile
          </Button>
          <Button onClick={exportToPDF} disabled={exporting} className="gap-2 bg-red-600 hover:bg-red-700">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </Button>
          <Button onClick={exportToJPEG} disabled={exporting} variant="outline" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            JPEG
          </Button>
        </div>
      </div>

      {/* Full Resume Preview */}
      <div className="overflow-x-auto pb-8 flex justify-center">
        <div className="shadow-2xl rounded-lg overflow-hidden">
          <ResumeTemplate data={formData} innerRef={resumeRef} />
        </div>
      </div>
    </motion.div>
  );

  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'basics': return renderBasicsStep();
      case 'contact': return renderContactStep();
      case 'experience': return renderExperienceStep();
      case 'education': return renderEducationStep();
      case 'skills': return renderSkillsStep();
      case 'preview': return renderPreviewStep();
      default: return null;
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Resume Builder</h2>
              <p className="text-primary-foreground/80 mt-1">
                Create a professional resume in minutes with AI assistance
              </p>
            </div>
          </div>

          {/* Auto-fill button */}
          <Button 
            onClick={autoFillFromProfile} 
            disabled={autoFilling}
            variant="secondary"
            className="gap-2 shrink-0"
          >
            {autoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Import from Profile
          </Button>
        </div>

        {/* Progress */}
        <div className="relative mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary-foreground/80">Completion</span>
            <span className="font-semibold">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2 bg-white/20" />
        </div>
      </motion.div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={STEPS} onStepClick={setCurrentStep} />

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Area */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = STEPS[currentStep].icon;
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
                <div>
                  <CardTitle className="text-lg">{STEPS[currentStep].label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AnimatePresence mode="wait">
                {renderCurrentStep()}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          {currentStepId !== 'preview' && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button onClick={goNext} className="gap-2">
                {currentStep === STEPS.length - 2 ? 'Preview Resume' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {currentStepId === 'preview' && (
            <div className="flex items-center justify-center mt-4">
              <Button variant="outline" onClick={goPrev} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Edit Resume
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tips */}
          <TipsCard tips={TIPS[currentStepId as keyof typeof TIPS] || TIPS.basics} />

          {/* Live Preview (non-preview steps) */}
          {currentStepId !== 'preview' && (
            <Card className="overflow-hidden">
              <CardHeader className="py-3 px-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Live Preview</span>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="rounded-lg overflow-hidden shadow-inner border">
                  <ResumeTemplate data={formData} compact />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-xs"
                  onClick={() => setCurrentStep(STEPS.length - 1)}
                >
                  View Full Preview
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium text-sm">Resume Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experiences</span>
                  <Badge variant="secondary">{formData.experience.filter(e => e.title).length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Education</span>
                  <Badge variant="secondary">{formData.education.filter(e => e.degree).length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skills</span>
                  <Badge variant="secondary">{formData.skills.filter(s => s.name).length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/candidate-dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">AI Resume Builder</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {content}
      </main>
    </div>
  );
};

export default AIResumeBuilder;
