import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Compass, ArrowRight, Loader2, Sparkles, Target, Clock, TrendingUp, GraduationCap,
  Rocket, Briefcase, Code2, Users, LineChart, Crown, Share2, Download, ChevronRight,
  BookOpen, Award, Zap, CheckCircle2, Play, MapPin, DollarSign, Star, Lightbulb,
  Calendar, Route, Flag, Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CareerStep {
  title: string;
  timeframe: string;
  skills: string[];
  description: string;
  salaryRange?: string;
}

interface CareerPathResult {
  currentRole: string;
  targetRole: string;
  estimatedYears: number;
  steps: CareerStep[];
  tips: string[];
}

// Popular career paths for quick selection
const POPULAR_PATHS = [
  { title: 'Engineering Manager', icon: Users, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { title: 'Senior Software Engineer', icon: Code2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { title: 'Technical Lead', icon: Rocket, color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { title: 'Product Manager', icon: Briefcase, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { title: 'CTO', icon: Crown, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { title: 'Data Science Lead', icon: LineChart, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
];

// Loading stages for better UX
const LOADING_STAGES = [
  { text: 'Analyzing your current skills...', icon: Zap },
  { text: 'Mapping career trajectories...', icon: Route },
  { text: 'Calculating growth milestones...', icon: Flag },
  { text: 'Building your roadmap...', icon: MapPin },
];

export const CareerPathVisualizer = ({ currentJobTitle, currentSkills }: { currentJobTitle: string; currentSkills: string[] }) => {
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<CareerPathResult | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('roadmap');

  const generatePath = async (role?: string) => {
    const targetRoleValue = role || targetRole.trim();
    if (!targetRoleValue) {
      toast.error('Enter your target role');
      return;
    }
    if (role) setTargetRole(role);
    setLoading(true);
    setLoadingStage(0);
    setResult(null);

    // Animate through loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const { data, error } = await supabase.functions.invoke('ai-career-path', {
        body: { currentRole: currentJobTitle, targetRole: targetRoleValue, currentSkills }
      });
      if (error) throw error;
      setResult(data);
      setActiveStep(0);
      toast.success('Career roadmap generated!');
    } catch (err) {
      console.error('Career path error:', err);
      toast.error('Failed to generate career path');
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
    }
  };

  const shareResults = () => {
    if (!result) return;
    const text = `🚀 My Career Path: ${result.currentRole} → ${result.targetRole}\n\n` +
      `⏱️ Estimated: ${result.estimatedYears} years\n\n` +
      `📍 Milestones:\n${result.steps.map((s, i) => `${i + 1}. ${s.title} (${s.timeframe})`).join('\n')}\n\n` +
      `Generated with HireForJob Career Path Visualizer`;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadPDF = async () => {
    toast.info('Preparing PDF export...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      pdf.setFontSize(20);
      pdf.text('Career Roadmap', 20, 20);
      
      pdf.setFontSize(14);
      pdf.text(`${result?.currentRole} → ${result?.targetRole}`, 20, 35);
      pdf.setFontSize(11);
      pdf.text(`Estimated Journey: ${result?.estimatedYears} years`, 20, 45);
      
      let y = 60;
      result?.steps.forEach((step, i) => {
        pdf.setFontSize(12);
        pdf.text(`${i + 1}. ${step.title}`, 20, y);
        pdf.setFontSize(10);
        pdf.text(`Timeframe: ${step.timeframe}`, 25, y + 7);
        pdf.text(`Focus: ${step.description.substring(0, 80)}...`, 25, y + 14);
        if (step.skills.length) {
          pdf.text(`Skills: ${step.skills.slice(0, 4).join(', ')}`, 25, y + 21);
        }
        y += 35;
      });

      pdf.save('career-roadmap.pdf');
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (!result || activeStep === null) return 0;
    return ((activeStep + 1) / result.steps.length) * 100;
  }, [result, activeStep]);

  // Get step status styling
  const getStepStatus = (index: number) => {
    if (activeStep === null) return 'upcoming';
    if (index < activeStep) return 'completed';
    if (index === activeStep) return 'current';
    return 'upcoming';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                <Compass className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Career Path Visualizer</h2>
                <p className="text-sm text-muted-foreground">AI-powered roadmap to your dream role</p>
              </div>
            </div>

            {/* Current Position Display */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-background/50 gap-1.5 py-1">
                <MapPin className="w-3 h-3" />
                Current: {currentJobTitle || 'Not specified'}
              </Badge>
              {currentSkills?.length > 0 && (
                <Badge variant="secondary" className="bg-background/50 gap-1.5 py-1">
                  <Zap className="w-3 h-3" />
                  {currentSkills.length} skills
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-5">
            {/* Popular Paths Grid */}
            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Popular Career Paths
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POPULAR_PATHS.map((path) => (
                  <motion.button
                    key={path.title}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => generatePath(path.title)}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                      "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                      path.color
                    )}
                  >
                    <path.icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium truncate">{path.title}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Custom Role Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Or enter your dream role..."
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generatePath()}
                  className="pl-10 rounded-xl h-11"
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={() => generatePath()} 
                disabled={loading || !targetRole.trim()} 
                className="rounded-xl h-11 gap-2 px-6"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Roadmap
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="p-4 rounded-full bg-primary/10 mb-4"
                    >
                      <Compass className="w-8 h-8 text-primary" />
                    </motion.div>
                    
                    <div className="space-y-3 w-full max-w-xs">
                      {LOADING_STAGES.map((stage, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: i <= loadingStage ? 1 : 0.3 }}
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

                    <Progress value={(loadingStage + 1) * 25} className="w-full max-w-xs mt-4 h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Journey Summary Card */}
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-primary via-primary/90 to-accent p-5 text-primary-foreground">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                        <Route className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm opacity-80">Your Career Journey</p>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          {result.currentRole}
                          <ArrowRight className="w-5 h-5" />
                          {result.targetRole}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-white/30 gap-1.5 py-1.5 px-3">
                        <Calendar className="w-4 h-4" />
                        ~{result.estimatedYears} years
                      </Badge>
                      <Badge className="bg-white/20 text-white border-white/30 gap-1.5 py-1.5 px-3">
                        <Flag className="w-4 h-4" />
                        {result.steps.length} milestones
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs mb-2 opacity-80">
                      <span>Journey Progress</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                    
                    {/* Step Dots */}
                    <div className="flex justify-between mt-3">
                      {result.steps.map((step, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              onClick={() => setActiveStep(i)}
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                getStepStatus(i) === 'completed' && "bg-white text-primary",
                                getStepStatus(i) === 'current' && "bg-white text-primary ring-4 ring-white/30",
                                getStepStatus(i) === 'upcoming' && "bg-white/20 text-white hover:bg-white/30"
                              )}
                            >
                              {getStepStatus(i) === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : i === result.steps.length - 1 ? (
                                <Trophy className="w-4 h-4" />
                              ) : (
                                i + 1
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{step.title}</p>
                            <p className="text-xs opacity-70">{step.timeframe}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="w-4 h-4" />
                    <span>Click milestones above to explore each step</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={shareResults} className="gap-1.5">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadPDF} className="gap-1.5">
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Tabbed Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3 h-11">
                  <TabsTrigger value="roadmap" className="gap-1.5">
                    <Route className="w-4 h-4" />
                    Roadmap
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    Skills
                  </TabsTrigger>
                  <TabsTrigger value="tips" className="gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    Pro Tips
                  </TabsTrigger>
                </TabsList>

                {/* Roadmap Tab */}
                <TabsContent value="roadmap" className="mt-4">
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />

                    <div className="space-y-4">
                      {result.steps.map((step, i) => {
                        const status = getStepStatus(i);
                        const isActive = activeStep === i;
                        
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative pl-14"
                          >
                            {/* Node */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => setActiveStep(i)}
                              className={cn(
                                "absolute left-2 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center z-10 transition-all",
                                status === 'completed' && "bg-primary border-primary text-primary-foreground",
                                status === 'current' && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                                status === 'upcoming' && "bg-card border-border hover:border-primary/50"
                              )}
                            >
                              {status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : i === result.steps.length - 1 ? (
                                <Trophy className="w-3.5 h-3.5" />
                              ) : (
                                <span className="text-[10px] font-bold">{i + 1}</span>
                              )}
                            </motion.button>

                            <Card 
                              className={cn(
                                "transition-all cursor-pointer",
                                isActive && "ring-2 ring-primary shadow-lg",
                                i === result.steps.length - 1 && "border-emerald-500/30 bg-emerald-500/5"
                              )}
                              onClick={() => setActiveStep(i)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {i === result.steps.length - 1 && (
                                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                                          Goal
                                        </Badge>
                                      )}
                                      <h4 className="font-semibold text-foreground">{step.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {step.timeframe}
                                      </span>
                                      {step.salaryRange && (
                                        <span className="flex items-center gap-1">
                                          <DollarSign className="w-3 h-3" />
                                          {step.salaryRange}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ChevronRight className={cn(
                                    "w-5 h-5 text-muted-foreground transition-transform",
                                    isActive && "rotate-90 text-primary"
                                  )} />
                                </div>

                                <AnimatePresence>
                                  {isActive && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                        {step.description}
                                      </p>
                                      
                                      {step.skills.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            Key Skills to Develop
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {step.skills.map(skill => (
                                              <Badge 
                                                key={skill} 
                                                variant="secondary" 
                                                className="text-[11px] rounded-lg py-1"
                                              >
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="mt-4">
                  <Card>
                    <CardContent className="p-5">
                      <div className="space-y-6">
                        {result.steps.map((step, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                i === result.steps.length - 1 
                                  ? "bg-emerald-500/15 text-emerald-600" 
                                  : "bg-primary/15 text-primary"
                              )}>
                                {i + 1}
                              </div>
                              <span className="font-medium text-sm">{step.title}</span>
                              <Badge variant="outline" className="ml-auto text-[10px]">
                                {step.timeframe}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-8">
                              {step.skills.length > 0 ? (
                                step.skills.map(skill => (
                                  <motion.div
                                    key={skill}
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-sm"
                                  >
                                    <Award className="w-3.5 h-3.5 text-primary" />
                                    {skill}
                                  </motion.div>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">General progression</span>
                              )}
                            </div>
                            {i < result.steps.length - 1 && (
                              <div className="border-b border-border/50 mt-4" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tips Tab */}
                <TabsContent value="tips" className="mt-4">
                  <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
                        <GraduationCap className="w-5 h-5" />
                        Expert Career Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.tips.map((tip, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/30"
                          >
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Quick Action */}
                      <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Play className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Ready to start?</p>
                            <p className="text-xs text-muted-foreground">Focus on the first milestone to begin your journey</p>
                          </div>
                          <Button size="sm" onClick={() => { setActiveTab('roadmap'); setActiveStep(0); }}>
                            View First Step
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-4">
              <Route className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Map Your Career Journey</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Select a popular career path above or enter your dream role to get an AI-generated roadmap with actionable milestones.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Skill recommendations</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Timeline estimates</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Expert tips</span>
            </div>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};
