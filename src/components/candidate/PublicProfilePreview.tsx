import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Eye, EyeOff, Share2, Link2, Edit3, CheckCircle2, AlertTriangle, 
  Sparkles, TrendingUp, Users, Briefcase, GraduationCap, Award,
  User, FileText, Target, Lightbulb, Copy, ExternalLink, ChevronRight,
  Zap, Star, Building2, MessageCircle, Globe, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import CandidateDetail from '@/pages/CandidateDetail';

interface PublicProfilePreviewProps {
  candidateId: string;
  candidate: any;
  profile: any;
  onNavigate: (section: string) => void;
}

// Profile completeness checks with weights and action paths
const COMPLETENESS_CHECKS = [
  { key: 'avatar', label: 'Profile Photo', icon: Camera, weight: 15, action: 'profile', check: (p: any, c: any) => !!p?.avatar_url },
  { key: 'bio', label: 'About / Summary', icon: User, weight: 12, action: 'profile', check: (p: any, c: any) => c?.bio?.length > 30 },
  { key: 'skills', label: 'Skills (5+)', icon: Zap, weight: 12, action: 'profile', check: (p: any, c: any) => (c?.skills?.length || 0) >= 5 },
  { key: 'experience', label: 'Work Experience', icon: Building2, weight: 12, action: 'profile', check: (p: any, c: any) => (c?.work_experience?.length || 0) > 0 },
  { key: 'education', label: 'Education', icon: GraduationCap, weight: 10, action: 'profile', check: (p: any, c: any) => (c?.education?.length || 0) > 0 },
  { key: 'resume', label: 'Resume Uploaded', icon: FileText, weight: 10, action: 'resume', check: (p: any, c: any) => !!c?.resume_url },
  { key: 'headline', label: 'Professional Headline', icon: Target, weight: 8, action: 'profile', check: (p: any, c: any) => !!c?.headline },
  { key: 'objective', label: 'Career Objective', icon: Lightbulb, weight: 8, action: 'profile', check: (p: any, c: any) => !!c?.career_objective },
  { key: 'salary', label: 'Expected Salary', icon: Briefcase, weight: 6, action: 'profile', check: (p: any, c: any) => !!c?.expected_salary },
  { key: 'certs', label: 'Certifications', icon: Award, weight: 7, action: 'profile', check: (p: any, c: any) => (c?.certifications?.length || 0) > 0 },
];

export const PublicProfilePreview = ({ candidateId, candidate, profile, onNavigate }: PublicProfilePreviewProps) => {
  const [viewMode, setViewMode] = useState<'employer' | 'public'>('employer');
  const [copied, setCopied] = useState(false);

  // Calculate completeness
  const completenessData = useMemo(() => {
    const results = COMPLETENESS_CHECKS.map(check => ({
      ...check,
      passed: check.check(profile, candidate),
    }));
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const earnedWeight = results.filter(r => r.passed).reduce((sum, r) => sum + r.weight, 0);
    const percentage = Math.round((earnedWeight / totalWeight) * 100);
    const missing = results.filter(r => !r.passed);
    const passed = results.filter(r => r.passed);
    return { percentage, missing, passed, results };
  }, [profile, candidate]);

  // Profile visibility stats (simulated - could be real data)
  const visibilityStats = useMemo(() => ({
    views: Math.floor(Math.random() * 50) + 10,
    searches: Math.floor(Math.random() * 30) + 5,
    savedBy: Math.floor(Math.random() * 10) + 1,
  }), []);

  const getPublicUrl = () => {
    const slug = profile?.slug || candidateId;
    return `https://www.hireforjob.com/candidates/${slug}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPublicUrl());
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${profile?.full_name} - ${candidate?.job_title}`,
        text: `Check out my professional profile on HireForJob`,
        url: getPublicUrl(),
      });
    } catch {
      handleCopyLink();
    }
  };

  const getStrengthLabel = (pct: number) => {
    if (pct >= 90) return { label: 'Outstanding', color: 'text-success', bg: 'bg-success/10' };
    if (pct >= 70) return { label: 'Strong', color: 'text-primary', bg: 'bg-primary/10' };
    if (pct >= 50) return { label: 'Good', color: 'text-warning-foreground', bg: 'bg-warning/10' };
    return { label: 'Needs Work', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const strength = getStrengthLabel(completenessData.percentage);

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10 border border-primary/10"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-foreground">Public Profile Preview</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                This is exactly how employers see your profile. Make it stand out!
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 rounded-xl text-xs h-8 sm:h-9">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Link2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy your profile link</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleShare} className="rounded-xl w-8 h-8 sm:w-9 sm:h-9">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share profile</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" onClick={() => onNavigate('profile')} className="rounded-xl w-8 h-8 sm:w-9 sm:h-9">
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit profile</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="text-center p-2 sm:p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-sm sm:text-lg font-bold">{visibilityStats.views}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1 text-success mb-0.5">
                <Users className="w-3.5 h-3.5" />
                <span className="text-sm sm:text-lg font-bold">{visibilityStats.searches}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Searches</p>
            </div>
            <div className="text-center p-2 sm:p-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40">
              <div className="flex items-center justify-center gap-1 text-accent-foreground mb-0.5">
                <Star className="w-3.5 h-3.5" />
                <span className="text-sm sm:text-lg font-bold">{visibilityStats.savedBy}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Saved</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Strength & Completeness */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${strength.bg} flex items-center justify-center shrink-0`}>
                  <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${strength.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm sm:text-base">Profile Strength</h3>
                    <Badge variant="secondary" className={`text-[10px] font-semibold ${strength.color} ${strength.bg}`}>
                      {strength.label}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {completenessData.percentage}% complete • {completenessData.passed.length}/{COMPLETENESS_CHECKS.length} items
                  </p>
                </div>
              </div>
              {completenessData.percentage < 100 && (
                <Button size="sm" className="rounded-xl gap-2 shrink-0 w-full sm:w-auto" onClick={() => onNavigate('profile')}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Boost Profile
                </Button>
              )}
            </div>

            <Progress value={completenessData.percentage} className="h-2.5 mb-4" />

            {/* Missing Items */}
            {completenessData.missing.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Missing for a stronger profile
                </p>
                <div className="flex flex-wrap gap-2">
                  {completenessData.missing.slice(0, 5).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => onNavigate(item.action)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-warning/5 text-warning-foreground rounded-lg border border-warning/15 hover:bg-warning/10 transition-colors"
                    >
                      <item.icon className="w-3 h-3" />
                      {item.label}
                      <ChevronRight className="w-3 h-3 opacity-50" />
                    </button>
                  ))}
                  {completenessData.missing.length > 5 && (
                    <span className="text-xs text-muted-foreground px-2 py-1.5">
                      +{completenessData.missing.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Completed Items */}
            {completenessData.passed.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-success" /> Completed
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {completenessData.passed.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-success/5 text-success rounded-md border border-success/15"
                    >
                      <item.icon className="w-2.5 h-2.5" />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-muted/50 border border-border/40"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {viewMode === 'employer' ? <Briefcase className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Viewing as: {viewMode === 'employer' ? 'Employer' : 'Public Visitor'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {viewMode === 'employer' ? 'Full profile with contact info' : 'Limited info for non-logged users'}
            </p>
          </div>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="shrink-0 w-full sm:w-auto">
          <TabsList className="h-9 bg-background/80 border border-border/50 p-0.5 w-full sm:w-auto">
            <TabsTrigger value="employer" className="text-xs h-8 px-2.5 sm:px-3 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-1 sm:flex-none">
              <Briefcase className="w-3 h-3" /> Employer
            </TabsTrigger>
            <TabsTrigger value="public" className="text-xs h-8 px-2.5 sm:px-3 gap-1 data-[state=active]:bg-muted flex-1 sm:flex-none">
              <Globe className="w-3 h-3" /> Public
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-primary/15 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground mb-1">Pro Tips for Better Visibility</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    Profiles with photos get <span className="font-semibold text-foreground">5× more views</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    Add 5+ skills to appear in more employer searches
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    Upload your resume to enable quick downloads
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preview Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <Separator className="flex-1" />
        <span className="px-3 py-1 rounded-full bg-muted/50 border border-border/40 flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          Live Profile Preview
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Actual Profile Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border-2 border-dashed border-border/50 overflow-hidden overflow-x-hidden"
      >
        <div className="bg-muted/30 px-4 py-2 border-b border-border/40 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background/60 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span className="truncate max-w-[200px] sm:max-w-none">{getPublicUrl()}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => window.open(getPublicUrl(), '_blank')}>
            <ExternalLink className="w-3 h-3" /> Open
          </Button>
        </div>
        
        <div className="bg-background">
          <CandidateDetail id={candidateId} />
        </div>
      </motion.div>
    </div>
  );
};
