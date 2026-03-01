import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ClipboardCheck, Plus, Clock, Target, Users, Loader2, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  skill_category: string;
  difficulty: string;
  time_limit_minutes: number;
  passing_score: number;
  is_active: boolean;
  total_attempts: number;
  avg_score: number;
  created_at: string;
}

interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation: string;
  sort_order: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-red-100 text-red-800',
};

export const SkillAssessmentManager = ({ employerId }: { employerId: string }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', skill_category: '', difficulty: 'intermediate',
    time_limit_minutes: 30, passing_score: 70,
  });
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchAssessments();
  }, [employerId]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '', question_type: 'multiple_choice',
      options: ['', '', '', ''], correct_answer: '',
      points: 1, explanation: '', sort_order: prev.length,
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.map((o, j) => j === oIndex ? value : o) } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.skill_category.trim()) { toast.error('Skill category is required'); return; }
    if (questions.length === 0) { toast.error('Add at least one question'); return; }

    setSaving(true);
    try {
      const { data: assessment, error } = await supabase
        .from('skill_assessments')
        .insert({
          employer_id: employerId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          skill_category: form.skill_category.trim(),
          difficulty: form.difficulty,
          time_limit_minutes: form.time_limit_minutes,
          passing_score: form.passing_score,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert questions
      const questionsData = questions.map((q, i) => ({
        assessment_id: assessment.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options.filter(o => o.trim()),
        correct_answer: q.correct_answer,
        points: q.points,
        explanation: q.explanation || null,
        sort_order: i,
      }));

      const { error: qError } = await supabase.from('assessment_questions').insert(questionsData);
      if (qError) throw qError;

      toast.success('Assessment created!');
      setShowCreate(false);
      setForm({ title: '', description: '', skill_category: '', difficulty: 'intermediate', time_limit_minutes: 30, passing_score: 70 });
      setQuestions([]);
      fetchAssessments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('skill_assessments').update({ is_active: !isActive }).eq('id', id);
    if (!error) {
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
      toast.success(isActive ? 'Assessment deactivated' : 'Assessment activated');
    }
  };

  if (loading) {
    return <Card className="shadow-google"><CardContent className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-google">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Skills Assessments
              </CardTitle>
              <CardDescription>Create tests to pre-screen candidates before interviews</CardDescription>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl">
                  <Plus className="w-4 h-4" /> New Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Assessment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. React Developer Test" className="rounded-xl" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label>Skill Category *</Label>
                      <Input value={form.skill_category} onChange={e => setForm(f => ({ ...f, skill_category: e.target.value }))} placeholder="e.g. Frontend Development" className="rounded-xl" maxLength={50} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the assessment" className="rounded-xl" maxLength={300} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Limit (min)</Label>
                      <Input type="number" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: parseInt(e.target.value) || 30 }))} className="rounded-xl" min={5} max={180} />
                    </div>
                    <div className="space-y-2">
                      <Label>Passing Score (%)</Label>
                      <Input type="number" value={form.passing_score} onChange={e => setForm(f => ({ ...f, passing_score: parseInt(e.target.value) || 70 }))} className="rounded-xl" min={10} max={100} />
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Questions ({questions.length})</Label>
                      <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1 rounded-xl">
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </Button>
                    </div>

                    {questions.map((q, qi) => (
                      <Card key={qi} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Q{qi + 1}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuestion(qi)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Textarea
                          value={q.question_text}
                          onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                          placeholder="Enter question..."
                          className="rounded-xl"
                          maxLength={500}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex gap-1 items-center">
                              <Input
                                value={opt}
                                onChange={e => updateOption(qi, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className={`rounded-xl text-sm ${opt === q.correct_answer && opt ? 'border-green-500' : ''}`}
                                maxLength={200}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Correct Answer</Label>
                          <Select value={q.correct_answer} onValueChange={v => updateQuestion(qi, 'correct_answer', v)}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                            <SelectContent>
                              {q.options.filter(o => o.trim()).map((opt, oi) => (
                                <SelectItem key={oi} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
                    {saving ? 'Creating...' : 'Create Assessment'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Assessment List */}
      {assessments.map((assessment, i) => (
        <motion.div key={assessment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="shadow-google">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{assessment.title}</h4>
                  {assessment.description && (
                    <p className="text-sm text-muted-foreground">{assessment.description}</p>
                  )}
                </div>
                <Switch checked={assessment.is_active} onCheckedChange={() => toggleActive(assessment.id, assessment.is_active)} />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline">{assessment.skill_category}</Badge>
                <Badge className={DIFFICULTY_COLORS[assessment.difficulty]}>{assessment.difficulty}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {assessment.time_limit_minutes} min
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" /> Pass: {assessment.passing_score}%
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {assessment.total_attempts} attempts
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {assessments.length === 0 && (
        <Card className="shadow-google">
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No assessments yet. Create one to pre-screen candidates.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
