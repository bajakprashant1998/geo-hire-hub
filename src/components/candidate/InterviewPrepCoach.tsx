import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  Target, Lightbulb, Trophy, Star, Sparkles, RotateCcw,
  MessageSquare, Award, TrendingUp, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    fetchAppliedJobs();
    fetchPastSessions();
  }, [candidateId]);

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
        .limit(5);
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

      toast.success('Interview practice completed!');
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
    fetchPastSessions();
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-success/15 text-success border-success/30';
    if (d === 'medium') return 'bg-warning/15 text-warning-foreground border-warning/30';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };

  const typeIcon = (t: string) => {
    if (t === 'behavioral') return <MessageSquare className="w-3.5 h-3.5" />;
    if (t === 'technical') return <Brain className="w-3.5 h-3.5" />;
    if (t === 'situational') return <Target className="w-3.5 h-3.5" />;
    return <Star className="w-3.5 h-3.5" />;
  };

  // Step 1: Select Job
  if (step === 'select-job') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Interview Prep Coach</h2>
            <p className="text-sm text-muted-foreground">Practice with AI-generated questions tailored to your applications</p>
          </div>
        </div>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning-foreground" />
                Recent Practice Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pastSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.job_title}</p>
                    <p className="text-xs text-muted-foreground">{s.company_name} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  {s.overall_score && (
                    <Badge variant="secondary" className="font-bold">{s.overall_score}%</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Job Selection */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Select a job to practice for</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : appliedJobs.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active applications found.</p>
                <p className="text-xs text-muted-foreground mt-1">Apply to jobs first, then come back to practice!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appliedJobs.map((app) => (
                  <motion.button
                    key={app.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => startPractice(app)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{app.jobs?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.jobs?.employers?.company_name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
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
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-xl shadow-primary/20"
          >
            <Brain className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h3 className="text-lg font-bold text-foreground mb-2">Preparing Your Interview</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            AI is analyzing the job description and crafting tailored questions for <span className="font-semibold text-foreground">{selectedJob?.title}</span>...
          </p>
        </div>
      );
    }

    const currentQuestion = questions[currentQ];
    const currentFeedback = feedbacks[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;
    const allAnswered = feedbacks.every((f) => f !== null);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{selectedJob?.title}</h2>
            <p className="text-xs text-muted-foreground">{selectedJob?.companyName}</p>
          </div>
          <Badge variant="outline" className="font-mono">
            {currentQ + 1}/{questions.length}
          </Badge>
        </div>

        <Progress value={progress} className="h-1.5" />

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-border/40 bg-card/90 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                {/* Question meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs gap-1">
                    {typeIcon(currentQuestion?.type)}
                    {currentQuestion?.type}
                  </Badge>
                  <Badge className={cn("text-xs border", difficultyColor(currentQuestion?.difficulty))}>
                    {currentQuestion?.difficulty}
                  </Badge>
                </div>

                {/* Question */}
                <p className="text-base font-semibold text-foreground leading-relaxed">
                  {currentQuestion?.question}
                </p>

                {/* Tip */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{currentQuestion?.tip}</p>
                </div>

                {/* Answer */}
                <Textarea
                  placeholder="Type your answer here... Be specific and use examples."
                  value={answers[currentQ] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[currentQ] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  rows={5}
                  className="resize-none bg-muted/30 border-border/40"
                  disabled={!!currentFeedback}
                />

                {/* Submit or Feedback */}
                {!currentFeedback ? (
                  <Button
                    onClick={submitAnswer}
                    disabled={evaluating || !answers[currentQ]?.trim()}
                    className="w-full gap-2"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Evaluating your answer...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit & Get Feedback
                      </>
                    )}
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Score */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                        currentFeedback.score >= 7 ? "bg-success/15 text-success" :
                        currentFeedback.score >= 5 ? "bg-warning/15 text-warning-foreground" :
                        "bg-destructive/15 text-destructive"
                      )}>
                        {currentFeedback.score}/10
                      </div>
                      <p className="text-sm text-foreground flex-1">{currentFeedback.overall_feedback}</p>
                    </div>

                    {/* Strengths */}
                    {currentFeedback.strengths?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                        </p>
                        {currentFeedback.strengths.map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground pl-5">• {s}</p>
                        ))}
                      </div>
                    )}

                    {/* Improvements */}
                    {currentFeedback.improvements?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-warning-foreground flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> To Improve
                        </p>
                        {currentFeedback.improvements.map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground pl-5">• {s}</p>
                        ))}
                      </div>
                    )}

                    {/* Model Answer */}
                    {currentFeedback.model_answer && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                        <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Strong Answer Example
                        </p>
                        <p className="text-xs text-muted-foreground">{currentFeedback.model_answer}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          {currentQ < questions.length - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentQ(currentQ + 1)}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : allAnswered ? (
            <Button onClick={finishInterview} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Finish & Get Results
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Answer all questions to finish</p>
          )}
        </div>

        {/* Question dots */}
        <div className="flex justify-center gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i === currentQ ? "bg-primary scale-125" :
                feedbacks[i] ? "bg-success/60" : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // Step 3: Results
  if (step === 'results' && overallAssessment) {
    const likelihoodColor = overallAssessment.hiring_likelihood === 'likely'
      ? 'text-success' : overallAssessment.hiring_likelihood === 'possible'
      ? 'text-warning-foreground' : 'text-destructive';

    return (
      <div className="space-y-5">
        {/* Score Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <div className="relative w-28 h-28 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * overallAssessment.overall_score / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-foreground">{overallAssessment.overall_score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <Badge className="text-lg px-4 py-1 font-bold bg-primary/15 text-primary border-primary/30">
            Grade: {overallAssessment.grade}
          </Badge>
          <p className={cn("text-sm font-semibold mt-2", likelihoodColor)}>
            Hiring Likelihood: {overallAssessment.hiring_likelihood === 'likely' ? '🟢 Likely' :
            overallAssessment.hiring_likelihood === 'possible' ? '🟡 Possible' : '🔴 Needs Work'}
          </p>
        </motion.div>

        {/* Summary */}
        <Card className="border-border/40 bg-card/70">
          <CardContent className="p-4">
            <p className="text-sm text-foreground">{overallAssessment.summary}</p>
          </CardContent>
        </Card>

        {/* Strengths & Improvements */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-bold text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Top Strengths
              </p>
              {overallAssessment.top_strengths?.map((s, i) => (
                <p key={i} className="text-xs text-foreground/80">✓ {s}</p>
              ))}
            </CardContent>
          </Card>
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-bold text-warning-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Key Improvements
              </p>
              {overallAssessment.key_improvements?.map((s, i) => (
                <p key={i} className="text-xs text-foreground/80">→ {s}</p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        {overallAssessment.next_steps?.length > 0 && (
          <Card className="border-border/40 bg-card/70">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4" /> Next Steps
              </p>
              {overallAssessment.next_steps.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground">{i + 1}. {s}</p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={resetPractice} variant="outline" className="flex-1 gap-2">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Button>
          <Button onClick={() => { setStep('select-job'); setOverallAssessment(null); }} className="flex-1 gap-2">
            <Brain className="w-4 h-4" /> New Job
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
