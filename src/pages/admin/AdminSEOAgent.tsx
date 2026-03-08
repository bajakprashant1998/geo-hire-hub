import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bot, Search, TrendingUp, FileText, Send, Loader2, AlertTriangle, CheckCircle,
  Info, Target, BarChart3, Globe, Zap, Copy, MessageSquare, Sparkles,
  ArrowUpRight, ShieldCheck, Link2, ExternalLink, Lightbulb, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type SeverityType = 'critical' | 'warning' | 'info';

const SITE_PAGES = [
  { url: '/', title: 'Homepage', type: 'landing' },
  { url: '/browse-jobs', title: 'Browse Jobs', type: 'listing' },
  { url: '/jobs-near-me', title: 'Jobs Near Me', type: 'landing' },
  { url: '/plans', title: 'Pricing Plans', type: 'conversion' },
  { url: '/login', title: 'Login', type: 'auth' },
  { url: '/signup', title: 'Sign Up', type: 'auth' },
  { url: '/terms', title: 'Terms of Service', type: 'legal' },
  { url: '/privacy', title: 'Privacy Policy', type: 'legal' },
];

const TARGET_KEYWORDS = ['hire for job', 'jobs near me', 'job listings near me', 'jobs hiring near me'];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

/* ─── Reusable KPI card ─── */
function KPICard({ index, title, value, subtitle, icon: Icon, gradient }: {
  index: number; title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.35 }}>
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={cn('absolute inset-0 opacity-[0.08] bg-gradient-to-br', gradient)} />
        <CardContent className="p-5 flex items-center gap-4 relative">
          <div className={cn('rounded-xl p-2.5 bg-gradient-to-br text-white shadow-md', gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Score Ring ─── */
function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? 'hsl(var(--primary))' : score >= 60 ? 'hsl(45 100% 50%)' : 'hsl(var(--destructive))';
  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={10} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c}
        animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-foreground text-3xl font-bold">{score}</text>
    </svg>
  );
}

/* ─── Severity badge ─── */
function SeverityBadge({ severity }: { severity: SeverityType }) {
  const map = {
    critical: { icon: AlertTriangle, cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    warning: { icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    info: { icon: Info, cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  };
  const { icon: I, cls } = map[severity];
  return <Badge variant="outline" className={cn('gap-1 text-[10px] font-semibold uppercase', cls)}><I className="h-3 w-3" />{severity}</Badge>;
}

export default function AdminSEOAgent() {
  const [activeTab, setActiveTab] = useState('audit');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [keywordResult, setKeywordResult] = useState<any>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState(SITE_PAGES[0]);
  const [competitorResult, setCompetitorResult] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const callAgent = async (action: string, data: any) => {
    const { data: result, error } = await supabase.functions.invoke('seo-agent', { body: { action, data } });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await callAgent('site_audit', { domain: 'hireforjob.com', pages: SITE_PAGES, keywords: TARGET_KEYWORDS, sitemapCount: 50, hasRobots: true, hasSSL: true, isMobile: true });
      setAuditResult(result);
      toast.success('SEO audit completed');
    } catch (e: any) { toast.error(e.message || 'Audit failed'); }
    setLoading(false);
  };

  const runKeywordResearch = async () => {
    setLoading(true);
    try {
      const result = await callAgent('keyword_research', { seedKeywords: TARGET_KEYWORDS, targetMarket: 'Global, primarily India' });
      setKeywordResult(result);
      toast.success('Keyword research completed');
    } catch (e: any) { toast.error(e.message || 'Research failed'); }
    setLoading(false);
  };

  const optimizePage = async () => {
    setLoading(true);
    try {
      const result = await callAgent('optimize_page', { url: selectedPage.url, title: selectedPage.title, pageType: selectedPage.type, keywords: TARGET_KEYWORDS });
      setOptimizeResult(result);
      toast.success('Page optimization suggestions ready');
    } catch (e: any) { toast.error(e.message || 'Optimization failed'); }
    setLoading(false);
  };

  const runCompetitorAnalysis = async () => {
    setLoading(true);
    try {
      const result = await callAgent('competitor_analysis', { keywords: TARGET_KEYWORDS });
      setCompetitorResult(result);
      toast.success('Competitor analysis completed');
    } catch (e: any) { toast.error(e.message || 'Analysis failed'); }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    let assistantContent = '';
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seo-agent`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: 'chat', data: { message: chatInput, history: chatMessages } }),
      });
      if (!resp.ok || !resp.body) { const errData = await resp.json().catch(() => ({})); throw new Error(errData.error || 'Stream failed'); }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Chat failed');
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); };

  const auditStats = auditResult ? {
    score: auditResult.overall_score || 0,
    critical: auditResult.categories?.reduce((n: number, c: any) => n + (c.issues?.filter((i: any) => i.severity === 'critical').length || 0), 0) || 0,
    warnings: auditResult.categories?.reduce((n: number, c: any) => n + (c.issues?.filter((i: any) => i.severity === 'warning').length || 0), 0) || 0,
    categories: auditResult.categories?.length || 0,
  } : null;

  return (
    <AdminLayout title="SEO AI Agent">
      <TooltipProvider>
        {/* Hero header */}
        <motion.div {...fadeUp} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SEO Intelligence Suite</h1>
                <p className="text-sm text-muted-foreground">AI-powered audits, keywords, optimization & competitor insights</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TARGET_KEYWORDS.map(kw => (
                <Badge key={kw} variant="secondary" className="text-[10px] gap-1"><Hash className="h-3 w-3" />{kw}</Badge>
              ))}
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/60 backdrop-blur p-1 rounded-xl flex-wrap h-auto gap-1">
            {[
              { value: 'audit', icon: ShieldCheck, label: 'Site Audit' },
              { value: 'keywords', icon: TrendingUp, label: 'Keywords' },
              { value: 'optimize', icon: FileText, label: 'Page Optimizer' },
              { value: 'competitors', icon: Target, label: 'Competitors' },
              { value: 'chat', icon: MessageSquare, label: 'AI Chat' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 rounded-lg data-[state=active]:shadow-md">
                <t.icon className="h-4 w-4" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══════════ SITE AUDIT ═══════════ */}
          <TabsContent value="audit" className="space-y-6">
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Full SEO Audit</CardTitle>
                      <CardDescription>Comprehensive analysis of your site's SEO health across 8 categories</CardDescription>
                    </div>
                    <Button onClick={runAudit} disabled={loading} className="gap-2 rounded-xl shadow-md">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Run Audit
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <AnimatePresence>
              {auditResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard index={0} title="SEO Score" value={`${auditStats?.score}/100`} icon={ShieldCheck} gradient="from-primary to-primary/70" subtitle={auditStats!.score >= 80 ? 'Healthy' : auditStats!.score >= 60 ? 'Needs Work' : 'Critical'} />
                    <KPICard index={1} title="Critical Issues" value={auditStats?.critical || 0} icon={AlertTriangle} gradient="from-destructive to-red-400" subtitle="Needs immediate fix" />
                    <KPICard index={2} title="Warnings" value={auditStats?.warnings || 0} icon={AlertTriangle} gradient="from-amber-500 to-yellow-400" subtitle="Should be addressed" />
                    <KPICard index={3} title="Categories" value={auditStats?.categories || 0} icon={BarChart3} gradient="from-emerald-500 to-green-400" subtitle="Analyzed" />
                  </div>

                  {/* Score ring + quick wins */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-0 shadow-lg flex items-center justify-center p-8">
                      <ScoreRing score={auditStats?.score || 0} />
                    </Card>
                    <Card className="rounded-2xl border-0 shadow-lg md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Quick Wins</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2.5">
                          {auditResult.quick_wins?.map((win: string, i: number) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-2.5 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{win}
                            </motion.li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Category cards */}
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid md:grid-cols-2 gap-4">
                    {auditResult.categories?.map((cat: any, i: number) => (
                      <motion.div key={i} variants={fadeUp}>
                        <Card className="rounded-2xl border-0 shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-semibold">{cat.name}</CardTitle>
                              <Badge variant={cat.score >= 80 ? 'default' : cat.score >= 60 ? 'secondary' : 'destructive'} className="font-mono">
                                {cat.score}/100
                              </Badge>
                            </div>
                            <Progress value={cat.score} className="h-1.5 mt-2" />
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2.5">
                            {cat.issues?.slice(0, 4).map((issue: any, j: number) => (
                              <div key={j} className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-muted/30">
                                <SeverityBadge severity={issue.severity} />
                                <div className="min-w-0">
                                  <p className="font-medium">{issue.title}</p>
                                  <p className="text-muted-foreground mt-0.5">{issue.fix}</p>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Top Priorities */}
                  {auditResult.top_priorities?.length > 0 && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Top Priorities</CardTitle></CardHeader>
                      <CardContent>
                        <ol className="space-y-2">
                          {auditResult.top_priorities.map((p: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-sm p-2.5 rounded-lg bg-muted/30">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              {p}
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════ KEYWORDS ═══════════ */}
          <TabsContent value="keywords" className="space-y-6">
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" />Keyword Research</CardTitle>
                      <CardDescription>Discover high-value keyword opportunities for your target market</CardDescription>
                    </div>
                    <Button onClick={runKeywordResearch} disabled={loading} className="gap-2 rounded-xl shadow-md">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Research Keywords
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <AnimatePresence>
              {keywordResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Primary Keywords Table */}
                  {keywordResult.primary_keywords?.length > 0 && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Primary Keywords</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto rounded-xl border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 text-left">
                                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Keyword</th>
                                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Volume</th>
                                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Competition</th>
                                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Difficulty</th>
                                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Opportunity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {keywordResult.primary_keywords.map((kw: any, i: number) => (
                                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                  className="border-t hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => copyText(kw.keyword)}>
                                  <td className="py-3 px-4 font-medium">{kw.keyword}</td>
                                  <td className="py-3 px-4 font-mono text-xs">{kw.volume}</td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline" className={cn('text-[10px]',
                                      kw.competition === 'low' ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10' :
                                      kw.competition === 'medium' ? 'border-amber-500/30 text-amber-600 bg-amber-500/10' :
                                      'border-destructive/30 text-destructive bg-destructive/10'
                                    )}>{kw.competition}</Badge>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full bg-primary" style={{ width: `${(kw.difficulty || 0) * 10}%` }} />
                                      </div>
                                      <span className="text-xs text-muted-foreground">{kw.difficulty}/10</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={cn('text-sm font-bold', kw.opportunity_score >= 7 ? 'text-emerald-600' : kw.opportunity_score >= 4 ? 'text-amber-600' : 'text-muted-foreground')}>
                                      {kw.opportunity_score}/10
                                    </span>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Long-tail */}
                    {keywordResult.long_tail_keywords?.length > 0 && (
                      <Card className="rounded-2xl border-0 shadow-lg">
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Hash className="h-4 w-4 text-primary" />Long-tail Keywords</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {keywordResult.long_tail_keywords.map((kw: any, i: number) => (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs" onClick={() => copyText(kw.keyword)}>
                                    {kw.keyword}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Intent: {kw.intent} · Click to copy</p></TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Question Keywords */}
                    {keywordResult.question_keywords?.length > 0 && (
                      <Card className="rounded-2xl border-0 shadow-lg">
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />FAQ Opportunities</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {keywordResult.question_keywords.map((q: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => copyText(q)}>
                                <span className="text-primary font-bold text-xs mt-0.5">Q</span><span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Content Gap */}
                  {keywordResult.content_gap_opportunities?.length > 0 && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-primary" />Content Gap Opportunities</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {keywordResult.content_gap_opportunities.map((gap: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                              <div className="min-w-0">
                                <p className="font-medium text-sm">{gap.topic}</p>
                                <p className="text-xs text-muted-foreground truncate">{gap.suggested_url}</p>
                              </div>
                              <Badge variant={gap.priority === 'high' ? 'destructive' : gap.priority === 'medium' ? 'secondary' : 'outline'} className="text-[10px] flex-shrink-0 ml-3">
                                {gap.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════ PAGE OPTIMIZER ═══════════ */}
          <TabsContent value="optimize" className="space-y-6">
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-500/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-600" />Page Optimizer</CardTitle>
                      <CardDescription>Get AI-powered optimization suggestions for any page</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        value={selectedPage.url}
                        onChange={(e) => setSelectedPage(SITE_PAGES.find(p => p.url === e.target.value) || SITE_PAGES[0])}
                      >
                        {SITE_PAGES.map(p => <option key={p.url} value={p.url}>{p.title} ({p.url})</option>)}
                      </select>
                      <Button onClick={optimizePage} disabled={loading} className="gap-2 rounded-xl shadow-md">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Optimize
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <AnimatePresence>
              {optimizeResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* SERP Preview */}
                  <Card className="rounded-2xl border-0 shadow-lg">
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Google SERP Preview</CardTitle></CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-xl border bg-white dark:bg-muted/20 space-y-1 max-w-xl">
                        <p className="text-sm text-muted-foreground truncate">hireforjob.com{selectedPage.url}</p>
                        <p className="text-lg text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer truncate">{optimizeResult.optimized_title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{optimizeResult.optimized_description}</p>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Title: {optimizeResult.optimized_title?.length || 0}/60 chars {(optimizeResult.optimized_title?.length || 0) <= 60 ? '✅' : '⚠️'}</span>
                        <span>Desc: {optimizeResult.optimized_description?.length || 0}/160 chars {(optimizeResult.optimized_description?.length || 0) <= 160 ? '✅' : '⚠️'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Title & Desc with copy */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {[{ label: 'Optimized Title', value: optimizeResult.optimized_title, max: 60 }, { label: 'Meta Description', value: optimizeResult.optimized_description, max: 160 }].map((item, idx) => (
                      <Card key={idx} className="rounded-2xl border-0 shadow-md">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{item.label}</h4>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyText(item.value || '')}><Copy className="h-3.5 w-3.5" /></Button>
                          </div>
                          <p className="text-sm bg-muted/50 p-3 rounded-xl font-medium">{item.value}</p>
                          <p className="text-[11px] text-muted-foreground mt-2">{item.value?.length || 0}/{item.max} characters</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Headings */}
                  {(optimizeResult.h1_suggestion || optimizeResult.h2_suggestions?.length > 0) && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader className="pb-2"><CardTitle className="text-base">Heading Suggestions</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {optimizeResult.h1_suggestion && (
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                            <Badge className="bg-primary text-primary-foreground text-[10px]">H1</Badge>
                            <span className="text-sm font-medium">{optimizeResult.h1_suggestion}</span>
                          </div>
                        )}
                        {optimizeResult.h2_suggestions?.map((h: string, i: number) => (
                          <div key={i} className="p-2.5 rounded-lg bg-muted/30 flex items-center gap-3">
                            <Badge variant="secondary" className="text-[10px]">H2</Badge>
                            <span className="text-sm">{h}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Content Suggestions */}
                    {optimizeResult.content_suggestions?.length > 0 && (
                      <Card className="rounded-2xl border-0 shadow-lg">
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Content Tips</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {optimizeResult.content_suggestions.map((s: string, i: number) => (
                              <li key={i} className="text-sm flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{s}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Internal Links */}
                    {optimizeResult.internal_link_opportunities?.length > 0 && (
                      <Card className="rounded-2xl border-0 shadow-lg">
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" />Internal Links</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {optimizeResult.internal_link_opportunities.map((link: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-sm p-2.5 rounded-lg border bg-muted/20">
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-primary font-medium">"{link.anchor_text}"</span>
                                <span className="text-muted-foreground">→</span>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{link.target_url}</code>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════ COMPETITORS ═══════════ */}
          <TabsContent value="competitors" className="space-y-6">
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-orange-600" />Competitor Analysis</CardTitle>
                      <CardDescription>Understand strengths, weaknesses & opportunities vs. top competitors</CardDescription>
                    </div>
                    <Button onClick={runCompetitorAnalysis} disabled={loading} className="gap-2 rounded-xl shadow-md">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                      Analyze Competitors
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <AnimatePresence>
              {competitorResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid md:grid-cols-2 gap-4">
                    {competitorResult.competitor_overview?.map((comp: any, i: number) => (
                      <motion.div key={i} variants={fadeUp}>
                        <Card className="rounded-2xl border-0 shadow-md hover:shadow-lg transition-shadow h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{comp.name}</CardTitle>
                              {comp.estimated_traffic && <Badge variant="secondary" className="text-[10px]">{comp.estimated_traffic}</Badge>}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Strengths</p>
                                <ul className="space-y-1.5">
                                  {comp.strengths?.map((s: string, j: number) => (
                                    <li key={j} className="text-xs flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />{s}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Weaknesses</p>
                                <ul className="space-y-1.5">
                                  {comp.weaknesses?.map((w: string, j: number) => (
                                    <li key={j} className="text-xs flex items-start gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />{w}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Keyword Gaps */}
                  {competitorResult.keyword_gaps?.length > 0 && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Keyword Gaps</CardTitle></CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto rounded-xl border">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-muted/50 text-left">
                              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Keyword</th>
                              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Competitor Ranking</th>
                              <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Our Opportunity</th>
                            </tr></thead>
                            <tbody>
                              {competitorResult.keyword_gaps.map((g: any, i: number) => (
                                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                                  <td className="py-2.5 px-4 font-medium">{g.keyword}</td>
                                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{g.competitor_ranking}</td>
                                  <td className="py-2.5 px-4 text-xs">{g.our_opportunity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Differentiation */}
                  {competitorResult.differentiation_opportunities?.length > 0 && (
                    <Card className="rounded-2xl border-0 shadow-lg">
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Differentiation Opportunities</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {competitorResult.differentiation_opportunities.map((opp: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{opp}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════ AI CHAT ═══════════ */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="flex flex-col border-0 shadow-lg rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />SEO Consultant Chat</CardTitle>
                <CardDescription>Ask anything about SEO strategy, implementation, or troubleshooting</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                <ScrollArea className="flex-1 px-5">
                  <div className="space-y-4 py-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-16 text-muted-foreground">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                          <Bot className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-medium mb-1">SEO Expert at your service</p>
                        <p className="text-xs mb-5">Ask me anything about SEO for Hire For Job</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                          {[
                            'How to rank #1 for "jobs near me"?',
                            'Suggest backlink strategies',
                            'Optimize homepage for Core Web Vitals',
                            'Create a content calendar for SEO',
                          ].map((q, i) => (
                            <Button key={i} variant="outline" size="sm" className="text-xs rounded-xl hover:bg-primary/5 hover:border-primary/30" onClick={() => setChatInput(q)}>
                              {q}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                          msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/70 border'
                        )}>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </motion.div>
                    ))}
                    {chatLoading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                      <div className="flex justify-start">
                        <div className="bg-muted/70 border rounded-2xl px-4 py-3 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Thinking…</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2 p-4 border-t bg-card/80 backdrop-blur">
                  <Input
                    value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about SEO strategy…" disabled={chatLoading}
                    className="flex-1 rounded-xl"
                  />
                  <Button type="submit" disabled={chatLoading || !chatInput.trim()} size="icon" className="rounded-xl shadow-md">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AdminLayout>
  );
}
