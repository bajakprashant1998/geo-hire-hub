import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Sparkles, Loader2, Wand2, Plus, Trash2, Upload,
  FileDown, Image as ImageIcon, Save, Phone, Mail, MapPin, Linkedin,
  GraduationCap, Briefcase, Settings, User as UserIcon, Check, ChevronsUpDown
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

// ─── Types ─────────────────────────────────────────────────
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

// ─── Resume Template Component ─────────────────────────────
const ResumeTemplate = ({ data, innerRef }: { data: ResumeFormData; innerRef: React.RefObject<HTMLDivElement> }) => {
  const accentColor = '#d4874e';
  const darkBg = '#1a2332';

  return (
    <div
      ref={innerRef}
      className="bg-[#f0ebe4] w-[794px] min-h-[1123px] mx-auto font-sans text-[#222] relative overflow-hidden"
      style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
    >
      {/* ── HEADER ─────────────────────────────── */}
      <div className="flex items-start gap-6 p-8 pb-6">
        {/* Photo */}
        <div className="w-[160px] h-[180px] rounded-2xl overflow-hidden shrink-0 bg-gray-200 border-4 border-white shadow-lg">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <UserIcon className="w-16 h-16 text-gray-500" />
            </div>
          )}
        </div>

        {/* Name & Summary */}
        <div className="flex-1 pt-2">
          <h1 className="text-4xl font-extrabold tracking-wide text-[#1a2332] mb-1">
            {data.fullName || 'YOUR NAME'}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg text-[#555]">{data.jobTitle || 'Job Title'}</span>
            <div className="flex-1 h-[3px] rounded" style={{ backgroundColor: accentColor }} />
          </div>
          <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
            <p className="text-sm leading-relaxed text-[#444]">
              {data.summary || 'Your professional summary will appear here...'}
            </p>
          </div>
        </div>
      </div>

      {/* ── BODY: Two Columns ──────────────────── */}
      <div className="flex gap-6 px-8 pb-8">
        {/* LEFT COLUMN */}
        <div className="w-[280px] shrink-0 space-y-6">
          {/* Education */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1a2332] tracking-wide">EDUCATION</h2>
            </div>
            <div className="w-12 h-[3px] mb-4 ml-10 rounded" style={{ backgroundColor: accentColor }} />
            <div className="space-y-4">
              {data.education.map((edu, i) => (
                <div key={i}>
                  <p className="text-sm text-[#888] font-medium">{edu.year}</p>
                  <p className="font-bold text-sm text-[#333]">{edu.degree}</p>
                  <p className="text-sm text-[#666]">{edu.institution}</p>
                </div>
              ))}
              {data.education.length === 0 && (
                <p className="text-sm text-[#aaa] italic">No education added</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1a2332] tracking-wide">SKILLS</h2>
            </div>
            <div className="w-12 h-[3px] mb-4 ml-10 rounded" style={{ backgroundColor: accentColor }} />
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
              {data.skills.length === 0 && (
                <p className="text-sm text-[#aaa] italic col-span-2">No skills added</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 space-y-6">
          {/* Working Experience */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1a2332] tracking-wide">WORKING EXPERIENCE</h2>
            </div>
            <div className="w-12 h-[3px] mb-4 ml-10 rounded" style={{ backgroundColor: accentColor }} />
            <div className="space-y-4">
              {data.experience.map((exp, i) => (
                <div key={i} className="flex gap-4 border-b border-gray-200 pb-4 last:border-0">
                  <div className="w-[110px] shrink-0">
                    <p className="text-sm font-medium text-[#555]">{exp.duration}</p>
                    <p className="text-sm font-bold text-[#333]">{exp.company}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#333]">{exp.title}</p>
                    <p className="text-sm text-[#666] leading-relaxed">{exp.description}</p>
                  </div>
                </div>
              ))}
              {data.experience.length === 0 && (
                <p className="text-sm text-[#aaa] italic">No experience added</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1a2332] tracking-wide">CONTACT ME</h2>
            </div>
            <div className="w-12 h-[3px] mb-4 ml-10 rounded" style={{ backgroundColor: accentColor }} />
            <div className="grid grid-cols-2 gap-3">
              {data.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-bold text-[#333]">Phone</p>
                    <p className="text-xs text-[#666]">{data.phone}</p>
                  </div>
                </div>
              )}
              {data.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-bold text-[#333]">Location</p>
                    <p className="text-xs text-[#666]">{data.location}</p>
                  </div>
                </div>
              )}
              {data.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-bold text-[#333]">Email</p>
                    <p className="text-xs text-[#666] break-all">{data.email}</p>
                  </div>
                </div>
              )}
              {data.linkedin && (
                <div className="flex items-start gap-2">
                  <Linkedin className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-bold text-[#333]">LinkedIn</p>
                    <p className="text-xs text-[#666] break-all">{data.linkedin}</p>
                  </div>
                </div>
              )}
              {data.website && (
                <div className="flex items-start gap-2 col-span-2">
                  <Sparkles className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-xs font-bold text-[#333]">Portfolio</p>
                    <p className="text-xs text-[#666] break-all">{data.website}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────
const AIResumeBuilder = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const resumeRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // States for autocompletes
  const [jobTitleOpen, setJobTitleOpen] = useState(false);
  const [locationPredictions, setLocationPredictions] = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

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

  const updateField = (field: keyof ResumeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Debounced Location Fetch
  const fetchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationPredictions([]);
      return;
    }
    setLocationLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setLocationPredictions(data);
    } catch (e) {
      console.error(e);
    } finally {
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
        } catch {
          // Ignore parsing issues and keep fallback/message.
        }
      }
    }

    return error.message || fallback;
  };

  // Generate individual experience description
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
            options: { single_experience_only: true, company: exp.company } // Custom flag for edge function if needed
          },
          style: 'professional',
          targetRole: exp.title,
        },
      });

      if (response.error) {
        const detailedError = await getEdgeFunctionErrorMessage(response.error, 'Failed to generate');
        throw new Error(detailedError);
      }
      if (response.data?.error && response.data.error !== "Failed to parse AI response") {
        toast.error(response.data.error);
        return;
      }

      const resume = response.data?.resume;
      if (resume?.experience?.length) {
        updateListItem('experience', index, 'description', resume.experience[0].highlights?.join('. ') || '');
        toast.success('Experience description AI-generated!');
      } else {
        // Fallback generic if API doesn't return exactly mapped format
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

  // Generate generic summary
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
      if (response.data?.error) {
        toast.error(response.data.error);
        return;
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

  // Generic Full Resume AI generation from filled fields (Old function, keeping for bottom button)
  const generateWithAI = async () => {
    if (!profile) {
      toast.error('Please log in first');
      return;
    }
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-resume', {
        body: {
          candidateData: {
            name: formData.fullName,
            title: formData.jobTitle,
            skills: formData.skills.map(s => s.name).filter(Boolean),
            experience_years: formData.experience.length,
            education: formData.education.filter(e => e.degree),
            bio: formData.summary || 'Not provided',
          },
          style: 'professional',
          targetRole: formData.jobTitle || null,
        },
      });

      if (response.error) {
        const detailedError = await getEdgeFunctionErrorMessage(response.error, 'Failed to generate');
        throw new Error(detailedError);
      }
      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      const resume = response.data?.resume;
      if (resume) {
        // Auto-fill summary
        if (resume.summary) updateField('summary', resume.summary);

        // Auto-fill experience descriptions if empty
        if (resume.experience?.length) {
          const updated = [...formData.experience];
          resume.experience.forEach((aiExp: any, i: number) => {
            if (updated[i] && !updated[i].description) {
              updated[i] = {
                ...updated[i],
                title: updated[i].title || aiExp.title,
                description: aiExp.highlights?.join('. ') || '',
              };
            }
          });
          updateField('experience', updated);
        }

        toast.success('AI enhanced your resume content!');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate');
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
          resume_score: 85,
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

  // ─── FORM VIEW ─────────────────────────────
  const renderForm = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5" /> Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div
              className="w-24 h-24 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors flex items-center justify-center"
              onClick={() => photoInputRef.current?.click()}
            >
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG under 5MB</p>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Job Title *</Label>
              <Popover open={jobTitleOpen} onOpenChange={setJobTitleOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={jobTitleOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.jobTitle
                      ? COMMON_JOB_TITLES.find((title) => title === formData.jobTitle) || formData.jobTitle
                      : "Select or type job title..."}
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
                      <CommandEmpty>No predefined title found. Using custom text.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_JOB_TITLES.map((title) => (
                          <CommandItem
                            key={title}
                            value={title}
                            onSelect={(currentValue) => {
                              updateField('jobTitle', title);
                              setJobTitleOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${formData.jobTitle === title ? "opacity-100" : "opacity-0"}`}
                            />
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

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Label>Professional Summary</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={generateSummaryWithAI}
                disabled={generating}
              >
                {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                ✨ Generate with AI
              </Button>
            </div>
            <Textarea
              value={formData.summary}
              onChange={e => updateField('summary', e.target.value)}
              placeholder="Write a brief summary about your experience and expertise..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> Contact Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <div className="flex gap-2">
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
              <Label>Email</Label>
              <Input value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="relative">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={e => {
                  updateField('location', e.target.value);
                  fetchLocations(e.target.value);
                }}
                onBlur={() => setTimeout(() => setLocationPredictions([]), 200)}
                placeholder="City, Country"
              />
              {locationPredictions.length > 0 && (
                <div className="absolute top-16 left-0 right-0 bg-popover border rounded-md shadow-md z-50">
                  {locationPredictions.map((pred, idx) => (
                    <div
                      key={idx}
                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent onblur from firing before click
                        const parts = pred.display_name.split(', ');
                        const shortName = `${parts[0]}, ${parts[parts.length - 1]}`;
                        updateField('location', shortName);
                        setLocationPredictions([]);
                      }}
                    >
                      {pred.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input value={formData.linkedin} onChange={e => updateField('linkedin', e.target.value)} placeholder="linkedin.com/in/..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Portfolio / Website</Label>
              <Input value={formData.website} onChange={e => updateField('website', e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Education</CardTitle>
          <Button variant="outline" size="sm" onClick={addEducation}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.education.map((edu, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 relative">
              {formData.education.length > 1 && (
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeEducation(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Year</Label>
                  <Input value={edu.year} onChange={e => updateListItem('education', i, 'year', e.target.value)} placeholder="2023" />
                </div>
                <div>
                  <Label>Degree</Label>
                  <Input value={edu.degree} onChange={e => updateListItem('education', i, 'degree', e.target.value)} placeholder="B.Tech Computer Science" />
                </div>
                <div>
                  <Label>Institution</Label>
                  <Input value={edu.institution} onChange={e => updateListItem('education', i, 'institution', e.target.value)} placeholder="University Name" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Work Experience</CardTitle>
          <Button variant="outline" size="sm" onClick={addExperience}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.experience.map((exp, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 relative">
              {formData.experience.length > 1 && (
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeExperience(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input value={exp.duration} onChange={e => updateListItem('experience', i, 'duration', e.target.value)} placeholder="2023 - 2025" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={exp.company} onChange={e => updateListItem('experience', i, 'company', e.target.value)} placeholder="Company Name" />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={exp.title} onChange={e => updateListItem('experience', i, 'title', e.target.value)} placeholder="Sr. Designer" />
                </div>
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <Label>Description</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => generateExperienceWithAI(i)}
                    disabled={generating || !exp.title}
                  >
                    {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    ✨ Auto Fill Describe
                  </Button>
                </div>
                <Textarea value={exp.description} onChange={e => updateListItem('experience', i, 'description', e.target.value)} placeholder="Describe your work..." rows={3} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Skills</CardTitle>
          <Button variant="outline" size="sm" onClick={addSkill}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.skills.map((skill, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input
                value={skill.name}
                onChange={e => updateListItem('skills', i, 'name', e.target.value)}
                placeholder="Skill name (e.g. Figma)"
                className="flex-1"
              />
              <Input
                value={skill.subtitle}
                onChange={e => updateListItem('skills', i, 'subtitle', e.target.value)}
                placeholder="Subtitle (e.g. UI Design)"
                className="flex-1"
              />
              {formData.skills.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeSkill(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
          size="lg"
          onClick={generateWithAI}
          disabled={generating}
        >
          {generating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
          {generating ? 'AI Enhancing...' : 'AI Enhance Summary'}
        </Button>
        <Button
          size="lg"
          onClick={() => {
            if (!formData.fullName || !formData.jobTitle) {
              toast.error('Please fill in name and job title');
              return;
            }
            setStep('preview');
          }}
          className="flex-1"
        >
          <Sparkles className="w-5 h-5 mr-2" /> Generate Resume
        </Button>
      </div>
    </div>
  );

  // ─── PREVIEW VIEW ──────────────────────────
  const renderPreview = () => (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border shadow-sm sticky top-[65px] z-40">
        <Button variant="ghost" onClick={() => setStep('form')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Edit Form
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={saveToProfile} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save to Profile
        </Button>
        <Button size="sm" onClick={exportToPDF} disabled={exporting} className="bg-red-600 hover:bg-red-700">
          <FileDown className="w-4 h-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={exportToJPEG} disabled={exporting}>
          <ImageIcon className="w-4 h-4 mr-1" /> JPEG
        </Button>
      </div>

      {/* Resume Preview */}
      <div className="overflow-x-auto pb-8">
        <ResumeTemplate data={formData} innerRef={resumeRef} />
      </div>
    </div>
  );

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
        {step === 'form' ? renderForm() : renderPreview()}
      </main>
    </div>
  );
};

export default AIResumeBuilder;
