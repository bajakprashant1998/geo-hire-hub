import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Send, Bot, User, Sparkles, Building2, DollarSign, TrendingUp,
  BookOpen, Target, MapPin, Loader2, RefreshCw, Lightbulb
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
  color: string;
}

const quickActions: QuickAction[] = [
  { icon: Building2, label: 'Best companies for me', prompt: 'Which companies should I apply to based on my profile? Analyze my skills, experience and location to give me the top 5 best-matching companies with match percentages.', color: 'bg-primary/10 text-primary border-primary/20' },
  { icon: DollarSign, label: 'Salary prediction', prompt: 'What salary can I expect now and in the future? Give me current market range, 2-year and 5-year projections based on my skills and experience.', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { icon: TrendingUp, label: 'Career growth plan', prompt: 'Create a career growth plan for me. Simulate multiple career paths: stay in current role, switch company, learn new skill, change industry. Show salary growth, demand, promotion timeline and risk level for each.', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { icon: BookOpen, label: 'Skills to learn', prompt: 'What skills am I missing? Do a skill gap analysis — tell me what skills to learn, a learning roadmap, estimated time to grow, and career impact of each skill.', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { icon: MapPin, label: 'Nearby jobs', prompt: 'What are the best job opportunities near my location? Include remote opportunities too. Prioritize by match percentage and distance.', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { icon: Target, label: 'Interview readiness', prompt: 'What is my interview success probability for my target roles? Give me a readiness score and specific improvement suggestions.', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
];

const formatMarkdown = (text: string) => {
  // Convert markdown to basic HTML
  let html = text
    // Headers
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-3 mb-1 text-foreground">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-base mt-4 mb-1.5 text-foreground">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="font-bold text-lg mt-4 mb-2 text-foreground">$1</h2>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^- (.*$)/gim, '<li class="ml-4 text-sm leading-relaxed list-disc">$1</li>')
    .replace(/^• (.*$)/gim, '<li class="ml-4 text-sm leading-relaxed list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-sm leading-relaxed list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  
  // Wrap consecutive li items in ul/ol
  html = html.replace(/((?:<li class="ml-4 text-sm leading-relaxed list-disc">.*?<\/li><br\/>?)+)/g, '<ul class="space-y-1 my-2">$1</ul>');
  html = html.replace(/((?:<li class="ml-4 text-sm leading-relaxed list-decimal">.*?<\/li><br\/>?)+)/g, '<ol class="space-y-1 my-2">$1</ol>');
  
  // Tables (simple pipe-delimited)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) return '';
    const isHeader = cells.some(c => c.trim().startsWith('**'));
    const tag = isHeader ? 'th' : 'td';
    const cellHtml = cells.map(c => `<${tag} class="px-2 py-1 border border-border text-xs">${c.trim()}</${tag}>`).join('');
    return `<tr>${cellHtml}</tr>`;
  });

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
      // Remove the user message on error
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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
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
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground gap-1.5 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" />
            New Chat
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Welcome */}
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
                <Bot className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Hey {profile?.full_name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                I'm your AI Career Buddy. I've analyzed your profile and I'm ready to help you with personalized career advice, company recommendations, salary insights, and more.
              </p>
            </div>

            {/* Profile Summary Card */}
            {candidateProfile?.candidate && (
              <Card className="bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5 border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Your Profile Snapshot</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {candidateProfile.candidate.job_title && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        💼 {candidateProfile.candidate.job_title}
                      </Badge>
                    )}
                    {candidateProfile.candidate.experience_years > 0 && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        📊 {candidateProfile.candidate.experience_years}y exp
                      </Badge>
                    )}
                    {candidateProfile.candidate.skills?.length > 0 && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        🛠 {candidateProfile.candidate.skills.length} skills
                      </Badge>
                    )}
                    {candidateProfile.location_city && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        📍 {candidateProfile.location_city}
                      </Badge>
                    )}
                    {candidateProfile.candidate.expected_salary && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        💰 {candidateProfile.candidate.expected_salary}
                      </Badge>
                    )}
                    {candidateProfile.candidate.availability_status && (
                      <Badge variant="secondary" className="justify-start text-xs py-1.5 rounded-lg">
                        ✅ {candidateProfile.candidate.availability_status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Grid */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick actions</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                      action.color
                    )}
                  >
                    <action.icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <Avatar className={cn(
                  "w-8 h-8 shrink-0 mt-0.5",
                  message.role === 'assistant' && "ring-2 ring-primary/20"
                )}>
                  <AvatarFallback className={cn(
                    message.role === 'assistant'
                      ? "bg-gradient-to-br from-primary to-violet-500 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>

                {/* Bubble */}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/60 border border-border/50 rounded-bl-md"
                )}>
                  {message.role === 'assistant' ? (
                    <div
                      className="text-sm leading-relaxed text-foreground prose-sm [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-2 [&_br]:leading-4"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                  <p className={cn(
                    "text-[10px] mt-2 opacity-60",
                    message.role === 'user' ? 'text-right' : 'text-left'
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500 text-primary-foreground">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Quick Actions Bar (when in conversation) */}
      {messages.length > 0 && !isLoading && (
        <div className="py-2 border-t border-border/50">
        <div className="overflow-x-auto">
            <div className="flex gap-1.5 pb-1 min-w-max">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 whitespace-nowrap transition-all shrink-0"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-border">
        <div className={cn(
          "flex items-center gap-2 p-1.5 rounded-full border-2 transition-all duration-200",
          "border-border bg-muted/50 focus-within:border-primary focus-within:bg-background focus-within:shadow-lg focus-within:shadow-primary/10"
        )}>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your career..."
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm pl-4"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "rounded-full h-9 w-9 transition-all duration-200",
              input.trim() && !isLoading
                ? "bg-primary hover:bg-primary/90 shadow-md"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className={cn("w-4 h-4", isLoading && "animate-pulse")} />
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          AI-powered by Gemini • Responses are personalized based on your profile
        </p>
      </form>
    </div>
  );
};
