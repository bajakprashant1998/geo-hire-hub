import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Bot, Search, TrendingUp, FileText, Send, Loader2, AlertTriangle, CheckCircle,
  Info, Target, BarChart3, Globe, Zap, Copy, RefreshCw, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

export default function AdminSEOAgent() {
  const [activeTab, setActiveTab] = useState('audit');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [keywordResult, setKeywordResult] = useState<any>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState(SITE_PAGES[0]);
  const [competitorResult, setCompetitorResult] = useState<any>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const callAgent = async (action: string, data: any) => {
    const { data: result, error } = await supabase.functions.invoke('seo-agent', {
      body: { action, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };

  const runAudit = async () => {
    setLoading(true);
    try {
      const result = await callAgent('site_audit', {
        domain: 'hireforjob.com',
        pages: SITE_PAGES,
        keywords: TARGET_KEYWORDS,
        sitemapCount: 50,
        hasRobots: true,
        hasSSL: true,
        isMobile: true,
      });
      setAuditResult(result);
      toast.success('SEO audit completed');
    } catch (e: any) {
      toast.error(e.message || 'Audit failed');
    }
    setLoading(false);
  };

  const runKeywordResearch = async () => {
    setLoading(true);
    try {
      const result = await callAgent('keyword_research', {
        seedKeywords: TARGET_KEYWORDS,
        targetMarket: 'Global, primarily India',
      });
      setKeywordResult(result);
      toast.success('Keyword research completed');
    } catch (e: any) {
      toast.error(e.message || 'Research failed');
    }
    setLoading(false);
  };

  const optimizePage = async () => {
    setLoading(true);
    try {
      const result = await callAgent('optimize_page', {
        url: selectedPage.url,
        title: selectedPage.title,
        pageType: selectedPage.type,
        keywords: TARGET_KEYWORDS,
      });
      setOptimizeResult(result);
      toast.success('Page optimization suggestions ready');
    } catch (e: any) {
      toast.error(e.message || 'Optimization failed');
    }
    setLoading(false);
  };

  const runCompetitorAnalysis = async () => {
    setLoading(true);
    try {
      const result = await callAgent('competitor_analysis', {
        keywords: TARGET_KEYWORDS,
      });
      setCompetitorResult(result);
      toast.success('Competitor analysis completed');
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    }
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'chat',
          data: { message: chatInput, history: chatMessages },
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Stream failed');
      }

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
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
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

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const SeverityIcon = ({ severity }: { severity: SeverityType }) => {
    if (severity === 'critical') return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Info className="w-4 h-4 text-blue-500" />;
  };

  return (
    <AdminLayout title="SEO AI Agent">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="audit"><Search className="h-4 w-4 mr-1" />Site Audit</TabsTrigger>
          <TabsTrigger value="keywords"><TrendingUp className="h-4 w-4 mr-1" />Keywords</TabsTrigger>
          <TabsTrigger value="optimize"><FileText className="h-4 w-4 mr-1" />Page Optimizer</TabsTrigger>
          <TabsTrigger value="competitors"><Target className="h-4 w-4 mr-1" />Competitors</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1" />AI Chat</TabsTrigger>
        </TabsList>

        {/* ===== SITE AUDIT ===== */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Full SEO Audit</CardTitle>
                  <CardDescription>AI-powered analysis of your entire site's SEO health</CardDescription>
                </div>
                <Button onClick={runAudit} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Run Audit
                </Button>
              </div>
            </CardHeader>
            {auditResult && (
              <CardContent className="space-y-6">
                {/* Overall Score */}
                <div className="text-center p-6 rounded-xl bg-muted/50">
                  <div className="text-5xl font-bold text-primary mb-2">{auditResult.overall_score || 0}</div>
                  <p className="text-muted-foreground">Overall SEO Score</p>
                  <Progress value={auditResult.overall_score || 0} className="mt-3 max-w-xs mx-auto" />
                </div>

                {/* Quick Wins */}
                {auditResult.quick_wins?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Quick Wins</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {auditResult.quick_wins.map((win: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            {win}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Categories */}
                <div className="grid md:grid-cols-2 gap-4">
                  {auditResult.categories?.map((cat: any, i: number) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{cat.name}</CardTitle>
                          <Badge variant={cat.score >= 80 ? 'default' : cat.score >= 60 ? 'secondary' : 'destructive'}>
                            {cat.score}/100
                          </Badge>
                        </div>
                        <Progress value={cat.score} className="h-1.5" />
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {cat.issues?.slice(0, 3).map((issue: any, j: number) => (
                            <div key={j} className="flex items-start gap-2 text-xs">
                              <SeverityIcon severity={issue.severity} />
                              <div>
                                <p className="font-medium">{issue.title}</p>
                                <p className="text-muted-foreground">{issue.fix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Top Priorities */}
                {auditResult.top_priorities?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Top Priorities</CardTitle></CardHeader>
                    <CardContent>
                      <ol className="space-y-2 list-decimal list-inside">
                        {auditResult.top_priorities.map((p: string, i: number) => (
                          <li key={i} className="text-sm">{p}</li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ===== KEYWORD RESEARCH ===== */}
        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Keyword Research</CardTitle>
                  <CardDescription>Discover keyword opportunities for your target market</CardDescription>
                </div>
                <Button onClick={runKeywordResearch} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Research
                </Button>
              </div>
            </CardHeader>
            {keywordResult && (
              <CardContent className="space-y-6">
                {/* Primary Keywords */}
                {keywordResult.primary_keywords?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Primary Keywords</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 pr-4">Keyword</th>
                            <th className="py-2 pr-4">Volume</th>
                            <th className="py-2 pr-4">Competition</th>
                            <th className="py-2">Opportunity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywordResult.primary_keywords.map((kw: any, i: number) => (
                            <tr key={i} className="border-b">
                              <td className="py-2 pr-4 font-medium">{kw.keyword}</td>
                              <td className="py-2 pr-4">{kw.volume}</td>
                              <td className="py-2 pr-4">
                                <Badge variant={kw.competition === 'low' ? 'default' : kw.competition === 'medium' ? 'secondary' : 'destructive'}>
                                  {kw.competition}
                                </Badge>
                              </td>
                              <td className="py-2">{kw.opportunity_score}/10</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Long-tail Keywords */}
                {keywordResult.long_tail_keywords?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Long-tail Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {keywordResult.long_tail_keywords.map((kw: any, i: number) => (
                        <Badge key={i} variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => copyText(kw.keyword)}>
                          {kw.keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Gap Opportunities */}
                {keywordResult.content_gap_opportunities?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Content Gap Opportunities</h3>
                    <div className="space-y-3">
                      {keywordResult.content_gap_opportunities.map((gap: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium text-sm">{gap.topic}</p>
                            <p className="text-xs text-muted-foreground">{gap.suggested_url}</p>
                          </div>
                          <Badge variant={gap.priority === 'high' ? 'destructive' : gap.priority === 'medium' ? 'secondary' : 'outline'}>
                            {gap.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Keywords */}
                {keywordResult.question_keywords?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Question Keywords (FAQ Opportunities)</h3>
                    <ul className="space-y-1">
                      {keywordResult.question_keywords.map((q: string, i: number) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="text-primary">Q:</span> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ===== PAGE OPTIMIZER ===== */}
        <TabsContent value="optimize" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Page Optimizer</CardTitle>
                  <CardDescription>Get AI-powered optimization suggestions for any page</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedPage.url}
                    onChange={(e) => setSelectedPage(SITE_PAGES.find(p => p.url === e.target.value) || SITE_PAGES[0])}
                  >
                    {SITE_PAGES.map(p => (
                      <option key={p.url} value={p.url}>{p.title} ({p.url})</option>
                    ))}
                  </select>
                  <Button onClick={optimizePage} disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Optimize
                  </Button>
                </div>
              </div>
            </CardHeader>
            {optimizeResult && (
              <CardContent className="space-y-6">
                {/* Title & Description */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Optimized Title</h4>
                        <Button variant="ghost" size="sm" onClick={() => copyText(optimizeResult.optimized_title)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm bg-muted p-2 rounded">{optimizeResult.optimized_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{optimizeResult.optimized_title?.length || 0}/60 chars</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Optimized Description</h4>
                        <Button variant="ghost" size="sm" onClick={() => copyText(optimizeResult.optimized_description)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm bg-muted p-2 rounded">{optimizeResult.optimized_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{optimizeResult.optimized_description?.length || 0}/160 chars</p>
                    </CardContent>
                  </Card>
                </div>

                {/* H1 & H2 Suggestions */}
                {optimizeResult.h1_suggestion && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">H1 Suggestion</h4>
                    <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/20">{optimizeResult.h1_suggestion}</p>
                  </div>
                )}
                {optimizeResult.h2_suggestions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">H2 Suggestions</h4>
                    <ul className="space-y-1">
                      {optimizeResult.h2_suggestions.map((h: string, i: number) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="text-primary font-mono text-xs">H2</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content Suggestions */}
                {optimizeResult.content_suggestions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Content Suggestions</h4>
                    <ul className="space-y-2">
                      {optimizeResult.content_suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Internal Links */}
                {optimizeResult.internal_link_opportunities?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Internal Link Opportunities</h4>
                    <div className="space-y-2">
                      {optimizeResult.internal_link_opportunities.map((link: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span className="text-primary">"{link.anchor_text}"</span>
                          <span className="text-muted-foreground">→</span>
                          <code className="text-xs bg-muted px-1 rounded">{link.target_url}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ===== COMPETITOR ANALYSIS ===== */}
        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Competitor Analysis</CardTitle>
                  <CardDescription>Understand your competitive landscape</CardDescription>
                </div>
                <Button onClick={runCompetitorAnalysis} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  Analyze
                </Button>
              </div>
            </CardHeader>
            {competitorResult && (
              <CardContent className="space-y-6">
                {competitorResult.competitor_overview?.map((comp: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">{comp.name}</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                          <ul className="space-y-1">
                            {comp.strengths?.map((s: string, j: number) => (
                              <li key={j} className="text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3 text-primary" />{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Weaknesses</p>
                          <ul className="space-y-1">
                            {comp.weaknesses?.map((w: string, j: number) => (
                              <li key={j} className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {competitorResult.differentiation_opportunities?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Differentiation Opportunities</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {competitorResult.differentiation_opportunities.map((opp: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{opp}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ===== AI CHAT ===== */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />SEO Consultant Chat</CardTitle>
              <CardDescription>Ask anything about SEO strategy, implementation, or troubleshooting</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Ask me anything about SEO for Hire For Job</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {[
                          'How to rank #1 for "jobs near me"?',
                          'Suggest backlink strategies',
                          'Optimize my homepage for Core Web Vitals',
                          'Create a content calendar for SEO',
                        ].map((q, i) => (
                          <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => { setChatInput(q); }}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-xl px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <form
                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                className="flex gap-2 pt-3 border-t mt-auto"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about SEO strategy..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
