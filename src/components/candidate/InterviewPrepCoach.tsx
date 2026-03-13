import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  Target, Lightbulb, Trophy, Star, Sparkles, RotateCcw,
  MessageSquare, Award, TrendingUp, ArrowRight, Clock,
  Play, Pause, Volume2, Copy, Share2, BookOpen, Zap,
  BarChart3, Eye, Timer, Mic, ThumbsUp, History, Briefcase,
  GraduationCap, Users, ArrowUpRight, HelpCircle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Question {
  question: string;
  type: string;
  difficulty: string;
  tip: string;
}

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  model_answer: string;
  overall_feedback: string;
}

interface OverallAssessment {
  overall_score: number;
  grade: string;
  summary: string;
  top_strengths: string[];
  key_improvements: string[];
  hiring_likelihood: string;
  next_steps: string[];
}

interface InterviewPrepCoachProps {
  candidateId: string;
}

type Step = 'select-job' | 'questions' | 'review' | 'results';

const ANSWER_TIME_LIMIT = 180; // 3 minutes per question

export const InterviewPrepCoach = ({ candidateId }: InterviewPrepCoachProps) => {
  const [step, setStep] = useState<Step>('select-job');
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<(Feedback | null)[]>([]);
  const [overallAssessment, setOverallAssessment] = useState<OverallAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME_LIMIT);
  const [timerActive, setTimerActive] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [reviewTab, setReviewTab] = useState('summary');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAppliedJobs();
    fetchPastSessions();
  }, [candidateId]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !feedbacks[currentQ]) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, currentQ, feedbacks]);

  // Reset timer when question changes
  useEffect(() => {
    if (step === 'questions' && !feedbacks[currentQ]) {
      setTimeLeft(ANSWER_TIME_LIMIT);
      setTimerActive(true);
    }
  }, [currentQ, step]);

  const fetchAppliedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, job_id, jobs(id, title, description, skills_required, employer_id, employers(company_name))')
        .eq('candidate_id', candidateId)
        .in('status', ['pending', 'reviewing', 'shortlisted'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAppliedJobs(data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchPastSessions = async () => {
    try {
      const { data } = await supabase
        .from('interview_prep_sessions' as any)
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);
      setPastSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    };
  };

  const startPractice = async (job: any) => {
    const jobData = job.jobs;
    setSelectedJob({
      id: jobData.id,
      title: jobData.title,
      description: jobData.description,
      skills: jobData.skills_required,
      companyName: jobData.employers?.company_name,
    });
    setGeneratingQuestions(true);
    setStep('questions');
    setCurrentQ(0);
    setTimerActive(false);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview-prep`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'generate_questions',
            jobTitle: jobData.title,
            companyName: jobData.employers?.company_name,
            jobDescription: jobData.description,
            skills: jobData.skills_required,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to generate questions');
      const data = await res.json();
      setQuestions(data.questions || []);
      setAnswers(new Array(data.questions?.length || 5).fill(''));
      setFeedbacks(new Array(data.questions?.length || 5).fill(null));
      setTimeLeft(ANSWER_TIME_LIMIT);
      setTimerActive(true);
    } catch (err) {
      toast.error('Failed to generate questions. Please try again.');
      setStep('select-job');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const submitAnswer = async () => {
    if (!answers[currentQ]?.trim()) {
      toast.error('Please write your answer before submitting');
      return;
    }

    setTimerActive(false);
    setEvaluating(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview-prep`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'evaluate_answer',
            jobTitle: selectedJob.title,
            companyName: selectedJob.companyName,
            questionIndex: currentQ,
            answer: {
              question: questions[currentQ].question,
              answer: answers[currentQ],
            },
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to evaluate');
      const data = await res.json();
      const newFeedbacks = [...feedbacks];
      newFeedbacks[currentQ] = data.feedback;
      setFeedbacks(newFeedbacks);
      toast.success('Answer evaluated!');
    } catch (err) {
      toast.error('Failed to evaluate answer. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const finishInterview = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const qaData = questions.map((q, i) => ({
        question: q.question,
        type: q.type,
        answer: answers[i],
        feedback: feedbacks[i],
      }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-interview-prep`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'overall_assessment',
            jobTitle: selectedJob.title,
            companyName: selectedJob.companyName,
            answer: qaData,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to assess');
      const data = await res.json();
      setOverallAssessment(data.assessment);
      setStep('results');

      // Save session
      await supabase.from('interview_prep_sessions' as any).insert({
        candidate_id: candidateId,
        job_id: selectedJob.id,
        job_title: selectedJob.title,
        company_name: selectedJob.companyName,
        questions: questions,
        answers: answers,
        feedback: feedbacks,
        overall_score: data.assessment?.overall_score,
        status: 'completed',
      } as any);

      toast.success('Interview practice completed! 🎉');
    } catch (err) {
      toast.error('Failed to generate overall assessment.');
    } finally {
      setLoading(false);
    }
  };

  const resetPractice = () => {
    setStep('select-job');
    setSelectedJob(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswers([]);
    setFeedbacks([]);
    setOverallAssessment(null);
    setTimerActive(false);
    fetchPastSessions();
  };

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const shareResults = async () => {
    if (!overallAssessment) return;
    const text = `🎯 Interview Prep Results\n\nJob: ${selectedJob?.title} at ${selectedJob?.companyName}\nScore: ${overallAssessment.overall_score}/100 (Grade: ${overallAssessment.grade})\nHiring Likelihood: ${overallAssessment.hiring_likelihood}\n\nPracticed on HireForJob.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Interview Prep Results', text, url: window.location.href });
        return;
      } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    navigator.clipboard.writeText(text);
    toast.success('Results copied! Share with your network.');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (d === 'medium') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
  };

  const typeConfig = (t: string) => {
    const config = {
      behavioral: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      technical: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      situational: { icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      cultural: { icon: Users, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    };
    return config[t as keyof typeof config] || { icon: Star, color: 'text-primary', bg: 'bg-primary/10' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 6) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-emerald-500/15 border-emerald-500/30';
    if (score >= 6) return 'bg-amber-500/15 border-amber-500/30';
    return 'bg-rose-500/15 border-rose-500/30';
  };

  // Calculate stats
  const answeredCount = feedbacks.filter(f => f !== null).length;
  const avgScore = feedbacks.filter(f => f !== null).reduce((acc, f) => acc + (f?.score || 0), 0) / (answeredCount || 1);

  // Step 1: Select Job
  if (step === 'select-job') {
    const totalSessions = pastSessions.length;
    const avgSessionScore = pastSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / (totalSessions || 1);
    const bestScore = Math.max(...pastSessions.map(s => s.overall_score || 0), 0);

    return (
      <div className="space-y-6">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground mb-1">AI Interview Coach</h2>
              <p className="text-sm text-muted-foreground">
                Practice real interview questions tailored to your job applications. Get instant AI feedback to improve your answers.
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          {totalSessions > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border border-border/40 text-center">
                <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sessions</p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border border-border/40 text-center">
                <p className="text-2xl font-bold text-foreground">{Math.round(avgSessionScore)}%</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Score</p>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border border-border/40 text-center">
                <p className="text-2xl font-bold text-primary">{bestScore}%</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Best Score</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* How It Works */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, icon: Briefcase, label: 'Select Job' },
                { step: 2, icon: MessageSquare, label: 'Answer Questions' },
                { step: 3, icon: Sparkles, label: 'Get AI Feedback' },
                { step: 4, icon: Trophy, label: 'View Results' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className={cn(
                    "w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center",
                    "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20"
                  )}>
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-warning" />
                Recent Practice Sessions
                <Badge variant="secondary" className="ml-auto text-xs">{pastSessions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {pastSessions.slice(0, 5).map((s: any, i: number) => (
                <motion.div 
                  key={s.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.job_title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" />
                      {s.company_name}
                      <span className="text-muted-foreground/50">•</span>
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {s.overall_score && (
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-sm border",
                      s.overall_score >= 70 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                      s.overall_score >= 50 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                      "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    )}>
                      {s.overall_score}%
                    </div>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Job Selection */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Select a Job to Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {jobsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading your applications...</p>
              </div>
            ) : appliedJobs.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No Active Applications</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Apply to some jobs first, then come back to practice interview questions tailored to those positions.
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => window.location.href = '/browse-jobs'}>
                  <Briefcase className="w-4 h-4" /> Browse Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {appliedJobs.map((app, i) => (
                  <motion.button
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => startPractice(app)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/25 transition-colors">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {app.jobs?.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{app.jobs?.employers?.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] hidden sm:flex">
                        <Play className="w-3 h-3 mr-1" /> Practice
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Questions & Answers
  if (step === 'questions') {
    if (generatingQuestions) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity }
            }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-xl shadow-primary/25"
          >
            <Brain className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground mb-2">Preparing Your Interview</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
            AI is analyzing the job description and crafting tailored questions for <span className="font-semibold text-foreground">{selectedJob?.title}</span>
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Generating 5 interview questions...</span>
          </div>
        </div>
      );
    }

    const currentQuestion = questions[currentQ];
    const currentFeedback = feedbacks[currentQ];
    const progress = ((answeredCount) / questions.length) * 100;
    const allAnswered = feedbacks.every((f) => f !== null);
    const TypeIcon = typeConfig(currentQuestion?.type).icon;
    const timerWarning = timeLeft <= 30;
    const timerDanger = timeLeft <= 10;

    return (
      <div className="space-y-4">
        {/* Header with Progress */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetPractice} className="h-8 px-2">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground truncate">{selectedJob?.title}</h2>
                <p className="text-[10px] text-muted-foreground truncate">{selectedJob?.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Timer */}
              {!currentFeedback && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all",
                        timerDanger ? "bg-rose-500/15 text-rose-500 animate-pulse" :
                        timerWarning ? "bg-amber-500/15 text-amber-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        <Timer className="w-3.5 h-3.5" />
                        {formatTime(timeLeft)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Time remaining for this question</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline" className="font-mono text-xs">
                Q{currentQ + 1}/{questions.length}
              </Badge>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground font-medium">{answeredCount}/{questions.length}</span>
          </div>
        </div>

        {/* Question dots navigation */}
        <div className="flex justify-center gap-2 py-1">
          {questions.map((q, i) => (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCurrentQ(i)}
                    className={cn(
                      "w-8 h-8 rounded-lg border transition-all flex items-center justify-center text-xs font-bold",
                      i === currentQ ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg shadow-primary/25" :
                      feedbacks[i] ? (
                        (feedbacks[i]?.score || 0) >= 7 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
                        (feedbacks[i]?.score || 0) >= 5 ? "bg-amber-500/15 text-amber-600 border-amber-500/30" :
                        "bg-rose-500/15 text-rose-600 border-rose-500/30"
                      ) : "bg-muted/50 text-muted-foreground border-border/40 hover:border-primary/40"
                    )}
                  >
                    {feedbacks[i] ? feedbacks[i]?.score : i + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{q.type} - {q.difficulty}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/40 bg-card/90 backdrop-blur-sm overflow-hidden">
              {/* Question Type Header */}
              <div className={cn(
                "px-4 py-2 flex items-center gap-2 border-b border-border/30",
                typeConfig(currentQuestion?.type).bg
              )}>
                <TypeIcon className={cn("w-4 h-4", typeConfig(currentQuestion?.type).color)} />
                <span className="text-xs font-semibold capitalize">{currentQuestion?.type} Question</span>
                <Badge className={cn("text-[10px] border ml-auto", difficultyColor(currentQuestion?.difficulty))}>
                  {currentQuestion?.difficulty}
                </Badge>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Question */}
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground leading-relaxed">
                    {currentQuestion?.question}
                  </p>
                </div>

                {/* Tip Toggle */}
                {currentQuestion?.tip && (
                  <div className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    showTip ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/30"
                  )}>
                    <button 
                      onClick={() => setShowTip(!showTip)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left"
                    >
                      <Lightbulb className={cn("w-4 h-4 transition-colors", showTip ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-medium text-foreground flex-1">Interview Tip</span>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showTip && "rotate-90")} />
                    </button>
                    <AnimatePresence>
                      {showTip && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-3 pb-3"
                        >
                          <p className="text-xs text-muted-foreground pl-6">{currentQuestion?.tip}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Answer Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Your Answer</label>
                    {!currentFeedback && (
                      <span className={cn(
                        "text-[10px] font-medium",
                        (answers[currentQ]?.length || 0) > 50 ? "text-muted-foreground" : "text-amber-500"
                      )}>
                        {answers[currentQ]?.length || 0} characters
                      </span>
                    )}
                  </div>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type your answer here... Be specific and use the STAR method (Situation, Task, Action, Result) for behavioral questions."
                    value={answers[currentQ] || ''}
                    onChange={(e) => {
                      const newAnswers = [...answers];
                      newAnswers[currentQ] = e.target.value;
                      setAnswers(newAnswers);
                    }}
                    rows={6}
                    className={cn(
                      "resize-none border-border/40 text-sm",
                      currentFeedback ? "bg-muted/30" : "bg-background"
                    )}
                    disabled={!!currentFeedback}
                  />
                </div>

                {/* Submit or Feedback */}
                {!currentFeedback ? (
                  <Button
                    onClick={submitAnswer}
                    disabled={evaluating || !answers[currentQ]?.trim()}
                    className="w-full gap-2 h-11"
                    size="lg"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your answer...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit & Get AI Feedback
                      </>
                    )}
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Score Header */}
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border",
                      getScoreBg(currentFeedback.score)
                    )}>
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl border",
                        getScoreBg(currentFeedback.score),
                        getScoreColor(currentFeedback.score)
                      )}>
                        {currentFeedback.score}/10
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-0.5">
                          {currentFeedback.score >= 8 ? '🎯 Excellent Answer!' :
                           currentFeedback.score >= 6 ? '👍 Good Answer' :
                           '💪 Keep Practicing'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{currentFeedback.overall_feedback}</p>
                      </div>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentFeedback.strengths?.length > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> What You Did Well
                          </p>
                          <ul className="space-y-1">
                            {currentFeedback.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">✓</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentFeedback.improvements?.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Room to Improve
                          </p>
                          <ul className="space-y-1">
                            {currentFeedback.improvements.map((s, i) => (
                              <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Model Answer */}
                    {currentFeedback.model_answer && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 relative">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" /> Example Strong Answer
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => copyToClipboard(currentFeedback.model_answer, currentQ)}
                          >
                            {copiedIndex === currentQ ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{currentFeedback.model_answer}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          {currentQ < questions.length - 1 ? (
            <Button
              variant={currentFeedback ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentQ(currentQ + 1)}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : allAnswered ? (
            <Button onClick={finishInterview} disabled={loading} className="gap-2" size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Complete Interview
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Answer all questions to finish
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Results
  if (step === 'results' && overallAssessment) {
    const likelihoodConfig = {
      likely: { color: 'text-emerald-500', bg: 'bg-emerald-500/15 border-emerald-500/30', label: '🟢 Strong Candidate', icon: ThumbsUp },
      possible: { color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/30', label: '🟡 Good Potential', icon: TrendingUp },
      needs_work: { color: 'text-rose-500', bg: 'bg-rose-500/15 border-rose-500/30', label: '🔴 More Practice Needed', icon: GraduationCap },
    };
    const likelihood = likelihoodConfig[overallAssessment.hiring_likelihood as keyof typeof likelihoodConfig] || likelihoodConfig.needs_work;

    return (
      <div className="space-y-5">
        {/* Score Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
          
          <div className="relative">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">Interview Results</p>
            
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={264}
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 - (264 * overallAssessment.overall_score / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-4xl font-black text-foreground"
                >
                  {overallAssessment.overall_score}
                </motion.span>
                <span className="text-xs text-muted-foreground font-medium">out of 100</span>
              </div>
            </div>

            <Badge className="text-lg px-5 py-1.5 font-bold bg-primary/15 text-primary border-primary/30 mb-3">
              Grade: {overallAssessment.grade}
            </Badge>

            <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border", likelihood.bg)}>
              <likelihood.icon className={cn("w-4 h-4", likelihood.color)} />
              <span className={cn("text-sm font-semibold", likelihood.color)}>{likelihood.label}</span>
            </div>
          </div>
        </motion.div>

        {/* Job Info */}
        <Card className="border-border/40 bg-card/70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{selectedJob?.title}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedJob?.companyName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed results */}
        <Tabs value={reviewTab} onValueChange={setReviewTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="summary" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs gap-1">
              <Eye className="w-3.5 h-3.5" /> Details
            </TabsTrigger>
            <TabsTrigger value="next" className="text-xs gap-1">
              <ArrowRight className="w-3.5 h-3.5" /> Next Steps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <Card className="border-border/40 bg-card/70">
              <CardContent className="p-4">
                <p className="text-sm text-foreground leading-relaxed">{overallAssessment.summary}</p>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Top Strengths
                  </p>
                  {overallAssessment.top_strengths?.map((s, i) => (
                    <p key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <span className="text-emerald-500">✓</span> {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Key Improvements
                  </p>
                  {overallAssessment.key_improvements?.map((s, i) => (
                    <p key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <span className="text-amber-500">→</span> {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground mb-2">Review your answers and AI feedback for each question:</p>
            {questions.map((q, i) => (
              <Card key={i} className="border-border/40 bg-card/70">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Q{i + 1}</Badge>
                      <Badge className={cn("text-[10px] border", difficultyColor(q.difficulty))}>
                        {q.difficulty}
                      </Badge>
                    </div>
                    {feedbacks[i] && (
                      <div className={cn(
                        "px-2 py-0.5 rounded-md font-bold text-xs border",
                        getScoreBg(feedbacks[i]?.score || 0),
                        getScoreColor(feedbacks[i]?.score || 0)
                      )}>
                        {feedbacks[i]?.score}/10
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Your Answer</p>
                    <p className="text-xs text-foreground/80 line-clamp-3">{answers[i] || 'Not answered'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="next" className="space-y-3 mt-4">
            {overallAssessment.next_steps?.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-bold text-primary flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Recommended Actions
                  </p>
                  {overallAssessment.next_steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/30">
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <p className="text-xs text-foreground/90 flex-1">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-border/40 bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Practice more to improve your interview skills:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={resetPractice} className="gap-2 text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Same Job
                  </Button>
                  <Button variant="outline" onClick={() => { resetPractice(); }} className="gap-2 text-xs">
                    <Briefcase className="w-3.5 h-3.5" /> New Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={shareResults} className="flex-1 gap-2">
            <Share2 className="w-4 h-4" /> Share Results
          </Button>
          <Button onClick={resetPractice} className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
