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
            profiles!inner (id, full_name, avatar_url, user_id, location_city, location_country)
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
    if (score >= 40) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'ring-success/40';
    if (score >= 60) return 'ring-primary/40';
    if (score >= 40) return 'ring-warning/40';
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
        <div className="px-1">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
            <span>{filters.experienceRange[0]} years</span>
            <span>{filters.experienceRange[1]} years</span>
          </div>
          <Slider value={filters.experienceRange} onValueChange={(v) => setFilters(prev => ({ ...prev, experienceRange: v as [number, number] }))} min={0} max={30} step={1} />
        </div>
      </FilterSection>

      <FilterSection label="Match Score" icon={Target}>
        <div className="px-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">Minimum</span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              filters.matchScoreMin >= 80 ? "bg-success/10 text-success" :
              filters.matchScoreMin >= 50 ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground"
            )}>
              {filters.matchScoreMin}%
            </span>
          </div>
          <Slider value={[filters.matchScoreMin]} onValueChange={(v) => setFilters(prev => ({ ...prev, matchScoreMin: v[0] }))} min={0} max={100} step={5} />
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
    <div className="space-y-5">
      {/* AI Insights Banner */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.05] overflow-hidden relative backdrop-blur-sm rounded-2xl shadow-sm">
              <button
                onClick={() => setShowAiPanel(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10 p-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                    <Brain className="w-4.5 h-4.5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">AI Hiring Assistant</h3>
                    <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 text-[11px] gap-1.5 text-primary hover:bg-primary/5 rounded-xl"
                    onClick={() => { setAiInsights(null); fetchAIInsights(); }}
                    disabled={aiLoading}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", aiLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <div className="absolute inset-0 w-5 h-5 rounded-full bg-primary/10 animate-ping" />
                    </div>
                    Analyzing your candidate pool...
                  </div>
                ) : aiInsights ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {aiInsights.topPick && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="p-3.5 rounded-2xl bg-success/5 border border-success/15 hover:bg-success/8 transition-colors">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Trophy className="w-3.5 h-3.5 text-success" />
                          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Top Pick</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{aiInsights.topPick.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{aiInsights.topPick.reason}</p>
                      </motion.div>
                    )}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 hover:bg-primary/8 transition-colors">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Pool Quality</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.poolSummary}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="p-3.5 rounded-2xl bg-warning/5 border border-warning/15 hover:bg-warning/8 transition-colors">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-warning" />
                        <span className="text-[10px] font-bold text-warning-foreground uppercase tracking-wider">Tip</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.actionTip}</p>
                    </motion.div>
                    {aiInsights.skillGap && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="p-3.5 rounded-2xl bg-destructive/5 border border-destructive/15 hover:bg-destructive/8 transition-colors">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Skill Gap</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.skillGap}</p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No insights available yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAiPanel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/20 text-primary rounded-xl hover:bg-primary/5" onClick={() => setShowAiPanel(true)}>
            <Brain className="w-3.5 h-3.5" /> Show AI Insights
          </Button>
        </motion.div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Candidates', value: candidates.length, icon: Users, gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/15 text-primary' },
          { label: 'Avg Match Score', value: `${avgScore}%`, icon: Target, gradient: 'from-success/10 to-success/5', iconBg: 'bg-success/15 text-success' },
          { label: 'Shortlisted', value: pipelineCounts['shortlisted'] || 0, icon: CheckCircle2, gradient: 'from-success/10 to-success/5', iconBg: 'bg-success/15 text-success' },
          { label: 'Top Matches', value: candidates.filter(c => c.matchScore >= 80).length, icon: Sparkles, gradient: 'from-warning/10 to-warning/5', iconBg: 'bg-warning/15 text-warning' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={cn("border-border/40 bg-gradient-to-br hover:shadow-md transition-all duration-200 rounded-2xl hover:scale-[1.02]", stat.gradient)}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", stat.iconBg)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {PIPELINE_STATUSES.map((status, i) => {
          const count = pipelineCounts[status.value] || 0;
          const isActive = filters.pipelineStatus === status.value;
          return (
            <motion.button
              key={status.value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setFilters(prev => ({ ...prev, pipelineStatus: status.value }))}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 border",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 border-primary scale-[1.02]"
                  : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 hover:shadow-sm"
              )}
            >
              <status.icon className={cn("w-3.5 h-3.5", !isActive && status.color)} />
              {status.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center",
                  isActive ? "bg-primary-foreground/20" : "bg-muted"
                )}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
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
        <div className="lg:col-span-3 space-y-3">
          {/* Search + Sort + Mobile Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, title, or skills..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 h-11 rounded-2xl bg-muted/30 border-border/50 focus:bg-card focus:shadow-sm transition-all"
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
              <SelectTrigger className="w-[160px] h-11 text-xs shrink-0 rounded-2xl border-border/50">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
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
                <Button variant="outline" size="icon" className="lg:hidden h-11 w-11 shrink-0 relative rounded-2xl border-border/50">
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-sm">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] overflow-y-auto">
                <SheetHeader><SheetTitle className="text-sm flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-primary" /> Filters</SheetTitle></SheetHeader>
                <div className="mt-4"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-2.5 p-3.5 bg-primary/5 border border-primary/15 rounded-2xl backdrop-blur-sm">
                  <Checkbox
                    checked={selectedIds.length === filteredCandidates.length}
                    onCheckedChange={() => {
                      if (selectedIds.length === filteredCandidates.length) setSelectedIds([]);
                      else setSelectedIds(filteredCandidates.map(c => c.applicationId || '').filter(Boolean));
                    }}
                  />
                  <span className="text-sm font-semibold text-foreground">{selectedIds.length} selected</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 rounded-xl" onClick={() => handleBulkAction('shortlisted')} disabled={bulkLoading}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive border-destructive/30 rounded-xl" onClick={() => handleBulkAction('rejected')} disabled={bulkLoading}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl" onClick={() => handleBulkAction('hired')} disabled={bulkLoading}>
                    <Trophy className="w-3.5 h-3.5" /> Hire
                  </Button>
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
            <div className="space-y-2.5">
              {filteredCandidates.map((candidate, index) => {
                const initials = candidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelected = selectedIds.includes(candidate.applicationId || '');
                const isTopPick = aiInsights?.topPick?.name?.toLowerCase().includes(candidate.fullName.split(' ')[0].toLowerCase());

                return (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3), type: 'spring', stiffness: 100, damping: 20 }}
                    layout
                  >
                    <Card className={cn(
                      "group transition-all duration-200 hover:shadow-lg relative rounded-2xl overflow-hidden",
                      isSelected ? "ring-2 ring-primary bg-primary/5 shadow-md" :
                      isTopPick ? "ring-1 ring-success/30 bg-success/[0.02] hover:ring-success/50" :
                      "border-border/50 hover:border-border hover:shadow-md"
                    )}>
                      {/* AI Top Pick indicator */}
                      {isTopPick && (
                        <div className="absolute -top-px left-4 z-10">
                          <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground text-[9px] font-bold gap-1 shadow-md border-0 rounded-b-lg rounded-t-none px-2.5 py-1">
                            <Brain className="w-3 h-3" /> AI Top Pick
                          </Badge>
                        </div>
                      )}

                      <CardContent className={cn("p-4", isTopPick && "pt-6")}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedIds([...selectedIds, candidate.applicationId || '']);
                              else setSelectedIds(selectedIds.filter(id => id !== candidate.applicationId));
                            }}
                            className="mt-1"
                          />

                          {/* Avatar with score ring */}
                          <div className="relative shrink-0">
                            <Avatar
                              className={cn("w-12 h-12 ring-2 cursor-pointer shadow-sm hover:shadow-md transition-shadow", getScoreRingColor(candidate.matchScore))}
                              onClick={() => setSelectedCandidate(candidate)}
                            >
                              <AvatarImage src={candidate.avatarUrl || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div className={cn("absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-card shadow-sm", getScoreColor(candidate.matchScore))}>
                              {candidate.matchScore}%
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className="font-semibold text-foreground text-sm leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                                onClick={() => setSelectedCandidate(candidate)}
                              >
                                {candidate.fullName}
                              </h4>
                              {getStatusBadge(candidate.applicationStatus || 'pending')}
                              <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", getScoreColor(candidate.matchScore))}>
                                <Sparkles className="w-3 h-3" />
                                {candidate.matchScore}% match
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> {candidate.jobTitle}
                              </span>
                              <span className="font-medium">{candidate.experienceYears}y exp</span>
                              {candidate.locationCity && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {candidate.locationCity}
                                </span>
                              )}
                              {candidate.appliedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(candidate.appliedAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>

                            {candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 4).map(skill => (
                                  <Badge key={skill} variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5 max-w-[100px] truncate rounded-lg">
                                    {skill}
                                  </Badge>
                                ))}
                                {candidate.skills.length > 4 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 rounded-lg">+{candidate.skills.length - 4}</Badge>
                                )}
                              </div>
                            )}

                            {candidate.jobTitle_applied && (
                              <p className="text-[10px] text-muted-foreground mt-1.5">
                                Applied for: <span className="font-medium text-foreground">{candidate.jobTitle_applied}</span>
                              </p>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-8 text-[11px] px-3 gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all" onClick={() => navigate(`/candidates/${candidate.candidateId}`)}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] px-3 gap-1.5 rounded-xl transition-all" onClick={() => startConversation(candidate.userId, candidate.jobId || undefined)}>
                              <Mail className="w-3.5 h-3.5" /> Msg
                            </Button>
                            {(candidate.applicationStatus === 'pending' || candidate.applicationStatus === 'reviewed') && (
                              <Button size="sm" variant="ghost" className="h-8 text-[11px] px-3 gap-1.5 text-success hover:bg-success/10 rounded-xl transition-all" onClick={() => updateStatus(candidate.applicationId || '', 'shortlisted')}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                              </Button>
                            )}
                          </div>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 ring-2 ring-primary/20 shadow-sm">
                    <AvatarImage src={selectedCandidate.avatarUrl || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {selectedCandidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-lg">{selectedCandidate.fullName}</span>
                    <p className="text-sm font-normal text-muted-foreground">{selectedCandidate.jobTitle}</p>
                  </div>
                  <span className={cn("ml-auto inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full border", getScoreColor(selectedCandidate.matchScore))}>
                    <Sparkles className="w-4 h-4" />
                    {selectedCandidate.matchScore}% match
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-xl">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedCandidate.experienceYears} years experience</span>
                  </div>
                  {selectedCandidate.locationCity && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-xl">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCandidate.locationCity}{selectedCandidate.locationCountry ? `, ${selectedCandidate.locationCountry}` : ''}</span>
                    </div>
                  )}
                  {selectedCandidate.expectedSalary && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-xl">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCandidate.expectedSalary}</span>
                    </div>
                  )}
                  {selectedCandidate.availabilityStatus && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-xl">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{selectedCandidate.availabilityStatus}</span>
                    </div>
                  )}
                </div>

                {selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs rounded-lg">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.bio && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">About</h4>
                    <p className="text-sm text-muted-foreground">{selectedCandidate.bio}</p>
                  </div>
                )}

                {selectedCandidate.certifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.certifications.map(c => (
                        <Badge key={c} variant="outline" className="text-xs gap-1 rounded-lg"><Award className="w-3 h-3" /> {c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.portfolioUrls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Portfolio</h4>
                    <div className="space-y-1">
                      {selectedCandidate.portfolioUrls.map(url => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Link2 className="w-3.5 h-3.5" /> {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.coverLetter && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Cover Letter</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 border">{selectedCandidate.coverLetter}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button className="flex-1 gap-1.5 rounded-xl" onClick={() => navigate(`/candidates/${selectedCandidate.candidateId}`)}>
                    <Eye className="w-4 h-4" /> Full Profile
                  </Button>
                  <Button variant="outline" className="gap-1.5 rounded-xl" onClick={() => startConversation(selectedCandidate.userId, selectedCandidate.jobId || undefined)}>
                    <Mail className="w-4 h-4" /> Message
                  </Button>
                  {(selectedCandidate.applicationStatus === 'pending' || selectedCandidate.applicationStatus === 'reviewed') && (
                    <>
                      <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'shortlisted'); setSelectedCandidate(null); }}>
                        <CheckCircle2 className="w-4 h-4" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 rounded-xl" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'rejected'); setSelectedCandidate(null); }}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  {selectedCandidate.applicationStatus === 'shortlisted' && (
                    <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'hired'); setSelectedCandidate(null); }}>
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
