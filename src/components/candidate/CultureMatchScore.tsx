import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Heart, Building2, Users, Coffee, Trophy, Clock, Sparkles, Loader2, 
  ChevronRight, Briefcase, Zap, Target, TrendingUp, Star, Share2,
  CheckCircle2, Home, Palette, Shield, Rocket, Medal, ExternalLink,
  BarChart3, Info, RefreshCw, MapPin, Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CulturePreference {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
}

interface EmployerMatch {
  id: string;
  company_name: string;
  matchScore: number;
  culture_description: string | null;
  work_culture_type: string | null;
  work_life_balance_rating: number | null;
  benefits: string[] | null;
  company_values: string[] | null;
  location_city: string | null;
  industry: string | null;
  slug: string | null;
}

const DEFAULT_PREFERENCES: CulturePreference[] = [
  { 
    key: 'worklife', 
    label: 'Work-Life Balance', 
    icon: Home, 
    description: 'How important is flexibility and personal time?',
    leftLabel: 'Flexible hours',
    rightLabel: 'Results-focused',
    value: 70 
  },
  { 
    key: 'growth', 
    label: 'Career Growth', 
    icon: TrendingUp, 
    description: 'Fast-track promotion vs job stability',
    leftLabel: 'Stability',
    rightLabel: 'Fast growth',
    value: 60 
  },
  { 
    key: 'teamwork', 
    label: 'Work Style', 
    icon: Users, 
    description: 'How you prefer to collaborate',
    leftLabel: 'Independent',
    rightLabel: 'Team-oriented',
    value: 50 
  },
  { 
    key: 'innovation', 
    label: 'Company Type', 
    icon: Rocket, 
    description: 'Startup energy vs established process',
    leftLabel: 'Established',
    rightLabel: 'Innovative',
    value: 50 
  },
  { 
    key: 'perks', 
    label: 'Compensation Focus', 
    icon: Coffee, 
    description: 'What matters more to you',
    leftLabel: 'Higher salary',
    rightLabel: 'Better perks',
    value: 60 
  },
  { 
    key: 'remote', 
    label: 'Work Location', 
    icon: MapPin, 
    description: 'Where you want to work',
    leftLabel: 'On-site',
    rightLabel: 'Remote-first',
    value: 65 
  },
];

// Quick preset profiles
const PRESETS = [
  { name: 'Startup Lover', icon: Rocket, values: { worklife: 40, growth: 90, teamwork: 70, innovation: 95, perks: 50, remote: 75 } },
  { name: 'Work-Life Champion', icon: Home, values: { worklife: 95, growth: 40, teamwork: 60, innovation: 50, perks: 70, remote: 85 } },
  { name: 'Career Climber', icon: TrendingUp, values: { worklife: 50, growth: 95, teamwork: 75, innovation: 70, perks: 60, remote: 50 } },
  { name: 'Team Player', icon: Users, values: { worklife: 70, growth: 60, teamwork: 95, innovation: 60, perks: 65, remote: 40 } },
];

const LOADING_STAGES = [
  { text: 'Analyzing your preferences...', icon: Sparkles },
  { text: 'Scanning company cultures...', icon: Building2 },
  { text: 'Calculating compatibility...', icon: Target },
  { text: 'Ranking best matches...', icon: Medal },
];

export const CultureMatchScore = ({ candidateId }: { candidateId: string }) => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<CulturePreference[]>(DEFAULT_PREFERENCES);
  const [matches, setMatches] = useState<EmployerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('preferences');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const updatePreference = (key: string, value: number) => {
    setPreferences(prev => prev.map(p => p.key === key ? { ...p, value } : p));
    setShowResults(false);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setPreferences(prev => prev.map(p => ({
      ...p,
      value: preset.values[p.key as keyof typeof preset.values] || p.value
    })));
    setShowResults(false);
    toast.success(`Applied "${preset.name}" profile`);
  };

  const calculateMatches = async () => {
    setLoading(true);
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage(prev => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 800);

    try {
      const { data: employers, error } = await supabase
        .from('employers')
        .select('id, company_name, culture_description, work_culture_type, work_life_balance_rating, benefits, company_values, location_city, industry, slug')
        .eq('verification_status', 'approved')
        .not('culture_description', 'is', null)
        .limit(50);

      if (error) throw error;

      const scored = (employers || []).map(emp => {
        let score = 0;
        let factors = 0;

        const wlPref = preferences.find(p => p.key === 'worklife')!.value;
        if (emp.work_life_balance_rating) {
          const wlScore = (emp.work_life_balance_rating / 5) * 100;
          score += Math.max(0, 100 - Math.abs(wlPref - wlScore));
          factors++;
        }

        const perkPref = preferences.find(p => p.key === 'perks')!.value;
        if (emp.benefits && emp.benefits.length > 0) {
          const benefitScore = Math.min(emp.benefits.length * 15, 100);
          score += Math.max(0, 100 - Math.abs(perkPref - benefitScore) * 0.5);
          factors++;
        }

        const innovPref = preferences.find(p => p.key === 'innovation')!.value;
        if (emp.work_culture_type) {
          const cultureScore = emp.work_culture_type === 'startup' ? 90 : emp.work_culture_type === 'innovative' ? 80 : 40;
          score += Math.max(0, 100 - Math.abs(innovPref - cultureScore) * 0.7);
          factors++;
        }

        if (emp.company_values && emp.company_values.length > 0) {
          score += Math.min(emp.company_values.length * 12, 100);
          factors++;
        }

        const growthPref = preferences.find(p => p.key === 'growth')!.value;
        if (emp.culture_description) {
          const hasGrowthKeywords = /growth|promotion|career|advancement|learning/i.test(emp.culture_description);
          score += hasGrowthKeywords ? Math.min(growthPref, 85) : 30;
          factors++;
        }

        const matchScore = factors > 0 ? Math.round(score / factors) : 0;

        return {
          id: emp.id,
          company_name: emp.company_name,
          matchScore,
          culture_description: emp.culture_description,
          work_culture_type: emp.work_culture_type,
          work_life_balance_rating: emp.work_life_balance_rating,
          benefits: emp.benefits,
          company_values: emp.company_values,
          location_city: emp.location_city,
          industry: emp.industry,
          slug: emp.slug,
        };
      }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 12);

      setMatches(scored);
      setShowResults(true);
      setActiveTab('matches');
      toast.success(`Found ${scored.length} matching companies!`);
    } catch (err) {
      console.error('Error calculating matches:', err);
      toast.error('Failed to calculate matches');
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-muted/50 border-border';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Great';
    if (score >= 55) return 'Good';
    return 'Fair';
  };

  const shareResults = () => {
    if (matches.length === 0) return;
    const topMatches = matches.slice(0, 3).map((m, i) => `${i + 1}. ${m.company_name} (${m.matchScore}%)`).join('\n');
    const text = `🎯 My Top Culture Matches:\n\n${topMatches}\n\nFind your perfect company fit at HireForJob!`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const averagePreference = Math.round(preferences.reduce((sum, p) => sum + p.value, 0) / preferences.length);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-purple-500/10 border border-rose-500/20 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/20">
                  <Heart className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Culture Match Finder</h2>
                  <p className="text-sm text-muted-foreground">Discover companies that align with your work style</p>
                </div>
              </div>
              
              {showResults && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={shareResults} className="gap-1.5">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowResults(false); setActiveTab('preferences'); }} className="gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="bg-background/50 gap-1.5 py-1">
                <BarChart3 className="w-3 h-3" />
                Profile Score: {averagePreference}%
              </Badge>
              {showResults && (
                <Badge variant="outline" className="bg-background/50 gap-1.5 py-1 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {matches.length} matches found
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-11">
            <TabsTrigger value="preferences" className="gap-1.5">
              <Palette className="w-4 h-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1.5" disabled={!showResults}>
              <Building2 className="w-4 h-4" />
              Matches {showResults && `(${matches.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-4 space-y-4">
            {/* Quick Presets */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Quick Profiles — Start with a template
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <motion.button
                      key={preset.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => applyPreset(preset)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all text-center"
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <preset.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium">{preset.name}</span>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preference Sliders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Fine-Tune Your Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {preferences.map((pref, i) => (
                  <motion.div
                    key={pref.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <pref.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{pref.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground ml-1.5 inline cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{pref.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Badge variant="secondary" className={cn("text-xs", getScoreColor(pref.value))}>
                        {pref.value}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <Slider
                        value={[pref.value]}
                        onValueChange={([v]) => updatePreference(pref.key, v)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>{pref.leftLabel}</span>
                        <span>{pref.rightLabel}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Calculate Button */}
            <Button 
              onClick={calculateMatches} 
              disabled={loading} 
              className="w-full h-12 rounded-xl gap-2 text-base"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Target className="w-5 h-5" />
              )}
              Find My Culture Matches
            </Button>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="mt-4 space-y-4">
            <AnimatePresence mode="wait">
              {matches.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-4">
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Matches Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set your preferences and click "Find My Culture Matches" to discover companies that align with your work style.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {/* Top Match Highlight */}
                  {matches[0] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-b border-emerald-500/20 p-4">
                          <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <Trophy className="w-5 h-5" />
                            <span className="text-sm font-semibold">Best Match</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{matches[0].company_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                {matches[0].industry && <span>{matches[0].industry}</span>}
                                {matches[0].location_city && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {matches[0].location_city}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold text-emerald-600">{matches[0].matchScore}%</div>
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                                {getScoreLabel(matches[0].matchScore)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          {matches[0].culture_description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {matches[0].culture_description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {matches[0].company_values?.slice(0, 4).map(v => (
                              <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                            ))}
                            {matches[0].work_culture_type && (
                              <Badge variant="outline" className="text-xs capitalize">{matches[0].work_culture_type}</Badge>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full gap-2"
                            onClick={() => navigate(`/employer/${matches[0].slug || matches[0].id}`)}
                          >
                            View Company Profile
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Other Matches */}
                  <div className="grid gap-3">
                    {matches.slice(1).map((emp, i) => (
                      <motion.div
                        key={emp.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card 
                          className={cn(
                            "transition-all cursor-pointer hover:shadow-md",
                            expandedMatch === emp.id && "ring-2 ring-primary"
                          )}
                          onClick={() => setExpandedMatch(expandedMatch === emp.id ? null : emp.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                                  getScoreBg(emp.matchScore)
                                )}>
                                  <span className={cn("text-sm font-bold", getScoreColor(emp.matchScore))}>
                                    #{i + 2}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{emp.company_name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {emp.work_culture_type && <span className="capitalize">{emp.work_culture_type}</span>}
                                    {emp.location_city && (
                                      <>
                                        <span>•</span>
                                        <span>{emp.location_city}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={cn("text-lg font-bold", getScoreColor(emp.matchScore))}>
                                    {emp.matchScore}%
                                  </span>
                                  <p className="text-[10px] text-muted-foreground">{getScoreLabel(emp.matchScore)}</p>
                                </div>
                                <ChevronRight className={cn(
                                  "w-5 h-5 text-muted-foreground transition-transform",
                                  expandedMatch === emp.id && "rotate-90"
                                )} />
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedMatch === emp.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-4 mt-4 border-t border-border/50">
                                    {emp.culture_description && (
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {emp.culture_description}
                                      </p>
                                    )}
                                    
                                    {/* Match Indicators */}
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                      {emp.work_life_balance_rating && (
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                          <Home className="w-4 h-4 text-primary" />
                                          <div>
                                            <p className="text-[10px] text-muted-foreground">Work-Life</p>
                                            <p className="text-xs font-semibold">{emp.work_life_balance_rating}/5</p>
                                          </div>
                                        </div>
                                      )}
                                      {emp.benefits && emp.benefits.length > 0 && (
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                          <Award className="w-4 h-4 text-primary" />
                                          <div>
                                            <p className="text-[10px] text-muted-foreground">Benefits</p>
                                            <p className="text-xs font-semibold">{emp.benefits.length} perks</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {emp.company_values && emp.company_values.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {emp.company_values.slice(0, 5).map(v => (
                                          <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                                        ))}
                                      </div>
                                    )}

                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="w-full gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/employer/${emp.slug || emp.id}`);
                                      }}
                                    >
                                      View Profile
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <Card className="w-full max-w-sm mx-4 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="p-4 rounded-full bg-primary/10 mb-4"
                    >
                      <Heart className="w-8 h-8 text-primary" />
                    </motion.div>
                    
                    <h3 className="font-semibold text-foreground mb-4">Finding Your Perfect Match</h3>
                    
                    <div className="space-y-2.5 w-full">
                      {LOADING_STAGES.map((stage, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: i <= loadingStage ? 1 : 0.4 }}
                          className="flex items-center gap-3"
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            i <= loadingStage ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {i < loadingStage ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <stage.icon className="w-4 h-4" />
                            )}
                          </div>
                          <span className={cn(
                            "text-sm transition-colors",
                            i <= loadingStage ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {stage.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <Progress value={(loadingStage + 1) * 25} className="w-full mt-4 h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};
