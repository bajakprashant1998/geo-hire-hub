import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Send, Bot, User, Sparkles, Building2, DollarSign, TrendingUp,
  BookOpen, Target, MapPin, Loader2, RefreshCw, Lightbulb,
  BriefcaseBusiness, GraduationCap, Zap, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt: string;
  gradient: string;
  iconBg: string;
}

const quickActions: QuickAction[] = [
  {
    icon: Building2, label: 'Best companies for me',
    prompt: 'Which companies should I apply to based on my profile? Analyze my skills, experience and location to give me the top 5 best-matching companies with match percentages.',
    gradient: 'from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40',
    iconBg: 'bg-primary/15 text-primary',
  },
  {
    icon: DollarSign, label: 'Salary prediction',
    prompt: 'What salary can I expect now and in the future? Give me current market range, 2-year and 5-year projections based on my skills and experience.',
    gradient: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
  },
  {
    icon: TrendingUp, label: 'Career growth plan',
    prompt: 'Create a career growth plan for me. Simulate multiple career paths: stay in current role, switch company, learn new skill, change industry. Show salary growth, demand, promotion timeline and risk level for each.',
    gradient: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/15 text-amber-600',
  },
  {
    icon: BookOpen, label: 'Skills to learn',
    prompt: 'What skills am I missing? Do a skill gap analysis — tell me what skills to learn, a learning roadmap, estimated time to grow, and career impact of each skill.',
    gradient: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
    iconBg: 'bg-violet-500/15 text-violet-600',
  },
  {
    icon: MapPin, label: 'Nearby jobs',
    prompt: 'What are the best job opportunities near my location? Include remote opportunities too. Prioritize by match percentage and distance.',
    gradient: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40',
    iconBg: 'bg-rose-500/15 text-rose-600',
  },
  {
    icon: Target, label: 'Interview readiness',
    prompt: 'What is my interview success probability for my target roles? Give me a readiness score and specific improvement suggestions.',
    gradient: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40',
    iconBg: 'bg-cyan-500/15 text-cyan-600',
  },
];

const formatMarkdown = (text: string) => {
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted/80 border border-border/60 rounded-xl p-3 my-3 overflow-x-auto text-xs font-mono leading-relaxed"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded-md text-xs font-mono text-primary">$1</code>')
    // Headers
    .replace(/^#### (.*$)/gim, '<h5 class="font-bold text-[13px] mt-3 mb-1 text-foreground flex items-center gap-1.5">$1</h5>')
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-4 mb-1.5 text-foreground flex items-center gap-1.5"><span class="w-1 h-4 rounded-full bg-primary inline-block"></span>$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-[15px] mt-5 mb-2 text-foreground border-b border-border/40 pb-1.5">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="font-bold text-base mt-5 mb-2 text-foreground">$1</h2>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary font-semibold no-underline bg-primary/8 hover:bg-primary/15 px-2 py-0.5 rounded-md transition-all duration-200 text-[13px]">$1 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
    // Horizontal rule
    .replace(/^---$/gim, '<hr class="my-4 border-border/40" />')
    // Bullet points
    .replace(/^- (.*$)/gim, '<li class="ml-1 pl-2 text-[13px] leading-[1.7] text-foreground relative before:content-[\'•\'] before:absolute before:-left-3 before:text-primary before:font-bold">$1</li>')
    .replace(/^• (.*$)/gim, '<li class="ml-1 pl-2 text-[13px] leading-[1.7] text-foreground relative before:content-[\'•\'] before:absolute before:-left-3 before:text-primary before:font-bold">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-1 pl-2 text-[13px] leading-[1.7] list-decimal text-foreground">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mt-2.5">')
    .replace(/\n/g, '<br/>');

  // Wrap lists
  html = html.replace(/((?:<li class="ml-1 pl-2 text-\[13px\] leading-\[1\.7\] text-foreground\/90 relative before:content-\[\'•\'\].*?<\/li>(?:<br\/>)?)+)/g,
    '<ul class="space-y-1 my-2.5 ml-4">$1</ul>');
  html = html.replace(/((?:<li class="ml-1 pl-2 text-\[13px\] leading-\[1\.7\] list-decimal.*?<\/li>(?:<br\/>)?)+)/g,
    '<ol class="space-y-1 my-2.5 ml-5 list-decimal">$1</ol>');

  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) return '';
    const isHeader = cells.some(c => c.trim().startsWith('**'));
    const tag = isHeader ? 'th' : 'td';
    const cls = isHeader
      ? 'px-3 py-2 text-[11px] font-semibold text-foreground bg-muted/60 border-b border-border/60 text-left'
      : 'px-3 py-2 text-[12px] text-foreground/80 border-b border-border/30';
    const cellHtml = cells.map(c => `<${tag} class="${cls}">${c.trim()}</${tag}>`).join('');
    return `<tr class="hover:bg-muted/30 transition-colors">${cellHtml}</tr>`;
  });

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  return html;
};

export const CareerBuddyChat = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch candidate profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!profile) return;
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (candidate) {
        setCandidateProfile({
          ...profile,
          candidate,
        });
      }
    };
    fetchProfile();
  }, [profile]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-career-buddy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: chatHistory,
            candidateProfile,
            siteUrl: window.location.origin,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Sorry, I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Career buddy error:', error);
      toast.error('Failed to get AI response. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, candidateProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleReset = () => {
    setMessages([]);
  };

  const profileItems = [
    { icon: BriefcaseBusiness, label: candidateProfile?.candidate?.job_title, show: !!candidateProfile?.candidate?.job_title },
    { icon: GraduationCap, label: `${candidateProfile?.candidate?.experience_years || 0}y experience`, show: (candidateProfile?.candidate?.experience_years || 0) > 0 },
    { icon: Zap, label: `${candidateProfile?.candidate?.skills?.length || 0} skills`, show: (candidateProfile?.candidate?.skills?.length || 0) > 0 },
    { icon: MapPin, label: candidateProfile?.location_city, show: !!candidateProfile?.location_city },
    { icon: DollarSign, label: candidateProfile?.candidate?.expected_salary, show: !!candidateProfile?.candidate?.expected_salary },
    { icon: Globe, label: candidateProfile?.candidate?.availability_status, show: !!candidateProfile?.candidate?.availability_status },
  ].filter(i => i.show);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-h-[850px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              Talk to My Buddy
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs text-muted-foreground">AI Career Companion • Always online</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground gap-1.5 rounded-xl text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            New Chat
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-5 scroll-smooth px-1">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Welcome */}
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/25 ring-4 ring-primary/10"
              >
                <Bot className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-foreground mb-3"
              >
                Hey {profile?.full_name?.split(' ')[0] || 'there'}! 👋
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed"
              >
                I'm your AI Career Buddy. I've analyzed your profile and I'm ready to help you with
                <span className="text-primary font-medium"> personalized career advice</span>,
                <span className="text-emerald-600 font-medium"> company recommendations</span>,
                <span className="text-amber-600 font-medium"> salary insights</span>, and more.
              </motion.p>
            </div>

            {/* Profile Summary Card */}
            {candidateProfile?.candidate && profileItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 border-primary/15 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Your Profile Snapshot</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {profileItems.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                        >
                          <Badge
                            variant="secondary"
                            className="w-full justify-start text-xs py-2 px-3 rounded-xl gap-2 bg-background/80 border border-border/40 hover:border-primary/30 transition-colors"
                          >
                            <item.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Quick Actions Grid */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                ⚡ Quick actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickActions.map((action, i) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    onClick={() => handleQuickAction(action.prompt)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-300",
                      "hover:shadow-lg hover:scale-[1.03] active:scale-[0.97] bg-gradient-to-br",
                      action.gradient
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", action.iconBg)}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message, idx) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: idx > messages.length - 3 ? 0.05 : 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <Avatar className={cn(
                  "w-9 h-9 shrink-0 mt-1",
                  message.role === 'assistant' && "ring-2 ring-primary/20 shadow-sm"
                )}>
                  <AvatarFallback className={cn(
                    "text-xs",
                    message.role === 'assistant'
                      ? "bg-gradient-to-br from-primary to-violet-500 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}>
                    {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div className={cn(
                  "max-w-[88%] rounded-2xl transition-all",
                  message.role === 'user'
                    ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-lg px-5 py-3 shadow-md shadow-primary/15"
                    : "bg-muted/50 border border-border rounded-bl-lg px-5 py-4 shadow-sm"
                )}>
                  {message.role === 'assistant' ? (
                    <div
                      className={cn(
                        "text-[13.5px] leading-[1.75] text-foreground",
                        "[&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground [&_h5]:text-foreground",
                        "[&_strong]:text-foreground [&_strong]:font-semibold",
                        "[&_a]:no-underline",
                        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-border/40",
                        "[&_pre]:my-3",
                        "[&_p]:text-foreground [&_p]:text-[13.5px] [&_p]:leading-[1.75]",
                        "[&_li]:text-foreground [&_ul]:list-none [&_ol]:pl-5",
                        "[&_hr]:my-4 [&_hr]:border-border/40"
                      )}
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                  )}
                  <p className={cn(
                    "text-[10px] mt-3 font-medium",
                    message.role === 'user' ? 'text-right text-primary-foreground/50' : 'text-left text-muted-foreground/50'
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="w-9 h-9 ring-2 ring-primary/20 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500 text-primary-foreground">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-border/60 rounded-2xl rounded-bl-lg px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">Analyzing your profile...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Quick Actions Bar (when in conversation) */}
      {messages.length > 0 && !isLoading && (
        <div className="py-2.5 border-t border-border/40">
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-1 min-w-max">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/50 bg-card/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 whitespace-nowrap transition-all duration-200 shrink-0"
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-border/60">
        <div className={cn(
          "flex items-center gap-2 p-1.5 rounded-2xl border-2 transition-all duration-300",
          "border-border/60 bg-muted/30 focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-xl focus-within:shadow-primary/10"
        )}>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your career..."
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-11 text-sm pl-4 placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "rounded-xl h-10 w-10 transition-all duration-300",
              input.trim() && !isLoading
                ? "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className={cn("w-4 h-4", isLoading && "animate-pulse")} />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary/40" />
            <p className="text-[10px] text-muted-foreground/50 font-medium">
              AI-powered by Gemini • Responses are personalized based on your profile
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
