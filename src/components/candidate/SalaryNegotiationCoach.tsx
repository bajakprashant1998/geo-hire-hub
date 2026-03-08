import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, Loader2, Send, Bot, MessageSquare, Target, BookOpen,
  Swords, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle,
  AlertTriangle, Copy, ArrowRight, Sparkles, Shield, Lightbulb,
  ChevronRight, Play, RotateCcw, Mail, Star, Zap, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalaryNegotiationCoachProps {
  candidateId: string;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'AED'];

export const SalaryNegotiationCoach = ({ candidateId }: SalaryNegotiationCoachProps) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="space-y-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 p-6"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Banknote className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Salary Negotiation Coach</h2>
            <p className="text-sm text-muted-foreground">
              Get AI-powered negotiation strategies, analyze offers, practice scenarios, and land the salary you deserve.
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
            <Bot className="w-3.5 h-3.5" /><span className="hidden sm:inline">Chat</span> Coach
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="gap-1.5 text-xs sm:text-sm">
            <Target className="w-3.5 h-3.5" /><span className="hidden sm:inline">Offer</span> Analyzer
          </TabsTrigger>
          <TabsTrigger value="playbook" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="w-3.5 h-3.5" /> Playbook
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-1.5 text-xs sm:text-sm">
            <Swords className="w-3.5 h-3.5" /> Practice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat"><ChatCoach /></TabsContent>
        <TabsContent value="analyzer"><OfferAnalyzer /></TabsContent>
        <TabsContent value="playbook"><NegotiationPlaybook /></TabsContent>
        <TabsContent value="practice"><PracticeSimulator /></TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Chat Coach Tab ──────────────────────────────────────────────────────────

function ChatCoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "How do I ask for a raise?",
    "What's a good counter-offer strategy?",
    "How to negotiate remote work?",
    "When should I walk away from an offer?",
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'negotiation_chat', messages: newMessages }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      toast.error('Failed to get response. Please try again.');
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/40">
      <CardContent className="p-0">
        <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">AI Negotiation Coach</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Ask me anything about salary negotiation — from preparing for the conversation to closing the deal.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/60 text-foreground border border-border/30 rounded-bl-md'
              )}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === 'assistant' && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(m.content); toast.success('Copied!'); }}
                    className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about negotiation strategies…"
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Offer Analyzer Tab ──────────────────────────────────────────────────────

function OfferAnalyzer() {
  const [form, setForm] = useState({
    jobTitle: '', companyName: '', salary: '', currency: 'USD',
    benefits: '', equity: '', location: '', currentSalary: '', yearsExperience: '',
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!form.salary) { toast.error('Please enter the offered salary'); return; }
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'analyze_offer', ...form }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      toast.error('Failed to analyze offer');
    } finally {
      setLoading(false);
    }
  };

  const ratingConfig = {
    above_market: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Above Market' },
    at_market: { icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'At Market Rate' },
    below_market: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Below Market' },
  };

  return (
    <div className="space-y-4">
      {!analysis ? (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Enter Your Offer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Job Title *" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
              <Input placeholder="Company Name" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              <div className="flex gap-2">
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Offered Salary *" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="flex-1" />
              </div>
              <Input placeholder="Your Current Salary" type="number" value={form.currentSalary} onChange={e => setForm({ ...form, currentSalary: e.target.value })} />
              <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Years of Experience" type="number" value={form.yearsExperience} onChange={e => setForm({ ...form, yearsExperience: e.target.value })} />
            </div>
            <Textarea placeholder="Benefits (health, 401k, PTO, etc.)" value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} rows={2} />
            <Input placeholder="Equity / Stock Options" value={form.equity} onChange={e => setForm({ ...form, equity: e.target.value })} />
            <Button onClick={analyze} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze My Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Score + Rating */}
          <Card className="border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Offer Score</p>
                  <p className="text-3xl font-bold text-foreground">{analysis.overall_score}<span className="text-lg text-muted-foreground">/100</span></p>
                </div>
                {(() => {
                  const r = ratingConfig[analysis.market_comparison?.rating as keyof typeof ratingConfig] || ratingConfig.at_market;
                  return (
                    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl', r.bg)}>
                      <r.icon className={cn('w-4 h-4', r.color)} />
                      <span className={cn('text-sm font-semibold', r.color)}>{r.label}</span>
                    </div>
                  );
                })()}
              </div>
              <Progress value={analysis.overall_score} className="h-2" />
              <p className="text-sm text-muted-foreground mt-3">{analysis.verdict}</p>

              {analysis.market_comparison?.estimated_range && (
                <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Market Range ({form.currency})</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{analysis.market_comparison.estimated_range.low?.toLocaleString()}</span>
                    <span className="font-bold text-foreground">{analysis.market_comparison.estimated_range.mid?.toLocaleString()}</span>
                    <span className="text-muted-foreground">{analysis.market_comparison.estimated_range.high?.toLocaleString()}</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full mt-2">
                    <div className="absolute h-full bg-primary/30 rounded-full" style={{ left: '0%', width: '100%' }} />
                    <div
                      className="absolute w-3 h-3 bg-primary rounded-full top-1/2 -translate-y-1/2 ring-2 ring-background"
                      style={{ left: `${Math.min(95, Math.max(5, analysis.market_comparison.percentile || 50))}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnalysisListCard title="Strengths" items={analysis.strengths} icon={CheckCircle2} color="text-emerald-500" />
            <AnalysisListCard title="Weaknesses" items={analysis.weaknesses} icon={AlertTriangle} color="text-amber-500" />
          </div>

          {/* Counter Offer */}
          {analysis.counter_offer && (
            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-primary" /> Suggested Counter-Offer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-primary">{form.currency} {analysis.counter_offer.suggested_salary?.toLocaleString()}</p>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.counter_offer.rationale}</p>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/30">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Script</p>
                  <p className="text-sm text-foreground italic">"{analysis.counter_offer.script}"</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(analysis.counter_offer.script); toast.success('Script copied!'); }}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy script
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leverage + Benefits */}
          <AnalysisListCard title="Negotiation Leverage Points" items={analysis.negotiation_leverage} icon={Shield} color="text-primary" />

          <Button variant="outline" onClick={() => setAnalysis(null)} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" /> Analyze Another Offer
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Negotiation Playbook Tab ────────────────────────────────────────────────

function NegotiationPlaybook() {
  const [form, setForm] = useState({
    jobTitle: '', companyName: '', currentSalary: '', targetSalary: '', currency: 'USD', situation: '',
  });
  const [playbook, setPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);

  const generate = async () => {
    if (!form.targetSalary) { toast.error('Please enter your target salary'); return; }
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'generate_playbook', ...form }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPlaybook(data.playbook);
      setExpandedPhase(0);
    } catch {
      toast.error('Failed to generate playbook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!playbook ? (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Generate Your Playbook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Job Title" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
              <Input placeholder="Company" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              <div className="flex gap-2">
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Current Salary" type="number" value={form.currentSalary} onChange={e => setForm({ ...form, currentSalary: e.target.value })} className="flex-1" />
              </div>
              <Input placeholder="Target Salary *" type="number" value={form.targetSalary} onChange={e => setForm({ ...form, targetSalary: e.target.value })} />
            </div>
            <Select value={form.situation} onValueChange={v => setForm({ ...form, situation: v })}>
              <SelectTrigger><SelectValue placeholder="Select negotiation scenario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_offer">New Job Offer</SelectItem>
                <SelectItem value="raise">Asking for a Raise</SelectItem>
                <SelectItem value="promotion">Negotiating a Promotion</SelectItem>
                <SelectItem value="counter">Counter-Offer Situation</SelectItem>
                <SelectItem value="competing">Have Competing Offers</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Generate Negotiation Playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Phases */}
          {playbook.phases?.map((phase: any, i: number) => (
            <Card key={i} className={cn('border-border/40 transition-all cursor-pointer', expandedPhase === i && 'border-primary/30 shadow-sm')}>
              <button
                onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                  expandedPhase === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {phase.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{phase.title}</p>
                  <p className="text-xs text-muted-foreground">{phase.duration}</p>
                </div>
                <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', expandedPhase === i && 'rotate-90')} />
              </button>
              <AnimatePresence>
                {expandedPhase === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {phase.tasks?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Tasks</p>
                          <ul className="space-y-1">
                            {phase.tasks.map((t: string, j: number) => (
                              <li key={j} className="text-sm text-foreground flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {phase.scripts?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Scripts & Templates</p>
                          {phase.scripts.map((s: string, j: number) => (
                            <div key={j} className="p-2.5 bg-muted/40 rounded-lg border border-border/30 mb-2">
                              <p className="text-sm text-foreground italic">"{s}"</p>
                              <button
                                onClick={() => { navigator.clipboard.writeText(s); toast.success('Copied!'); }}
                                className="text-[10px] text-primary mt-1 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {phase.tips?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Pro Tips</p>
                          {phase.tips.map((t: string, j: number) => (
                            <p key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /> {t}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}

          {/* Do / Don't */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnalysisListCard title="Do's" items={playbook.do_list} icon={CheckCircle2} color="text-emerald-500" />
            <AnalysisListCard title="Don'ts" items={playbook.dont_list} icon={XCircle} color="text-rose-500" />
          </div>

          {/* Power Phrases */}
          {playbook.power_phrases?.length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Power Phrases</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {playbook.power_phrases.map((p: string, i: number) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-primary/10" onClick={() => { navigator.clipboard.writeText(p); toast.success('Copied!'); }}>
                    "{p}"
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Email Templates */}
          {playbook.email_templates && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(playbook.email_templates).map(([key, template]: [string, any]) => (
                  <div key={key} className="p-3 bg-muted/30 rounded-xl border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(template); toast.success('Template copied!'); }}
                        className="text-xs text-primary flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{template}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => setPlaybook(null)} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" /> Generate New Playbook
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Practice Simulator Tab ──────────────────────────────────────────────────

function PracticeSimulator() {
  const [scenario, setScenario] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scenarios = [
    { value: 'new_offer', label: 'New Job Offer Negotiation', desc: 'The recruiter just presented you a salary offer' },
    { value: 'raise', label: 'Asking for a Raise', desc: 'You\'re meeting with your manager about compensation' },
    { value: 'promotion', label: 'Promotion Negotiation', desc: 'You\'ve been offered a promotion but need to negotiate terms' },
    { value: 'competing', label: 'Competing Offers', desc: 'You have another offer and want to negotiate with preferred company' },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const startSim = async () => {
    if (!scenario) { toast.error('Pick a scenario'); return; }
    setStarted(true);
    setLoading(true);
    const sel = scenarios.find(s => s.value === scenario);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'practice_simulate',
          scenario: sel?.desc || scenario,
          candidateMessage: "Hello, I'd like to discuss the compensation for this role.",
          conversationHistory: [],
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessages([
        { role: 'user', content: "Hello, I'd like to discuss the compensation for this role." },
        { role: 'assistant', content: data.reply || 'Let me start by saying we\'re excited to make you an offer...' },
      ]);
    } catch {
      toast.error('Failed to start simulation');
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'practice_simulate',
          scenario: scenarios.find(s => s.value === scenario)?.desc || scenario,
          candidateMessage: msg,
          conversationHistory: messages,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      if (data.simulation_result) {
        setResult(data.simulation_result);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const endSimulation = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salary-negotiation-coach`, {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'practice_simulate',
          scenario: scenarios.find(s => s.value === scenario)?.desc || scenario,
          candidateMessage: 'END_SIMULATION',
          conversationHistory: messages,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.simulation_result) {
        setResult(data.simulation_result);
      } else {
        setResult({ score: 70, grade: 'B', strengths: ['Good communication'], mistakes: ['Could be more specific'], tips: ['Practice more'], outcome: 'Simulation ended by candidate' });
      }
    } catch {
      toast.error('Failed to end simulation');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setResult(null);
    setScenario('');
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="border-border/40">
          <CardContent className="p-5 text-center">
            <div className={cn(
              'w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3 border',
              result.score >= 80 ? 'bg-emerald-500/15 border-emerald-500/30' :
              result.score >= 60 ? 'bg-amber-500/15 border-amber-500/30' :
              'bg-rose-500/15 border-rose-500/30'
            )}>
              <span className={cn(
                'text-3xl font-bold',
                result.score >= 80 ? 'text-emerald-500' : result.score >= 60 ? 'text-amber-500' : 'text-rose-500'
              )}>
                {result.grade}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground">{result.score}<span className="text-lg text-muted-foreground">/100</span></p>
            <p className="text-sm text-muted-foreground mt-1">{result.outcome}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnalysisListCard title="Strengths" items={result.strengths} icon={CheckCircle2} color="text-emerald-500" />
          <AnalysisListCard title="Areas to Improve" items={result.mistakes} icon={AlertTriangle} color="text-amber-500" />
        </div>

        <AnalysisListCard title="Tips for Next Time" items={result.tips} icon={Lightbulb} color="text-primary" />

        <Button onClick={reset} className="w-full gap-2">
          <RotateCcw className="w-4 h-4" /> Try Another Scenario
        </Button>
      </motion.div>
    );
  }

  if (!started) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" /> Choose a Scenario
          </CardTitle>
          <p className="text-xs text-muted-foreground">Practice negotiating with an AI hiring manager. Get scored on your approach.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenarios.map(s => (
            <button
              key={s.value}
              onClick={() => setScenario(s.value)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3',
                scenario === s.value
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/40 hover:border-primary/20 hover:bg-muted/30'
              )}
            >
              <Play className={cn('w-4 h-4 shrink-0', scenario === s.value ? 'text-primary' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </button>
          ))}
          <Button onClick={startSim} disabled={!scenario || loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Practice Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Swords className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Practice Session</p>
              <p className="text-[10px] text-muted-foreground">{scenarios.find(s => s.value === scenario)?.label}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={endSimulation} disabled={loading} className="text-xs gap-1">
            <Star className="w-3 h-3" /> End & Score
          </Button>
        </div>
        <div ref={scrollRef} className="h-[350px] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/60 text-foreground border border-border/30 rounded-bl-md'
              )}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
            placeholder="Your negotiation response…"
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendReply} disabled={!input.trim() || loading} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function AnalysisListCard({ title, items, icon: Icon, color }: { title: string; items: string[]; icon: any; color: string }) {
  if (!items?.length) return null;
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={cn('w-4 h-4', color)} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((item: string, i: number) => (
          <p key={i} className="text-sm text-foreground flex items-start gap-2">
            <ArrowRight className={cn('w-3 h-3 mt-1 shrink-0', color)} />
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
  };
}
