import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AILocationAutocomplete } from './AILocationAutocomplete';
import {
  Banknote, TrendingUp, MapPin, Briefcase, Sparkles, Loader2, Download,
  BarChart3, Lightbulb, Globe, AlertTriangle, ChevronRight, Trophy,
  Target, Zap, Clock, ArrowUpRight, Building2, GraduationCap, CheckCircle2,
  Share2, BookmarkPlus, RefreshCw, Info, Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SalaryData {
  currencyCode: string;
  currencySymbol: string;
  estimatedRange: { min: number; max: number };
  experienceBreakdown: { level: string; min: number; max: number }[];
  marketDemand: string;
  marketDemandScore: number;
  topPayingCities: { city: string; country: string; avgSalary: number }[];
  growthTips: string[];
  industryTrend: string;
  remoteImpact: string;
}

interface LocationData {
  city: string;
  state: string;
  country: string;
}

// Popular job roles for quick selection
const POPULAR_ROLES = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'Marketing Manager',
  'Sales Executive',
];

// --- Sub-components ---

const QuickRoleButton = ({ role, isSelected, onClick }: {
  role: string;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
      isSelected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
    )}
  >
    {role}
  </button>
);

const StatHighlight = ({ icon: Icon, label, value, subtext, accent }: {
  icon: typeof Banknote;
  label: string;
  value: string;
  subtext?: string;
  accent: string;
}) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", accent)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
    </div>
  </div>
);

const LoadingState = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="py-16"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-xl border-2 border-transparent border-t-primary"
          />
          <Banknote className="w-8 h-8 text-primary" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Analyzing salary data...</p>
        <p className="text-xs text-muted-foreground">Comparing market rates across regions</p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {['Gathering data', 'Analyzing trends', 'Generating insights'].map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
);

const EmptyState = () => (
  <div className="text-center py-16 space-y-4">
    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
      <BarChart3 className="w-10 h-10 text-primary/60" />
    </div>
    <div>
      <p className="text-base font-semibold text-foreground">Get Your Salary Insights</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Enter your job role and location above to discover personalized salary recommendations based on market data.
      </p>
    </div>
  </div>
);

// --- Main Component ---

export const SalaryInsights = () => {
  const [location, setLocation] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [jobCategory, setJobCategory] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SalaryData | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleLocationChange = (val: string, structured?: LocationData) => {
    setLocation(val);
    if (structured) setLocationData(structured);
  };

  const fetchInsights = async () => {
    if (!location || !jobCategory) {
      toast.error('Please enter location and job role');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const loc = locationData || { city: location, state: '', country: '' };
      const { data, error } = await supabase.functions.invoke('salary-insights', {
        body: {
          location: loc,
          jobCategory,
          yearsOfExperience: experience ? parseInt(experience) : undefined,
          skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get salary insights');
    }
    setLoading(false);
  };

  const formatSalary = (amount: number, symbol: string) => {
    if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const demandConfig = (demand: string) => {
    switch (demand?.toLowerCase()) {
      case 'high': return { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: TrendingUp };
      case 'medium': return { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Target };
      default: return { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle };
    }
  };

  const downloadPDF = async () => {
    if (!result || !resultRef.current) return;

    toast.info('Generating PDF report...');

    try {
      const element = resultRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pageW - margin * 2;
      const imgRatio = canvas.height / canvas.width;
      const imgH = contentW * imgRatio;

      if (imgH <= pageH - margin * 2) {
        doc.addImage(imgData, 'PNG', margin, margin, contentW, imgH);
      } else {
        const pageContentH = pageH - margin * 2;
        const scaledPageH = (pageContentH / contentW) * canvas.width;
        let srcY = 0;
        let page = 0;

        while (srcY < canvas.height) {
          if (page > 0) doc.addPage();
          
          const sliceH = Math.min(scaledPageH, canvas.height - srcY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          }
          
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceImgH = (sliceH / canvas.width) * contentW;
          doc.addImage(sliceData, 'PNG', margin, margin, contentW, sliceImgH);
          
          srcY += scaledPageH;
          page++;
        }
      }

      doc.save(`salary-report-${jobCategory.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const shareResults = () => {
    if (!result) return;
    const text = `💰 Salary Insights for ${jobCategory} in ${location}\n\nRange: ${formatSalary(result.estimatedRange.min, result.currencySymbol)} - ${formatSalary(result.estimatedRange.max, result.currencySymbol)}\nMarket Demand: ${result.marketDemand}\n\nGenerated with AI`;
    navigator.clipboard.writeText(text);
    toast.success('Results copied to clipboard!');
  };

  const resetForm = () => {
    setLocation('');
    setLocationData(null);
    setJobCategory('');
    setExperience('');
    setSkills('');
    setResult(null);
  };

  const midSalary = result ? Math.round((result.estimatedRange.min + result.estimatedRange.max) / 2) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Salary Insights
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Powered
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Discover your market value with personalized salary recommendations
            </p>
          </div>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={shareResults} className="h-8 rounded-xl gap-1.5 text-xs">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm} className="h-8 rounded-xl gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              New Search
            </Button>
          </div>
        )}
      </div>

      {/* Form Card */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-5">
          {/* Quick Role Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Quick select a role</Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ROLES.map(role => (
                <QuickRoleButton
                  key={role}
                  role={role}
                  isSelected={jobCategory === role}
                  onClick={() => setJobCategory(role)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Main Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Location <span className="text-destructive">*</span>
              </Label>
              <AILocationAutocomplete
                value={location}
                onChange={handleLocationChange}
                placeholder="e.g. Mumbai, Maharashtra, India"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                Job Role <span className="text-destructive">*</span>
              </Label>
              <Input
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                Years of Experience
              </Label>
              <Input
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 3"
                min="0"
                max="50"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                Key Skills
              </Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Node.js, Python (comma separated)"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={fetchInsights}
            disabled={loading || !location || !jobCategory}
            className="w-full sm:w-auto gap-2 rounded-xl h-11 px-8"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Get Salary Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {loading && <LoadingState />}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && !result && <EmptyState />}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Hero Salary Card */}
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-0 text-[10px]">
                        <Trophy className="w-3 h-3 mr-1" />
                        Your Market Value
                      </Badge>
                    </div>
                    <div>
                      <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                        {formatSalary(midSalary, result.currencySymbol)}
                      </p>
                      <p className="text-white/70 text-sm mt-1">
                        Range: {formatSalary(result.estimatedRange.min, result.currencySymbol)} – {formatSalary(result.estimatedRange.max, result.currencySymbol)} {result.currencyCode}/year
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Badge className="bg-white/15 text-white border-0 text-xs gap-1.5">
                        <Briefcase className="w-3 h-3" />
                        {jobCategory}
                      </Badge>
                      <Badge className="bg-white/15 text-white border-0 text-xs gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={downloadPDF}
                      className="gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border-0"
                    >
                      <Download className="w-4 h-4" />
                      PDF Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatHighlight
                icon={TrendingUp}
                label="Market Demand"
                value={result.marketDemand}
                subtext={`${result.marketDemandScore}% score`}
                accent={cn(demandConfig(result.marketDemand).bg, demandConfig(result.marketDemand).color)}
              />
              <StatHighlight
                icon={Globe}
                label="Top City"
                value={result.topPayingCities[0]?.city || 'N/A'}
                subtext={result.topPayingCities[0] ? formatSalary(result.topPayingCities[0].avgSalary, result.currencySymbol) : undefined}
                accent="bg-blue-500/10 text-blue-600"
              />
              <StatHighlight
                icon={BarChart3}
                label="Industry Trend"
                value={result.industryTrend}
                accent="bg-violet-500/10 text-violet-600"
              />
              <StatHighlight
                icon={Lightbulb}
                label="Growth Tips"
                value={`${result.growthTips.length} insights`}
                accent="bg-amber-500/10 text-amber-600"
              />
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="breakdown" className="space-y-4">
              <TabsList className="w-full grid grid-cols-3 h-10">
                <TabsTrigger value="breakdown" className="text-xs gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Experience Levels
                </TabsTrigger>
                <TabsTrigger value="cities" className="text-xs gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Top Cities
                </TabsTrigger>
                <TabsTrigger value="tips" className="text-xs gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Growth Tips
                </TabsTrigger>
              </TabsList>

              {/* Experience Breakdown */}
              <TabsContent value="breakdown" className="mt-0">
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Salary by Experience Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.experienceBreakdown.map((row, i) => {
                      const maxSalary = Math.max(...result.experienceBreakdown.map(r => r.max));
                      const pct = (row.max / maxSalary) * 100;
                      const isCurrentLevel = experience && row.level.toLowerCase().includes(
                        parseInt(experience) <= 2 ? 'entry' :
                        parseInt(experience) <= 5 ? 'mid' :
                        parseInt(experience) <= 8 ? 'senior' : 'lead'
                      );
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            "p-3 rounded-xl border transition-all",
                            isCurrentLevel ? "bg-primary/5 border-primary/30" : "border-border/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{row.level}</span>
                              {isCurrentLevel && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  <Star className="w-2.5 h-2.5 mr-0.5" />
                                  Your Level
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-bold text-foreground">
                              {formatSalary(row.min, result.currencySymbol)} – {formatSalary(row.max, result.currencySymbol)}
                            </span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.15 }}
                              className={cn(
                                "h-full rounded-full",
                                isCurrentLevel
                                  ? "bg-gradient-to-r from-primary to-primary/70"
                                  : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20"
                              )}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Top Paying Cities */}
              <TabsContent value="cities" className="mt-0">
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Highest Paying Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {result.topPayingCities.map((city, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className={cn(
                            "relative p-4 rounded-xl border transition-all hover:shadow-md",
                            i === 0
                              ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30"
                              : "border-border/50 hover:border-primary/30"
                          )}
                        >
                          {i === 0 && (
                            <div className="absolute -top-2 -right-2">
                              <Badge className="bg-amber-500 text-white border-0 text-[9px] px-1.5 gap-0.5">
                                <Trophy className="w-3 h-3" />
                                #1
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                              i === 0 ? "bg-amber-500 text-white" :
                              i === 1 ? "bg-slate-400 text-white" :
                              i === 2 ? "bg-amber-700 text-white" :
                              "bg-muted text-muted-foreground"
                            )}>
                              #{i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{city.city}</p>
                              <p className="text-xs text-muted-foreground">{city.country}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-foreground">
                                {formatSalary(city.avgSalary, result.currencySymbol)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">/year</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Growth Tips */}
              <TabsContent value="tips" className="mt-0">
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      How to Increase Your Salary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.growthTips.map((tip, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/40 hover:border-primary/30 transition-all"
                        >
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Remote Impact Note */}
            {result.remoteImpact && (
              <Card className="rounded-xl border-0 bg-blue-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Remote Work Impact</p>
                    <p className="text-sm text-foreground leading-relaxed">{result.remoteImpact}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Disclaimer:</strong> Salary estimates are AI-generated based on market trends and may vary based on company, negotiation skills, and specific circumstances.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
