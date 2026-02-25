import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Filter, Users, Star, MapPin, Briefcase, GraduationCap,
  Clock, DollarSign, FileText, Link2, Award, CheckCircle2, XCircle,
  Trophy, CalendarDays, Sparkles, ChevronDown, ChevronUp, Eye,
  Mail, StickyNote, Loader2, ArrowUpDown, X, SlidersHorizontal,
  TrendingUp, Target, Zap, Download, Brain, Lightbulb, AlertTriangle,
  UserCheck, BarChart3, RefreshCw, Globe, Languages, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useStartConversation } from '@/hooks/useStartConversation';
import { cn } from '@/lib/utils';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CandidateWithMatch {
  id: string;
  candidateId: string;
  fullName: string;
  avatarUrl: string | null;
  userId: string;
  jobTitle: string;
  experienceYears: number;
  skills: string[];
  bio: string | null;
  expectedSalary: string | null;
  certifications: string[];
  portfolioUrls: string[];
  availabilityStatus: string | null;
  preferredJobTypes: string[];
  preferredLocations: string[];
  locationCity: string | null;
  locationCountry: string | null;
  resumeUrl: string | null;
  education: any;
  applicationId: string | null;
  applicationStatus: string | null;
  appliedAt: string | null;
  jobId: string | null;
  jobTitle_applied: string | null;
  matchScore: number;
  coverLetter: string | null;
  whatsappNumber: string | null;
}

interface Filters {
  search: string;
  skills: string[];
  experienceRange: [number, number];
  location: string;
  education: string;
  salaryRange: [number, number];
  matchScoreMin: number;
  certifications: string;
  hasPortfolio: boolean | null;
  hasResume: boolean | null;
  workType: string;
  resumeKeyword: string;
  pipelineStatus: string;
  availability: string;
}

interface AIInsights {
  topPick: { name: string; reason: string } | null;
  poolSummary: string;
  actionTip: string;
  skillGap: string | null;
}

type SortField = 'matchScore' | 'experienceYears' | 'fullName' | 'appliedAt';
type SortDir = 'asc' | 'desc';

const PIPELINE_STATUSES = [
  { value: 'all', label: 'All', icon: Users, color: 'text-foreground' },
  { value: 'pending', label: 'Applied', icon: Clock, color: 'text-primary' },
  { value: 'shortlisted', label: 'Shortlisted', icon: CheckCircle2, color: 'text-success' },
  { value: 'interview', label: 'Interview', icon: CalendarDays, color: 'text-warning' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-destructive' },
  { value: 'hired', label: 'Hired', icon: Trophy, color: 'text-success' },
];

const defaultFilters: Filters = {
  search: '',
  skills: [],
  experienceRange: [0, 30],
  location: '',
  education: '',
  salaryRange: [0, 200000],
  matchScoreMin: 0,
  certifications: '',
  hasPortfolio: null,
  hasResume: null,
  workType: '',
  resumeKeyword: '',
  pipelineStatus: 'all',
  availability: '',
};

export const CandidateFilterTool = ({ employerId }: { employerId: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startConversation } = useStartConversation();
  const [candidates, setCandidates] = useState<CandidateWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithMatch | null>(null);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Local slider state for smooth dragging (avoids re-rendering candidate list on every tick)
  const [localExperienceRange, setLocalExperienceRange] = useState<[number, number]>(defaultFilters.experienceRange);
  const [localMatchScoreMin, setLocalMatchScoreMin] = useState(defaultFilters.matchScoreMin);

  // Sync local slider state when filters change externally (e.g. clear all)
  useEffect(() => {
    setLocalExperienceRange(filters.experienceRange);
    setLocalMatchScoreMin(filters.matchScoreMin);
  }, [filters.experienceRange[0], filters.experienceRange[1], filters.matchScoreMin]);
  
  // AI state
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, [employerId]);

  useEffect(() => {
    if (candidates.length > 0 && !aiInsights && !aiLoading) {
      fetchAIInsights();
    }
  }, [candidates]);

  const fetchAIInsights = async () => {
    if (candidates.length === 0) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-candidate-insights', {
        body: {
          candidates: candidates.slice(0, 15).map(c => ({
            fullName: c.fullName,
            jobTitle: c.jobTitle,
            experienceYears: c.experienceYears,
            skills: c.skills,
            matchScore: c.matchScore,
            locationCity: c.locationCity,
            applicationStatus: c.applicationStatus,
          })),
          jobTitle: candidates[0]?.jobTitle_applied || 'Various positions',
        },
      });
      if (error) throw error;
      if (data?.insights) {
        setAiInsights(data.insights);
      }
    } catch (error) {
      console.error('AI insights failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id, status, created_at, cover_letter, job_id,
          jobs!inner (id, title, employer_id, skills, min_experience, max_experience, location_city),
            candidates!inner (
            id, job_title, experience_years, skills, bio, expected_salary,
            certifications, portfolio_urls, availability_status,
            preferred_job_types, preferred_locations, resume_url, education,
            profiles!inner (id, full_name, avatar_url, user_id, location_city, location_country, whatsapp_number)
          )
        `)
        .eq('jobs.employer_id', employerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const skillSet = new Set<string>();
      const mapped: CandidateWithMatch[] = (applications || []).map((app: any) => {
        const c = app.candidates;
        const p = c.profiles;
        const j = app.jobs;
        const score = calculateMatchScore(c, j);
        (c.skills || []).forEach((s: string) => skillSet.add(s));

        return {
          id: app.id,
          candidateId: c.id,
          fullName: p.full_name || 'Unknown',
          avatarUrl: p.avatar_url,
          userId: p.user_id,
          jobTitle: c.job_title || 'N/A',
          experienceYears: c.experience_years || 0,
          skills: c.skills || [],
          bio: c.bio,
          expectedSalary: c.expected_salary,
          certifications: c.certifications || [],
          portfolioUrls: c.portfolio_urls || [],
          availabilityStatus: c.availability_status,
          preferredJobTypes: c.preferred_job_types || [],
          preferredLocations: c.preferred_locations || [],
          locationCity: p.location_city,
          locationCountry: p.location_country,
          resumeUrl: c.resume_url,
          education: c.education,
          applicationId: app.id,
          applicationStatus: app.status || 'pending',
          appliedAt: app.created_at,
          jobId: j.id,
          jobTitle_applied: j.title,
          matchScore: score,
          coverLetter: app.cover_letter,
          whatsappNumber: p.whatsapp_number || null,
        };
      });

      setCandidates(mapped);
      setAllSkills(Array.from(skillSet).sort());
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = (candidate: any, job: any): number => {
    let score = 0;
    const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
    const jobSkills = (job.skills || []).map((s: string) => s.toLowerCase());
    if (jobSkills.length > 0) {
      const matched = jobSkills.filter((s: string) => candidateSkills.includes(s)).length;
      score += (matched / jobSkills.length) * 40;
    } else {
      score += 20;
    }
    const minExp = job.min_experience || 0;
    const maxExp = job.max_experience || 15;
    const candExp = candidate.experience_years || 0;
    if (candExp >= minExp && candExp <= maxExp + 2) score += 30;
    else if (candExp >= minExp - 1) score += 20;
    else score += 10;
    const edu = candidate.education;
    if (edu && Array.isArray(edu) && edu.length > 0) score += 20;
    else if (edu && typeof edu === 'object') score += 15;
    else score += 5;
    const candidateLoc = (candidate.profiles?.location_city || '').toLowerCase();
    const jobLoc = (job.location_city || '').toLowerCase();
    if (candidateLoc && jobLoc && candidateLoc.includes(jobLoc)) score += 10;
    else if (candidate.preferred_locations?.some((l: string) => l.toLowerCase().includes(jobLoc))) score += 7;
    else score += 3;
    return Math.min(Math.round(score), 100);
  };

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c => c.fullName.toLowerCase().includes(q) || c.jobTitle.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q)));
    }
    if (filters.skills.length > 0) {
      result = result.filter(c => filters.skills.every(skill => c.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))));
    }
    result = result.filter(c => c.experienceYears >= filters.experienceRange[0] && c.experienceYears <= filters.experienceRange[1]);
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(c => (c.locationCity || '').toLowerCase().includes(loc) || (c.locationCountry || '').toLowerCase().includes(loc));
    }
    if (filters.matchScoreMin > 0) result = result.filter(c => c.matchScore >= filters.matchScoreMin);
    if (filters.hasPortfolio === true) result = result.filter(c => c.portfolioUrls.length > 0);
    if (filters.hasResume === true) result = result.filter(c => !!c.resumeUrl);
    if (filters.certifications) {
      const cert = filters.certifications.toLowerCase();
      result = result.filter(c => c.certifications.some(ct => ct.toLowerCase().includes(cert)));
    }
    if (filters.workType) result = result.filter(c => c.preferredJobTypes.some(t => t.toLowerCase().includes(filters.workType.toLowerCase())));
    if (filters.resumeKeyword) {
      const kw = filters.resumeKeyword.toLowerCase();
      result = result.filter(c => (c.bio || '').toLowerCase().includes(kw) || c.skills.some(s => s.toLowerCase().includes(kw)) || (c.coverLetter || '').toLowerCase().includes(kw));
    }
    if (filters.availability) {
      result = result.filter(c => (c.availabilityStatus || '').toLowerCase() === filters.availability.toLowerCase());
    }
    if (filters.pipelineStatus !== 'all') result = result.filter(c => c.applicationStatus === filters.pipelineStatus);
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'matchScore': cmp = a.matchScore - b.matchScore; break;
        case 'experienceYears': cmp = a.experienceYears - b.experienceYears; break;
        case 'fullName': cmp = a.fullName.localeCompare(b.fullName); break;
        case 'appliedAt': cmp = new Date(a.appliedAt || 0).getTime() - new Date(b.appliedAt || 0).getTime(); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [candidates, filters, sortField, sortDir]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { all: candidates.length };
    candidates.forEach(c => { counts[c.applicationStatus || 'pending'] = (counts[c.applicationStatus || 'pending'] || 0) + 1; });
    return counts;
  }, [candidates]);

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
      if (error) throw error;
      setCandidates(prev => prev.map(c => c.applicationId === applicationId ? { ...c, applicationStatus: status } : c));
      toast.success(`Candidate ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase.from('applications').update({ status }).in('id', selectedIds);
      if (error) throw error;
      setCandidates(prev => prev.map(c => selectedIds.includes(c.applicationId || '') ? { ...c, applicationStatus: status } : c));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} candidates updated`);
    } catch { toast.error('Failed to update'); } finally { setBulkLoading(false); }
  };

  const addSkillFilter = (skill: string) => {
    if (skill && !filters.skills.includes(skill)) {
      setFilters(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
    }
  };
  const removeSkillFilter = (skill: string) => {
    setFilters(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };
  const clearFilters = () => { setFilters(defaultFilters); setSkillInput(''); };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.skills.length > 0) count++;
    if (filters.experienceRange[0] > 0 || filters.experienceRange[1] < 30) count++;
    if (filters.location) count++;
    if (filters.matchScoreMin > 0) count++;
    if (filters.hasPortfolio !== null) count++;
    if (filters.hasResume !== null) count++;
    if (filters.certifications) count++;
    if (filters.workType) count++;
    if (filters.resumeKeyword) count++;
    if (filters.availability) count++;
    return count;
  }, [filters]);

  // Generate active filter labels for chip display
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.skills.length > 0) filters.skills.forEach(s => chips.push({ label: `Skill: ${s}`, key: `skill-${s}` }));
    if (filters.experienceRange[0] > 0 || filters.experienceRange[1] < 30) chips.push({ label: `${filters.experienceRange[0]}-${filters.experienceRange[1]}y exp`, key: 'exp' });
    if (filters.location) chips.push({ label: `📍 ${filters.location}`, key: 'loc' });
    if (filters.matchScoreMin > 0) chips.push({ label: `≥${filters.matchScoreMin}% match`, key: 'score' });
    if (filters.hasPortfolio) chips.push({ label: 'Has portfolio', key: 'portfolio' });
    if (filters.hasResume) chips.push({ label: 'Has resume', key: 'resume' });
    if (filters.certifications) chips.push({ label: `Cert: ${filters.certifications}`, key: 'cert' });
    if (filters.workType) chips.push({ label: filters.workType, key: 'work' });
    if (filters.availability) chips.push({ label: `${filters.availability}`, key: 'avail' });
    if (filters.resumeKeyword) chips.push({ label: `"${filters.resumeKeyword}"`, key: 'kw' });
    return chips;
  }, [filters]);

  const removeFilterChip = (key: string) => {
    if (key.startsWith('skill-')) {
      const skill = key.replace('skill-', '');
      removeSkillFilter(skill);
    } else if (key === 'exp') setFilters(prev => ({ ...prev, experienceRange: [0, 30] }));
    else if (key === 'loc') setFilters(prev => ({ ...prev, location: '' }));
    else if (key === 'score') setFilters(prev => ({ ...prev, matchScoreMin: 0 }));
    else if (key === 'portfolio') setFilters(prev => ({ ...prev, hasPortfolio: null }));
    else if (key === 'resume') setFilters(prev => ({ ...prev, hasResume: null }));
    else if (key === 'cert') setFilters(prev => ({ ...prev, certifications: '' }));
    else if (key === 'work') setFilters(prev => ({ ...prev, workType: '' }));
    else if (key === 'avail') setFilters(prev => ({ ...prev, availability: '' }));
    else if (key === 'kw') setFilters(prev => ({ ...prev, resumeKeyword: '' }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success/10 border-success/30';
    if (score >= 60) return 'text-primary bg-primary/10 border-primary/30';
    if (score >= 40) return 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-400/50';
    return 'text-muted-foreground bg-muted border-border';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'ring-success/40';
    if (score >= 60) return 'ring-primary/40';
    if (score >= 40) return 'ring-amber-400/50';
    return 'ring-muted-foreground/20';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: 'Applied', className: 'bg-primary/10 text-primary border-primary/20' },
      reviewed: { label: 'Reviewed', className: 'bg-muted text-muted-foreground border-border' },
      shortlisted: { label: 'Shortlisted', className: 'bg-success/10 text-success border-success/20' },
      interview: { label: 'Interview', className: 'bg-warning/10 text-warning-foreground border-warning/20' },
      rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      hired: { label: 'Hired', className: 'bg-success/10 text-success border-success/20' },
    };
    const c = config[status] || config.pending;
    return <Badge className={`${c.className} text-[10px] font-semibold border`}>{c.label}</Badge>;
  };

  // Filter section component with animations
  const FilterSection = ({ label, icon: Icon, children, defaultOpen = true }: { label: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="border-b border-border/30 last:border-0 pb-4 last:pb-0">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full group py-1"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            {label}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2.5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <FilterSection label="Skills" icon={Sparkles}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Type a skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSkillFilter(skillInput); }} className="h-9 text-sm pl-8 rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
          {skillInput && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-10 mt-1 w-full bg-popover border rounded-xl shadow-lg max-h-40 overflow-y-auto"
            >
              {allSkills.filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !filters.skills.includes(s)).slice(0, 8).map(s => (
                <button key={s} onClick={() => addSkillFilter(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl">{s}</button>
              ))}
            </motion.div>
          )}
        </div>
        {filters.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {filters.skills.map(s => (
              <motion.div key={s} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <Badge variant="secondary" className="gap-1 text-[10px] pr-1 rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">
                  {s}
                  <button onClick={() => removeSkillFilter(s)} className="hover:text-destructive ml-0.5"><X className="w-3 h-3" /></button>
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </FilterSection>

      <FilterSection label="Experience" icon={Briefcase}>
        <div className="px-2">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-3">
            <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{localExperienceRange[0]}y</span>
            <span className="text-[10px]">Experience Range</span>
            <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">{localExperienceRange[1]}y</span>
          </div>
          <Slider
            value={localExperienceRange}
            onValueChange={(v) => setLocalExperienceRange(v as [number, number])}
            onValueCommit={(v) => setFilters(prev => ({ ...prev, experienceRange: v as [number, number] }))}
            min={0} max={30} step={1}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground/60 mt-1.5 px-0.5">
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection label="Match Score" icon={Target}>
        <div className="px-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-muted-foreground">Minimum</span>
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-lg transition-all duration-200",
              localMatchScoreMin >= 80 ? "bg-success/15 text-success" :
              localMatchScoreMin >= 50 ? "bg-primary/15 text-primary" :
              "bg-muted text-muted-foreground"
            )}>
              {localMatchScoreMin}%
            </span>
          </div>
          <Slider
            value={[localMatchScoreMin]}
            onValueChange={(v) => setLocalMatchScoreMin(v[0])}
            onValueCommit={(v) => setFilters(prev => ({ ...prev, matchScoreMin: v[0] }))}
            min={0} max={100} step={5}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground/60 mt-1.5 px-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection label="Location" icon={MapPin}>
        <div className="relative">
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="City or country..." value={filters.location} onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))} className="h-9 text-sm pl-8 rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
        </div>
      </FilterSection>

      <FilterSection label="Work Type" icon={Briefcase} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5">
          {['', 'remote', 'onsite', 'hybrid'].map(type => (
            <button
              key={type || 'any'}
              onClick={() => setFilters(prev => ({ ...prev, workType: type }))}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-150",
                filters.workType === type
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/30 text-muted-foreground border-border/40 hover:border-border hover:bg-muted/60"
              )}
            >
              {type || 'Any'}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection label="Availability" icon={Clock} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5">
          {['', 'immediate', 'two_weeks', 'one_month'].map(avail => {
            const labels: Record<string, string> = { '': 'Any', immediate: 'Immediate', two_weeks: '2 Weeks', one_month: '1 Month' };
            return (
              <button
                key={avail || 'any'}
                onClick={() => setFilters(prev => ({ ...prev, availability: avail }))}
                className={cn(
                  "px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-150",
                  filters.availability === avail
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-border/40 hover:border-border hover:bg-muted/60"
                )}
              >
                {labels[avail] || avail}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Advanced section */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full py-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {showAdvanced ? 'Hide' : 'More'} Filters
        <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform duration-200", showAdvanced && "rotate-180")} />
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 overflow-hidden"
          >
            <FilterSection label="Certifications" icon={Award} defaultOpen={true}>
              <Input placeholder="e.g. AWS, PMP..." value={filters.certifications} onChange={e => setFilters(prev => ({ ...prev, certifications: e.target.value }))} className="h-9 text-sm rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
            </FilterSection>

            <FilterSection label="Keyword Search" icon={Search} defaultOpen={true}>
              <Input placeholder="Search in bio & cover letter..." value={filters.resumeKeyword} onChange={e => setFilters(prev => ({ ...prev, resumeKeyword: e.target.value }))} className="h-9 text-sm rounded-xl bg-muted/50 border-border/50 focus:bg-card" />
            </FilterSection>

            <div className="space-y-2.5 pl-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <Checkbox checked={filters.hasPortfolio === true} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPortfolio: checked ? true : null }))} />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Has portfolio links</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <Checkbox checked={filters.hasResume === true} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasResume: checked ? true : null }))} />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Has uploaded resume</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeFilterCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl gap-1.5">
            <X className="w-3.5 h-3.5" /> Clear all filters ({activeFilterCount})
          </Button>
        </motion.div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
            <div className="h-24 bg-muted/50 animate-pulse rounded-2xl" />
          </motion.div>
        ))}
      </div>
    );
  }

  const avgScore = candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / candidates.length) : 0;

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-0 overflow-x-hidden">
      {/* AI Insights Banner — Compact & Elegant */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-r from-primary/[0.06] via-card to-success/[0.04] relative backdrop-blur-sm rounded-2xl shadow-md overflow-hidden w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
              <button
                onClick={() => setShowAiPanel(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <CardContent className="p-4 sm:p-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">AI Hiring Assistant</h3>
                    <p className="text-[10px] text-muted-foreground">Smart insights for your talent pool</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] gap-1.5 text-primary hover:bg-primary/5 rounded-full px-3 shrink-0"
                    onClick={() => { setAiInsights(null); fetchAIInsights(); }}
                    disabled={aiLoading}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", aiLoading && "animate-spin")} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground py-6 justify-center">
                    <div className="relative">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <div className="absolute inset-0 w-6 h-6 rounded-full bg-primary/10 animate-ping" />
                    </div>
                    <span className="font-medium">Analyzing your candidates...</span>
                  </div>
                ) : aiInsights ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 overflow-hidden">
                    {aiInsights.topPick && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-3 sm:p-4 rounded-2xl bg-success/[0.07] border border-success/15 hover:bg-success/[0.1] transition-all duration-200 overflow-hidden group">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                            <Trophy className="w-3 h-3 text-success" />
                          </div>
                          <span className="text-[10px] font-bold text-success uppercase tracking-widest">Top Pick</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground truncate">{aiInsights.topPick.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 break-words leading-relaxed">{aiInsights.topPick.reason}</p>
                      </motion.div>
                    )}
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-3 sm:p-4 rounded-2xl bg-primary/[0.05] border border-primary/15 hover:bg-primary/[0.08] transition-all duration-200 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                          <BarChart3 className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Quality</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-3 break-words leading-relaxed">{aiInsights.poolSummary}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-3 sm:p-4 rounded-2xl bg-warning/[0.06] border border-warning/15 hover:bg-warning/[0.09] transition-all duration-200 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-5 h-5 rounded-full bg-warning/15 flex items-center justify-center">
                          <Lightbulb className="w-3 h-3 text-warning" />
                        </div>
                        <span className="text-[10px] font-bold text-warning-foreground uppercase tracking-widest">Tip</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-3 break-words leading-relaxed">{aiInsights.actionTip}</p>
                    </motion.div>
                    {aiInsights.skillGap && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-3 sm:p-4 rounded-2xl bg-destructive/[0.04] border border-destructive/15 hover:bg-destructive/[0.07] transition-all duration-200 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          </div>
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">Gap</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-3 break-words leading-relaxed">{aiInsights.skillGap}</p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">No insights available yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAiPanel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-2 border-primary/20 text-primary rounded-full hover:bg-primary/5 px-4 shadow-sm" onClick={() => setShowAiPanel(true)}>
            <Brain className="w-4 h-4" /> Show AI Insights
          </Button>
        </motion.div>
      )}

      {/* Header Stats — Cleaner cards with subtle depth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { label: 'Candidates', value: candidates.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/10' },
          { label: 'Avg Match', value: `${avgScore}%`, icon: Target, color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/10' },
          { label: 'Shortlisted', value: pipelineCounts['shortlisted'] || 0, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/10' },
          { label: 'Top Matches', value: candidates.filter(c => c.matchScore >= 80).length, icon: Sparkles, color: 'text-warning', bg: 'bg-warning/10', ring: 'ring-warning/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/30 bg-card hover:shadow-md transition-all duration-300 rounded-2xl ring-1 ring-inset hover:scale-[1.02] group" style={{ '--tw-ring-color': undefined } as any}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-extrabold text-foreground leading-none tracking-tight">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Tabs */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Pipeline</p>
        <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
          {PIPELINE_STATUSES.map((status, i) => {
            const count = pipelineCounts[status.value] || 0;
            const isActive = filters.pipelineStatus === status.value;
            return (
              <Tooltip key={status.value}>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setFilters(prev => ({ ...prev, pipelineStatus: status.value }))}
                    className={cn(
                      "relative flex items-center justify-center transition-all duration-200 border",
                      "w-11 h-11 rounded-xl sm:w-auto sm:h-auto sm:rounded-full sm:px-4 sm:py-2 sm:gap-2",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 border-primary scale-105"
                        : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm"
                    )}
                  >
                    <status.icon className={cn("w-4 h-4 sm:w-4 sm:h-4", !isActive && status.color)} />
                    <span className="hidden sm:inline text-xs font-semibold">{status.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 sm:static sm:top-auto sm:right-auto text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold min-w-[18px] sm:min-w-[22px] text-center leading-none",
                        isActive ? "bg-primary-foreground/25" : "bg-primary text-primary-foreground sm:bg-muted sm:text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden text-xs">{status.label} ({count})</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      <AnimatePresence>
        {activeFilterChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 flex-wrap py-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Active:</span>
              {activeFilterChips.map(chip => (
                <motion.div
                  key={chip.key}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  layout
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[10px] pr-1 rounded-lg bg-primary/8 text-primary border border-primary/15 hover:bg-primary/12 transition-colors cursor-default"
                  >
                    {chip.label}
                    <button onClick={() => removeFilterChip(chip.key)} className="hover:text-destructive ml-0.5 p-0.5 rounded-sm hover:bg-destructive/10 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
              <button onClick={clearFilters} className="text-[10px] text-destructive hover:underline font-medium ml-1">
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-4 border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 bg-gradient-to-b from-muted/30 to-transparent">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                </div>
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="text-[10px] ml-auto bg-primary text-primary-foreground border-0 rounded-lg px-2">{activeFilterCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <FilterPanel />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search + Sort + Mobile Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, or skill..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 h-11 rounded-full bg-muted/30 border-border/40 focus:bg-card focus:shadow-md focus:border-primary/30 transition-all text-sm"
              />
              {filters.search && (
                <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={`${sortField}-${sortDir}`} onValueChange={v => {
              const [f, d] = v.split('-') as [SortField, SortDir];
              setSortField(f); setSortDir(d);
            }}>
              <SelectTrigger className="w-11 sm:w-[160px] h-11 text-xs shrink-0 rounded-full border-border/40 px-3 sm:px-3">
                <ArrowUpDown className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5 shrink-0" />
                <span className="hidden sm:inline"><SelectValue /></span>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="matchScore-desc">Best Match</SelectItem>
                <SelectItem value="matchScore-asc">Lowest Match</SelectItem>
                <SelectItem value="experienceYears-desc">Most Experienced</SelectItem>
                <SelectItem value="experienceYears-asc">Least Experienced</SelectItem>
                <SelectItem value="appliedAt-desc">Newest First</SelectItem>
                <SelectItem value="appliedAt-asc">Oldest First</SelectItem>
                <SelectItem value="fullName-asc">Name A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden h-11 w-11 shrink-0 relative rounded-full border-border/40 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all">
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-md">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto sm:max-w-none">
                <SheetHeader><SheetTitle className="text-sm flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-primary" /> Filters</SheetTitle></SheetHeader>
                <div className="mt-4 pb-6"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3.5 bg-primary/5 border border-primary/15 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                  <Checkbox
                    checked={selectedIds.length === filteredCandidates.length}
                    onCheckedChange={() => {
                      if (selectedIds.length === filteredCandidates.length) setSelectedIds([]);
                      else setSelectedIds(filteredCandidates.map(c => c.applicationId || '').filter(Boolean));
                    }}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-foreground">{selectedIds.length} selected</span>
                  <div className="flex-1" />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 rounded-lg sm:rounded-xl px-2 sm:px-3" onClick={() => handleBulkAction('shortlisted')} disabled={bulkLoading}>
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Shortlist</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 text-destructive border-destructive/30 rounded-lg sm:rounded-xl px-2 sm:px-3" onClick={() => handleBulkAction('rejected')} disabled={bulkLoading}>
                      <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Reject</span>
                    </Button>
                    <Button size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-lg sm:rounded-xl px-2 sm:px-3" onClick={() => handleBulkAction('hired')} disabled={bulkLoading}>
                      <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Hire</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredCandidates.length}</span> candidate{filteredCandidates.length !== 1 ? 's' : ''} found
            </p>
            {filteredCandidates.length > 1 && selectedIds.length === 0 && (
              <button onClick={() => setSelectedIds(filteredCandidates.map(c => c.applicationId || '').filter(Boolean))} className="text-xs text-primary hover:underline font-medium">
                Select all
              </button>
            )}
          </div>

          {/* Candidate Cards */}
          {filteredCandidates.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-dashed border-2 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">No candidates match your filters</p>
                  <p className="text-sm text-muted-foreground mb-5">Try adjusting your search criteria or removing some filters</p>
                  {activeFilterCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl gap-1.5">
                      <X className="w-3.5 h-3.5" /> Clear all filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((candidate, index) => {
                const initials = candidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelected = selectedIds.includes(candidate.applicationId || '');
                const isTopPick = aiInsights?.topPick?.name?.toLowerCase().includes(candidate.fullName.split(' ')[0].toLowerCase());
                const timeAgo = candidate.appliedAt ? formatDistanceToNow(new Date(candidate.appliedAt), { addSuffix: false }) : null;

                return (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3), type: 'spring', stiffness: 100, damping: 20 }}
                    layout
                  >
                    <Card className={cn(
                      "group transition-all duration-300 relative rounded-2xl border shadow-sm hover:shadow-lg",
                      isSelected ? "ring-2 ring-primary bg-primary/[0.02] shadow-md border-primary/20" :
                      isTopPick ? "ring-1 ring-success/30 bg-gradient-to-r from-success/[0.02] via-card to-card hover:ring-success/50 border-success/20" :
                      "bg-card border-border/40 hover:border-border/60"
                    )}>
                      {/* AI Top Pick ribbon */}
                      {isTopPick && (
                        <div className="absolute -top-px left-4 sm:left-5 z-10">
                          <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground text-[9px] font-bold gap-1 shadow-lg border-0 rounded-b-xl rounded-t-none px-2.5 py-1">
                            <Brain className="w-3 h-3" /> AI Top Pick
                          </Badge>
                        </div>
                      )}

                      <CardContent className={cn("p-0", isTopPick && "pt-2")}>
                        {/* Main content area */}
                        <div className="p-3 sm:p-5">
                          <div className="flex items-start gap-2.5 sm:gap-4">
                            {/* Checkbox */}
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedIds([...selectedIds, candidate.applicationId || '']);
                                else setSelectedIds(selectedIds.filter(id => id !== candidate.applicationId));
                              }}
                              className="mt-2 shrink-0"
                            />

                            {/* Avatar with match score */}
                            <div className="relative shrink-0 cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                              <Avatar className={cn("w-12 h-12 sm:w-14 sm:h-14 ring-[3px] shadow-md transition-all duration-200 group-hover:shadow-lg", getScoreRingColor(candidate.matchScore))}>
                                <AvatarImage src={candidate.avatarUrl || ''} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs sm:text-sm">{initials}</AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "absolute -bottom-1.5 -right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border-2 border-card shadow-md",
                                getScoreColor(candidate.matchScore)
                              )}>
                                {candidate.matchScore}%
                              </div>
                            </div>

                            {/* Info section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h4
                                  className="font-bold text-foreground text-sm sm:text-base leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                                  onClick={() => setSelectedCandidate(candidate)}
                                >
                                  {candidate.fullName}
                                </h4>
                                {getStatusBadge(candidate.applicationStatus || 'pending')}
                              </div>

                              {/* Meta row */}
                              <div className="flex items-center gap-1.5 sm:gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                                  <span className="truncate max-w-[120px] sm:max-w-none">{candidate.jobTitle}</span>
                                </span>
                                <span className="font-semibold text-foreground/70">{candidate.experienceYears}y exp</span>
                                {timeAgo && (
                                  <span className="flex items-center gap-1 text-muted-foreground/60">
                                    <Clock className="w-3 h-3 shrink-0" /> {timeAgo}
                                  </span>
                                )}
                              </div>

                              {/* Skills */}
                              {candidate.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {candidate.skills.slice(0, 3).map(skill => (
                                    <span key={skill} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border/30 truncate max-w-[100px] sm:max-w-[140px]">
                                      {skill}
                                    </span>
                                  ))}
                                  {candidate.skills.length > 3 && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-dashed border-border/50 text-muted-foreground/60">
                                      +{candidate.skills.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Applied for */}
                              {candidate.jobTitle_applied && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                                  Applied for <span className="font-semibold text-foreground/70">{candidate.jobTitle_applied}</span>
                                </p>
                              )}
                            </div>

                            {/* Desktop actions */}
                            <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
                              <Button variant="outline" size="sm" className="h-9 text-xs px-4 gap-2 rounded-full hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all" onClick={() => navigate(`/candidates/${candidate.candidateId}`)}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="h-9 text-xs px-4 gap-2 rounded-full transition-all" onClick={() => startConversation(candidate.userId, candidate.jobId || undefined)}>
                                <Mail className="w-3.5 h-3.5" /> Message
                              </Button>
                              {candidate.whatsappNumber && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 text-xs px-4 gap-2 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border-[#25D366]/40 hover:border-[#25D366] transition-all"
                                  onClick={() => window.open(`https://wa.me/${candidate.whatsappNumber}`, '_blank')}
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                  WhatsApp
                                </Button>
                              )}
                              {(candidate.applicationStatus === 'pending' || candidate.applicationStatus === 'reviewed') && (
                                <Button size="sm" className="h-9 text-xs px-4 gap-2 bg-success hover:bg-success/90 text-success-foreground rounded-full transition-all" onClick={() => updateStatus(candidate.applicationId || '', 'shortlisted')}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile action bar — full-width bottom strip */}
                        <div className="flex sm:hidden items-center border-t border-border/20 bg-muted/20">
                          <button
                            onClick={() => navigate(`/candidates/${candidate.candidateId}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-r border-border/20"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => startConversation(candidate.userId, candidate.jobId || undefined)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-r border-border/20"
                          >
                            <Mail className="w-3.5 h-3.5" /> Message
                          </button>
                          {candidate.whatsappNumber && (
                            <button
                              onClick={() => window.open(`https://wa.me/${candidate.whatsappNumber}`, '_blank')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[#25D366] hover:bg-[#25D366]/10 transition-colors border-r border-border/20"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              WA
                            </button>
                          )}
                          {(candidate.applicationStatus === 'pending' || candidate.applicationStatus === 'reviewed') && (
                            <button
                              onClick={() => updateStatus(candidate.applicationId || '', 'shortlisted')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-success hover:bg-success/10 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => { if (!open) setSelectedCandidate(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl mx-2 sm:mx-auto p-0 border-0 shadow-2xl">
          {selectedCandidate && (
            <>
              {/* Hero header */}
              <div className="bg-gradient-to-br from-primary/[0.08] via-card to-success/[0.04] p-5 sm:p-7 pb-4 sm:pb-5">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 ring-[3px] ring-primary/20 shadow-lg">
                      <AvatarImage src={selectedCandidate.avatarUrl || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-base">
                        {selectedCandidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-xl font-bold">{selectedCandidate.fullName}</span>
                      <p className="text-sm font-normal text-muted-foreground mt-0.5">{selectedCandidate.jobTitle}</p>
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 text-sm font-extrabold px-4 py-2 rounded-full border-2 shadow-sm", getScoreColor(selectedCandidate.matchScore))}>
                      <Sparkles className="w-4 h-4" />
                      {selectedCandidate.matchScore}%
                    </div>
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="space-y-4 px-5 sm:px-7 pb-5 sm:pb-7">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/20">
                    <Briefcase className="w-4 h-4 text-primary/60 shrink-0" />
                    <span className="truncate">{selectedCandidate.experienceYears}y experience</span>
                  </div>
                  {selectedCandidate.locationCity && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/20">
                      <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
                      <span className="truncate">{selectedCandidate.locationCity}{selectedCandidate.locationCountry ? `, ${selectedCandidate.locationCountry}` : ''}</span>
                    </div>
                  )}
                  {selectedCandidate.expectedSalary && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/20">
                      <DollarSign className="w-4 h-4 text-primary/60 shrink-0" />
                      <span className="truncate">{selectedCandidate.expectedSalary}</span>
                    </div>
                  )}
                  {selectedCandidate.availabilityStatus && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm p-2.5 sm:p-3 bg-muted/40 rounded-xl border border-border/20">
                      <Clock className="w-4 h-4 text-primary/60 shrink-0" />
                      <span className="capitalize truncate">{selectedCandidate.availabilityStatus}</span>
                    </div>
                  )}
                </div>

                {selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map(s => (
                        <span key={s} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary/[0.06] text-primary border border-primary/15">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.bio && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedCandidate.bio}</p>
                  </div>
                )}

                {selectedCandidate.certifications.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.certifications.map(c => (
                        <Badge key={c} variant="outline" className="text-xs gap-1 rounded-lg"><Award className="w-3 h-3" /> {c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.portfolioUrls.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Portfolio</h4>
                    <div className="space-y-1">
                      {selectedCandidate.portfolioUrls.map(url => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline truncate">
                          <Link2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.coverLetter && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cover Letter</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 border border-border/30 leading-relaxed">{selectedCandidate.coverLetter}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/30">
                  <Button className="flex-1 min-w-[120px] gap-1.5 rounded-xl h-10" onClick={() => navigate(`/candidates/${selectedCandidate.candidateId}`)}>
                    <Eye className="w-4 h-4" /> Full Profile
                  </Button>
                  <Button variant="outline" className="gap-1.5 rounded-xl h-10" onClick={() => startConversation(selectedCandidate.userId, selectedCandidate.jobId || undefined)}>
                    <Mail className="w-4 h-4" /> Message
                  </Button>
                  {(selectedCandidate.applicationStatus === 'pending' || selectedCandidate.applicationStatus === 'reviewed') && (
                    <>
                      <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl h-10 px-4" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'shortlisted'); setSelectedCandidate(null); }}>
                        <CheckCircle2 className="w-4 h-4" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 rounded-xl h-10 px-4" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'rejected'); setSelectedCandidate(null); }}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  {selectedCandidate.applicationStatus === 'shortlisted' && (
                    <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl h-10 px-4" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'hired'); setSelectedCandidate(null); }}>
                      <Trophy className="w-4 h-4" /> Hire
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
