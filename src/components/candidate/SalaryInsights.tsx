import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AILocationAutocomplete } from './AILocationAutocomplete';
import {
  DollarSign, TrendingUp, MapPin, Briefcase, Sparkles, Loader2, Download,
  BarChart3, Lightbulb, Globe, AlertTriangle, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

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

  const demandColor = (demand: string) => {
    switch (demand?.toLowerCase()) {
      case 'high': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
      default: return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const sym = result.currencySymbol;
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = 15;

    const primary = [59, 130, 246]; // blue-500
    const primaryLight = [239, 246, 255]; // blue-50
    const gray50 = [249, 250, 251];
    const gray200 = [229, 231, 235];
    const gray500 = [107, 114, 128];
    const gray700 = [55, 65, 81];
    const gray900 = [17, 24, 39];
    const emerald = [16, 185, 129];
    const amber = [245, 158, 11];
    const red = [239, 68, 68];

    const drawRoundedRect = (x: number, ry: number, w: number, h: number, r: number, fill: number[], stroke?: number[]) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      if (stroke) {
        doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
        doc.setLineWidth(0.3);
      }
      doc.roundedRect(x, ry, w, h, r, r, stroke ? 'FD' : 'F');
    };

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 15;
      }
    };

    // ── Header Card ──
    drawRoundedRect(margin, y, contentW, 32, 3, primaryLight, gray200);
    // Gradient-like left accent
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(margin, y, 4, 32, 2, 2, 'F');

    y += 9;
    doc.setFontSize(8);
    doc.setTextColor(gray500[0], gray500[1], gray500[2]);
    doc.text('ESTIMATED SALARY RANGE', margin + 10, y);
    y += 7;
    doc.setFontSize(18);
    doc.setTextColor(gray900[0], gray900[1], gray900[2]);
    doc.text(`${formatSalary(result.estimatedRange.min, sym)} – ${formatSalary(result.estimatedRange.max, sym)}`, margin + 10, y);
    y += 7;
    doc.setFontSize(8);
    doc.setTextColor(gray500[0], gray500[1], gray500[2]);
    doc.text(`${result.currencyCode} per annum  •  ${jobCategory}  •  ${location}`, margin + 10, y);

    // Date on right
    doc.setFontSize(7);
    doc.text(new Date().toLocaleDateString(), pageW - margin - 2, y, { align: 'right' });
    y += 14;

    // ── Experience Breakdown Card ──
    checkPage(12 + result.experienceBreakdown.length * 12);
    const expCardH = 14 + result.experienceBreakdown.length * 12;
    drawRoundedRect(margin, y, contentW, expCardH, 3, [255, 255, 255], gray200);

    y += 8;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.circle(margin + 7, y - 1.5, 2.5, 'F');
    doc.setFontSize(10);
    doc.setTextColor(gray900[0], gray900[1], gray900[2]);
    doc.text('Experience-wise Salary Breakdown', margin + 13, y);
    y += 6;

    const maxSalary = Math.max(...result.experienceBreakdown.map(r => r.max));
    result.experienceBreakdown.forEach((row) => {
      const pct = (row.max / maxSalary) * 100;
      const barW = contentW - 12;

      doc.setFontSize(8);
      doc.setTextColor(gray500[0], gray500[1], gray500[2]);
      doc.text(row.level, margin + 6, y);
      doc.setTextColor(gray900[0], gray900[1], gray900[2]);
      doc.text(`${formatSalary(row.min, sym)} – ${formatSalary(row.max, sym)}`, margin + contentW - 6, y, { align: 'right' });
      y += 3;

      // Progress bar background
      drawRoundedRect(margin + 6, y, barW, 3, 1.5, gray50);
      // Progress bar fill
      const fillW = Math.max(3, (pct / 100) * barW);
      drawRoundedRect(margin + 6, y, fillW, 3, 1.5, primary);
      y += 9;
    });
    y += 4;

    // ── Market Demand Card ──
    checkPage(40);
    drawRoundedRect(margin, y, contentW, 28, 3, [255, 255, 255], gray200);
    y += 8;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.circle(margin + 7, y - 1.5, 2.5, 'F');
    doc.setFontSize(10);
    doc.setTextColor(gray900[0], gray900[1], gray900[2]);
    doc.text('Market Demand', margin + 13, y);

    // Demand badge
    const demandClr = result.marketDemand?.toLowerCase() === 'high' ? emerald
      : result.marketDemand?.toLowerCase() === 'medium' ? amber : red;
    const badgeText = `${result.marketDemand} Demand (${result.marketDemandScore}%)`;
    const badgeW = doc.getTextWidth(badgeText) + 8;
    drawRoundedRect(margin + contentW - badgeW - 6, y - 4, badgeW, 7, 2, [demandClr[0], demandClr[1], demandClr[2]]);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, margin + contentW - 6 - badgeW / 2, y, { align: 'center' });

    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(gray500[0], gray500[1], gray500[2]);
    doc.text(`Trend: ${result.industryTrend}`, margin + 6, y);
    y += 5;
    const remoteLines = doc.splitTextToSize(result.remoteImpact || '', contentW - 12);
    doc.text(remoteLines, margin + 6, y);
    y += remoteLines.length * 4 + 6;

    // ── Top Paying Cities Card ──
    checkPage(12 + result.topPayingCities.length * 9);
    const citiesH = 12 + result.topPayingCities.length * 9;
    drawRoundedRect(margin, y, contentW, citiesH, 3, [255, 255, 255], gray200);
    y += 8;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.circle(margin + 7, y - 1.5, 2.5, 'F');
    doc.setFontSize(10);
    doc.setTextColor(gray900[0], gray900[1], gray900[2]);
    doc.text('Top Paying Cities', margin + 13, y);
    y += 6;

    result.topPayingCities.forEach((city, i) => {
      doc.setFontSize(8);
      // Rank circle
      if (i === 0) {
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(gray50[0], gray50[1], gray50[2]);
        doc.setTextColor(gray500[0], gray500[1], gray500[2]);
      }
      doc.circle(margin + 9, y - 1, 3, 'F');
      doc.text(`${i + 1}`, margin + 9, y, { align: 'center' });

      doc.setTextColor(gray900[0], gray900[1], gray900[2]);
      doc.text(`${city.city}, ${city.country}`, margin + 16, y);
      doc.setTextColor(gray500[0], gray500[1], gray500[2]);
      doc.text(`${formatSalary(city.avgSalary, sym)}/yr`, margin + contentW - 6, y, { align: 'right' });
      y += 7;
    });
    y += 6;

    // ── Growth Tips Card ──
    checkPage(20);
    let tipsStartY = y;
    // We'll calculate height after
    const tipsContentLines: string[][] = result.growthTips.map(tip => doc.splitTextToSize(`${tip}`, contentW - 18));
    const tipsH = 12 + tipsContentLines.reduce((sum, lines) => sum + lines.length * 4 + 3, 0);
    checkPage(tipsH);
    drawRoundedRect(margin, y, contentW, tipsH, 3, [255, 255, 255], gray200);
    y += 8;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.circle(margin + 7, y - 1.5, 2.5, 'F');
    doc.setFontSize(10);
    doc.setTextColor(gray900[0], gray900[1], gray900[2]);
    doc.text('Salary Growth Tips', margin + 13, y);
    y += 6;

    doc.setFontSize(8);
    result.growthTips.forEach((tip, i) => {
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.text('▸', margin + 6, y);
      doc.setTextColor(gray700[0], gray700[1], gray700[2]);
      const lines = doc.splitTextToSize(tip, contentW - 18);
      doc.text(lines, margin + 12, y);
      y += lines.length * 4 + 3;
    });
    y += 6;

    // ── Disclaimer ──
    checkPage(12);
    drawRoundedRect(margin, y, contentW, 10, 2, [255, 251, 235], [253, 230, 138]);
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text('⚠  Salary estimates are AI-generated based on market trends. Actual salaries may vary.', margin + 5, y + 6);

    doc.save(`salary-report-${jobCategory.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('PDF downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Salary Insights</h2>
          <p className="text-sm text-muted-foreground">AI-powered salary recommendations based on your profile</p>
        </div>
      </div>

      {/* Form */}
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location <span className="text-destructive">*</span></Label>
              <AILocationAutocomplete
                value={location}
                onChange={handleLocationChange}
                placeholder="e.g. Mumbai, Maharashtra, India"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Job Role / Category <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Years of Experience</Label>
              <Input
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 3"
                min="0"
                max="50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Skills (comma separated)</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, Node.js, Python"
              />
            </div>
          </div>
          <Button
            onClick={fetchInsights}
            disabled={loading || !location || !jobCategory}
            className="w-full sm:w-auto gap-2 rounded-xl h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Analyzing...' : 'Get Salary Suggestion'}
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-12"
          >
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Analyzing salary data with AI...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Estimated Range Card */}
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Estimated Salary Range</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      {formatSalary(result.estimatedRange.min, result.currencySymbol)} – {formatSalary(result.estimatedRange.max, result.currencySymbol)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{result.currencyCode} per annum • {jobCategory} in {location}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadPDF} className="gap-1.5 rounded-xl">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>

            {/* Experience Breakdown + Market Demand */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 rounded-2xl border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Experience-wise Salary Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.experienceBreakdown.map((row, i) => {
                    const maxSalary = Math.max(...result.experienceBreakdown.map(r => r.max));
                    const pct = (row.max / maxSalary) * 100;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">{row.level}</span>
                          <span className="font-semibold text-foreground">
                            {formatSalary(row.min, result.currencySymbol)} – {formatSalary(row.max, result.currencySymbol)}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.15 }}
                            className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Market Demand
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <motion.circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - result.marketDemandScore / 100) }}
                          transition={{ duration: 1 }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                        {result.marketDemandScore}%
                      </span>
                    </div>
                    <Badge className={cn("mt-3 border", demandColor(result.marketDemand))}>
                      {result.marketDemand} Demand
                    </Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trend</span>
                      <span className="font-medium text-foreground">{result.industryTrend}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{result.remoteImpact}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Paying Cities */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Top Paying Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {result.topPayingCities.map((city, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{city.city}</p>
                        <p className="text-xs text-muted-foreground">{formatSalary(city.avgSalary, result.currencySymbol)}/yr</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Growth Tips */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Salary Growth Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.growthTips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40"
                    >
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Salary estimates are AI-generated based on market trends. Actual salaries may vary based on company, negotiation, and specific circumstances.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
