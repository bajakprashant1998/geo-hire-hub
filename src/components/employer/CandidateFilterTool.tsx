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
  UserCheck, BarChart3, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useStartConversation } from '@/hooks/useStartConversation';

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
  workType: string;
  resumeKeyword: string;
  pipelineStatus: string;
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
  workType: '',
  resumeKeyword: '',
  pipelineStatus: 'all',
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

  // Fetch AI insights when candidates load
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
    if (filters.certifications) {
      const cert = filters.certifications.toLowerCase();
      result = result.filter(c => c.certifications.some(ct => ct.toLowerCase().includes(cert)));
    }
    if (filters.workType) result = result.filter(c => c.preferredJobTypes.some(t => t.toLowerCase().includes(filters.workType.toLowerCase())));
    if (filters.resumeKeyword) {
      const kw = filters.resumeKeyword.toLowerCase();
      result = result.filter(c => (c.bio || '').toLowerCase().includes(kw) || c.skills.some(s => s.toLowerCase().includes(kw)) || (c.coverLetter || '').toLowerCase().includes(kw));
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
    if (filters.certifications) count++;
    if (filters.workType) count++;
    if (filters.resumeKeyword) count++;
    return count;
  }, [filters]);

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

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Skills</label>
        <div className="relative">
          <Input placeholder="Type a skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSkillFilter(skillInput); }} className="h-9 text-sm" />
          {skillInput && (
            <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {allSkills.filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !filters.skills.includes(s)).slice(0, 8).map(s => (
                <button key={s} onClick={() => addSkillFilter(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
        {filters.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.skills.map(s => (
              <Badge key={s} variant="secondary" className="gap-1 text-[10px] pr-1">
                {s}
                <button onClick={() => removeSkillFilter(s)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Experience: {filters.experienceRange[0]}–{filters.experienceRange[1]} yrs</label>
        <Slider value={filters.experienceRange} onValueChange={(v) => setFilters(prev => ({ ...prev, experienceRange: v as [number, number] }))} min={0} max={30} step={1} className="mt-2" />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Min Match Score: {filters.matchScoreMin}%</label>
        <Slider value={[filters.matchScoreMin]} onValueChange={(v) => setFilters(prev => ({ ...prev, matchScoreMin: v[0] }))} min={0} max={100} step={5} className="mt-2" />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Location</label>
        <Input placeholder="City or country..." value={filters.location} onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))} className="h-9 text-sm" />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block">Work Type</label>
        <Select value={filters.workType} onValueChange={v => setFilters(prev => ({ ...prev, workType: v === 'any' ? '' : v }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
            <SelectItem value="onsite">On-site</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Certifications</label>
              <Input placeholder="e.g. AWS, PMP..." value={filters.certifications} onChange={e => setFilters(prev => ({ ...prev, certifications: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Resume Keyword</label>
              <Input placeholder="Search in bio/cover letter..." value={filters.resumeKeyword} onChange={e => setFilters(prev => ({ ...prev, resumeKeyword: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={filters.hasPortfolio === true} onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPortfolio: checked ? true : null }))} />
              <label className="text-xs font-medium text-foreground">Has portfolio</label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1" /> Clear all filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
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
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.05] overflow-hidden relative">
              <button
                onClick={() => setShowAiPanel(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">AI Hiring Assistant</h3>
                    <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-[10px] gap-1 text-primary"
                    onClick={() => { setAiInsights(null); fetchAIInsights(); }}
                    disabled={aiLoading}
                  >
                    <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Analyzing your candidate pool...
                  </div>
                ) : aiInsights ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Top Pick */}
                    {aiInsights.topPick && (
                      <div className="p-3 rounded-xl bg-success/5 border border-success/15">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Trophy className="w-3.5 h-3.5 text-success" />
                          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Top Pick</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{aiInsights.topPick.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{aiInsights.topPick.reason}</p>
                      </div>
                    )}

                    {/* Pool Summary */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Pool Quality</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.poolSummary}</p>
                    </div>

                    {/* Action Tip */}
                    <div className="p-3 rounded-xl bg-warning/5 border border-warning/15">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-warning" />
                        <span className="text-[10px] font-bold text-warning-foreground uppercase tracking-wider">Tip</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.actionTip}</p>
                    </div>

                    {/* Skill Gap */}
                    {aiInsights.skillGap && (
                      <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Skill Gap</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-3">{aiInsights.skillGap}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No insights available yet. Add candidates to get AI recommendations.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed AI toggle if hidden */}
      {!showAiPanel && (
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-primary/20 text-primary" onClick={() => setShowAiPanel(true)}>
          <Brain className="w-3.5 h-3.5" /> Show AI Insights
        </Button>
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
            <Card className={`border-border/40 bg-gradient-to-br ${stat.gradient} hover:shadow-md transition-shadow`}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
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
        {PIPELINE_STATUSES.map(status => {
          const count = pipelineCounts[status.value] || 0;
          const isActive = filters.pipelineStatus === status.value;
          return (
            <button
              key={status.value}
              onClick={() => setFilters(prev => ({ ...prev, pipelineStatus: status.value }))}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 border ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm border-primary'
                  : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50'
              }`}
            >
              <status.icon className={`w-3.5 h-3.5 ${isActive ? '' : status.color}`} />
              {status.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-4 border-border/40 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">{activeFilterCount}</Badge>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, title, or skills..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 h-10"
              />
            </div>

            <Select value={`${sortField}-${sortDir}`} onValueChange={v => {
              const [f, d] = v.split('-') as [SortField, SortDir];
              setSortField(f); setSortDir(d);
            }}>
              <SelectTrigger className="w-[160px] h-10 text-xs shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                <Button variant="outline" size="icon" className="lg:hidden h-10 w-10 shrink-0 relative">
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] overflow-y-auto">
                <SheetHeader><SheetTitle className="text-sm">Filters</SheetTitle></SheetHeader>
                <div className="mt-4"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <Checkbox
                    checked={selectedIds.length === filteredCandidates.length}
                    onCheckedChange={() => {
                      if (selectedIds.length === filteredCandidates.length) setSelectedIds([]);
                      else setSelectedIds(filteredCandidates.map(c => c.applicationId || '').filter(Boolean));
                    }}
                  />
                  <span className="text-sm font-medium">{selectedIds.length} selected</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleBulkAction('shortlisted')} disabled={bulkLoading}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Shortlist
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive border-destructive/30" onClick={() => handleBulkAction('rejected')} disabled={bulkLoading}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleBulkAction('hired')} disabled={bulkLoading}>
                    <Trophy className="w-3.5 h-3.5" /> Hire
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
            </p>
            {filteredCandidates.length > 1 && selectedIds.length === 0 && (
              <button onClick={() => setSelectedIds(filteredCandidates.map(c => c.applicationId || '').filter(Boolean))} className="text-xs text-primary hover:underline font-medium">
                Select all
              </button>
            )}
          </div>

          {/* Candidate Cards */}
          {filteredCandidates.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
                <p className="font-medium text-foreground mb-1">No candidates match your filters</p>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your search criteria</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredCandidates.map((candidate, index) => {
                const initials = candidate.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isSelected = selectedIds.includes(candidate.applicationId || '');
                const isTopPick = aiInsights?.topPick?.name?.toLowerCase().includes(candidate.fullName.split(' ')[0].toLowerCase());

                return (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  >
                    <Card className={`group transition-all duration-200 hover:shadow-md relative ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : isTopPick ? 'ring-1 ring-success/30 bg-success/[0.02]' : 'border-border/50 hover:border-border'
                    }`}>
                      {/* AI Top Pick indicator */}
                      {isTopPick && (
                        <div className="absolute -top-2 left-4 z-10">
                          <Badge className="bg-gradient-to-r from-success to-success/80 text-success-foreground text-[9px] font-bold gap-1 shadow-sm border-0">
                            <Brain className="w-3 h-3" /> AI Top Pick
                          </Badge>
                        </div>
                      )}

                      <CardContent className={`p-4 ${isTopPick ? 'pt-5' : ''}`}>
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
                              className={`w-12 h-12 ring-2 ${getScoreRingColor(candidate.matchScore)} cursor-pointer shadow-sm`}
                              onClick={() => setSelectedCandidate(candidate)}
                            >
                              <AvatarImage src={candidate.avatarUrl || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            {/* Score badge on avatar */}
                            <div className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-card ${getScoreColor(candidate.matchScore)}`}>
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

                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(candidate.matchScore)}`}>
                                <Sparkles className="w-3 h-3" />
                                {candidate.matchScore}% match
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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
                                {candidate.skills.slice(0, 5).map(skill => (
                                  <Badge key={skill} variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5 max-w-[100px] truncate">
                                    {skill}
                                  </Badge>
                                ))}
                                {candidate.skills.length > 5 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">+{candidate.skills.length - 5}</Badge>
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
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 gap-1 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" onClick={() => navigate(`/candidates/${candidate.candidateId}`)}>
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 gap-1" onClick={() => startConversation(candidate.userId, candidate.jobId || undefined)}>
                              <Mail className="w-3 h-3" /> Msg
                            </Button>
                            {(candidate.applicationStatus === 'pending' || candidate.applicationStatus === 'reviewed') && (
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2.5 gap-1 text-success hover:bg-success/10" onClick={() => updateStatus(candidate.applicationId || '', 'shortlisted')}>
                                <CheckCircle2 className="w-3 h-3" /> Shortlist
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                  <span className={`ml-auto inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full border ${getScoreColor(selectedCandidate.matchScore)}`}>
                    <Sparkles className="w-4 h-4" />
                    {selectedCandidate.matchScore}% match
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/50 rounded-lg">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedCandidate.experienceYears} years experience</span>
                  </div>
                  {selectedCandidate.locationCity && (
                    <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/50 rounded-lg">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCandidate.locationCity}{selectedCandidate.locationCountry ? `, ${selectedCandidate.locationCountry}` : ''}</span>
                    </div>
                  )}
                  {selectedCandidate.expectedSalary && (
                    <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCandidate.expectedSalary}</span>
                    </div>
                  )}
                  {selectedCandidate.availabilityStatus && (
                    <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/50 rounded-lg">
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
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
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
                        <Badge key={c} variant="outline" className="text-xs gap-1"><Award className="w-3 h-3" /> {c}</Badge>
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
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border">{selectedCandidate.coverLetter}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button className="flex-1 gap-1.5" onClick={() => navigate(`/candidates/${selectedCandidate.candidateId}`)}>
                    <Eye className="w-4 h-4" /> Full Profile
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={() => startConversation(selectedCandidate.userId, selectedCandidate.jobId || undefined)}>
                    <Mail className="w-4 h-4" /> Message
                  </Button>
                  {(selectedCandidate.applicationStatus === 'pending' || selectedCandidate.applicationStatus === 'reviewed') && (
                    <>
                      <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'shortlisted'); setSelectedCandidate(null); }}>
                        <CheckCircle2 className="w-4 h-4" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'rejected'); setSelectedCandidate(null); }}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  {selectedCandidate.applicationStatus === 'shortlisted' && (
                    <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => { updateStatus(selectedCandidate.applicationId || '', 'hired'); setSelectedCandidate(null); }}>
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
