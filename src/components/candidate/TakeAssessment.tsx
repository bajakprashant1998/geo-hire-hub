import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle2, XCircle, Loader2, ArrowRight, ArrowLeft, Trophy, AlertTriangle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation: string | null;
  sort_order: number;
}

interface TakeAssessmentProps {
  assessmentId: string;
  jobId?: string;
  candidateId: string;
  onComplete?: () => void;
}

export const TakeAssessment = ({ assessmentId, jobId, candidateId, onComplete }: TakeAssessmentProps) => {
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const startedAt = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const load = async () => {
      const [{ data: a }, { data: q }] = await Promise.all([
        supabase.from('skill_assessments').select('*').eq('id', assessmentId).single(),
        supabase.from('assessment_questions').select('*').eq('assessment_id', assessmentId).order('sort_order'),
      ]);
      if (a) setAssessment(a);
      if (q) setQuestions(q.map((qn: any) => ({ ...qn, options: Array.isArray(qn.options) ? qn.options : [] })));
      if (a?.time_limit_minutes) setTimeLeft(a.time_limit_minutes * 60);
      setLoading(false);
    };
    load();
  }, [assessmentId]);

  // Timer
  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0 || result) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, result]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let score = 0;
      let maxScore = 0;
      const answerEntries = questions.map(q => {
        maxScore += q.points;
        const userAnswer = answers[q.id] || '';
        const correct = userAnswer === q.correct_answer;
        if (correct) score += q.points;
        return { question_id: q.id, answer: userAnswer, correct };
      });

      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = percentage >= (assessment?.passing_score || 70);
      const timeTaken = timeLeft !== null && assessment?.time_limit_minutes
        ? assessment.time_limit_minutes * 60 - timeLeft
        : null;

      await supabase.from('assessment_results').insert({
        assessment_id: assessmentId,
        candidate_id: candidateId,
        job_id: jobId || null,
        score,
        max_score: maxScore,
        percentage,
        passed,
        answers: answerEntries as any,
        started_at: startedAt.current,
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTaken,
      });

      setResult({ score, maxScore, percentage, passed });
      toast.success(passed ? 'Congratulations! You passed!' : 'Assessment completed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions, assessment, timeLeft, assessmentId, candidateId, jobId, submitting]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!assessment || questions.length === 0) return <p className="text-center text-muted-foreground p-8">Assessment not found or has no questions.</p>;

  // Result screen
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="max-w-lg mx-auto shadow-google">
          <CardContent className="p-8 text-center space-y-4">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${result.passed ? 'bg-emerald-500/15' : 'bg-destructive/15'}`}>
              {result.passed ? <Trophy className="w-10 h-10 text-emerald-600" /> : <XCircle className="w-10 h-10 text-destructive" />}
            </div>
            <h2 className="text-2xl font-bold">{result.passed ? 'You Passed! 🎉' : 'Not Passed'}</h2>
            <p className="text-muted-foreground">{assessment.title}</p>
            <div className="text-4xl font-bold text-foreground">{result.percentage}%</div>
            <Progress value={result.percentage} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {result.score}/{result.maxScore} points • Passing: {assessment.passing_score || 70}%
            </p>
            {onComplete && (
              <Button onClick={onComplete} className="rounded-xl mt-4">Done</Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <Card className="max-w-lg mx-auto shadow-google">
        <CardHeader className="text-center">
          <CardTitle>{assessment.title}</CardTitle>
          <CardDescription>{assessment.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold">{assessment.time_limit_minutes || '∞'}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold">{assessment.passing_score || 70}%</p>
              <p className="text-xs text-muted-foreground">To Pass</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">Difficulty: {assessment.difficulty || 'Medium'}</Badge>
          <Button onClick={() => { setStarted(true); startedAt.current = new Date().toISOString(); }} className="w-full rounded-xl">
            Start Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Timer + Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">Question {currentIndex + 1}/{questions.length}</p>
        {timeLeft !== null && (
          <Badge variant={timeLeft < 60 ? 'destructive' : 'secondary'} className="gap-1 text-sm">
            <Timer className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>
      <Progress value={progress} className="h-2" />

      <AnimatePresence mode="wait">
        <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="shadow-google">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-semibold">{currentQ.question_text}</h3>
              <RadioGroup value={answers[currentQ.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [currentQ.id]: v }))}>
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: String(opt) }))}>
                      <RadioGroupItem value={String(opt)} id={`${currentQ.id}-${i}`} />
                      <Label htmlFor={`${currentQ.id}-${i}`} className="flex-1 cursor-pointer">{String(opt)}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)} className="rounded-xl gap-1">
          <ArrowLeft className="w-4 h-4" /> Previous
        </Button>
        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(i => i + 1)} className="rounded-xl gap-1">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit
          </Button>
        )}
      </div>

      {/* Answered count */}
      <p className="text-xs text-center text-muted-foreground">
        {Object.keys(answers).length}/{questions.length} answered
      </p>
    </div>
  );
};
