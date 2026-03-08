import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  MessageCircleQuestion, Send, ChevronDown, ChevronUp,
  ShieldCheck, ThumbsUp, Loader2, Building2, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Question {
  id: string;
  question_text: string;
  is_anonymous: boolean;
  upvote_count: number;
  created_at: string;
  asker_profile: { full_name: string; avatar_url: string | null } | null;
  answers: Answer[];
}

interface Answer {
  id: string;
  answer_text: string;
  is_verified_employee: boolean;
  is_employer_official: boolean;
  helpful_count: number;
  created_at: string;
  answerer_profile: { full_name: string; avatar_url: string | null } | null;
}

interface Props {
  employerId: string;
  companyName: string;
}

export const CompanyQAForum = ({ employerId, companyName }: Props) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isEmployerUser, setIsEmployerUser] = useState(false);

  useEffect(() => {
    fetchQuestions();
    if (user) fetchUserContext();
  }, [employerId, user]);

  const fetchUserContext = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile) {
      setProfileId(profile.id);
      // Check if this user is the employer who owns this profile
      if (profile.user_type === 'employer') {
        const { data: emp } = await supabase
          .from('employers')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('id', employerId)
          .maybeSingle();
        setIsEmployerUser(!!emp);
      }
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_questions')
      .select(`
        id, question_text, is_anonymous, upvote_count, created_at,
        asker_profile_id
      `)
      .eq('employer_id', employerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    // Fetch asker profiles
    const askerIds = [...new Set(data.map(q => q.asker_profile_id))];
    const { data: askerProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', askerIds);
    const askerMap = new Map((askerProfiles || []).map(p => [p.id, p]));

    // Fetch answers for all questions
    const questionIds = data.map(q => q.id);
    const { data: answers } = await supabase
      .from('company_answers')
      .select('id, question_id, answer_text, is_verified_employee, is_employer_official, helpful_count, created_at, answerer_profile_id')
      .in('question_id', questionIds)
      .order('is_employer_official', { ascending: false })
      .order('helpful_count', { ascending: false });

    // Fetch answerer profiles
    const answererIds = [...new Set((answers || []).map(a => a.answerer_profile_id))];
    let answererMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (answererIds.length > 0) {
      const { data: answererProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', answererIds);
      answererMap = new Map((answererProfiles || []).map(p => [p.id, p]));
    }

    const mapped: Question[] = data.map(q => ({
      id: q.id,
      question_text: q.question_text,
      is_anonymous: q.is_anonymous,
      upvote_count: q.upvote_count,
      created_at: q.created_at,
      asker_profile: q.is_anonymous ? null : (askerMap.get(q.asker_profile_id) || null),
      answers: (answers || [])
        .filter(a => a.question_id === q.id)
        .map(a => ({
          id: a.id,
          answer_text: a.answer_text,
          is_verified_employee: a.is_verified_employee,
          is_employer_official: a.is_employer_official,
          helpful_count: a.helpful_count,
          created_at: a.created_at,
          answerer_profile: answererMap.get(a.answerer_profile_id) || null,
        })),
    }));

    setQuestions(mapped);
    setLoading(false);
  };

  const handleAskQuestion = async () => {
    if (!user || !profileId) { toast.error('Please log in to ask a question'); return; }
    if (!newQuestion.trim() || newQuestion.trim().length < 10) {
      toast.error('Question must be at least 10 characters'); return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('company_questions').insert({
      employer_id: employerId,
      asker_profile_id: profileId,
      question_text: newQuestion.trim(),
      is_anonymous: isAnonymous,
    });

    if (error) {
      toast.error('Failed to submit question');
      console.error(error);
    } else {
      toast.success('Question submitted!');
      setNewQuestion('');
      setIsAnonymous(false);
      fetchQuestions();
    }
    setSubmitting(false);
  };

  const handleAnswer = async (questionId: string) => {
    if (!user || !profileId) { toast.error('Please log in to answer'); return; }
    const text = answerTexts[questionId]?.trim();
    if (!text || text.length < 5) { toast.error('Answer must be at least 5 characters'); return; }

    setAnsweringId(questionId);
    const { error } = await supabase.from('company_answers').insert({
      question_id: questionId,
      answerer_profile_id: profileId,
      answer_text: text,
      is_employer_official: isEmployerUser,
    });

    if (error) {
      toast.error('Failed to submit answer');
      console.error(error);
    } else {
      toast.success('Answer submitted!');
      setAnswerTexts(prev => ({ ...prev, [questionId]: '' }));
      fetchQuestions();
    }
    setAnsweringId(null);
  };

  const handleUpvote = async (questionId: string) => {
    if (!user) { toast.error('Please log in to upvote'); return; }
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    await supabase
      .from('company_questions')
      .update({ upvote_count: q.upvote_count + 1 })
      .eq('id', questionId);
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, upvote_count: q.upvote_count + 1 } : q));
  };

  const handleHelpful = async (answerId: string) => {
    if (!user) { toast.error('Please log in'); return; }
    const allAnswers = questions.flatMap(q => q.answers);
    const a = allAnswers.find(a => a.id === answerId);
    if (!a) return;
    await supabase
      .from('company_answers')
      .update({ helpful_count: a.helpful_count + 1 })
      .eq('id', answerId);
    setQuestions(prev => prev.map(q => ({
      ...q,
      answers: q.answers.map(a => a.id === answerId ? { ...a, helpful_count: a.helpful_count + 1 } : a),
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageCircleQuestion className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Company Q&A</h3>
          <p className="text-xs text-muted-foreground">Ask questions about {companyName} — employees & the company can answer</p>
        </div>
      </div>

      {/* Ask a Question */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder={user ? `Ask something about ${companyName}...` : 'Log in to ask a question'}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            disabled={!user}
            rows={3}
            className="resize-none rounded-xl text-sm"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(c) => setIsAnonymous(!!c)}
                disabled={!user}
              />
              <Label htmlFor="anonymous" className="text-xs text-muted-foreground cursor-pointer">Ask anonymously</Label>
            </div>
            <Button
              size="sm"
              onClick={handleAskQuestion}
              disabled={!user || submitting || newQuestion.trim().length < 10}
              className="rounded-xl gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Ask
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircleQuestion className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  {/* Question header */}
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                      {q.asker_profile?.avatar_url ? (
                        <AvatarImage src={q.asker_profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-muted">
                        {q.is_anonymous ? '?' : (q.asker_profile?.full_name?.[0] || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {q.is_anonymous ? 'Anonymous' : (q.asker_profile?.full_name || 'User')}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{q.question_text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleUpvote(q.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {q.upvote_count > 0 && q.upvote_count}
                        </button>
                        <button
                          onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {q.answers.length} {q.answers.length === 1 ? 'answer' : 'answers'}
                          {expandedQ === q.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Answers */}
                  <AnimatePresence>
                    {expandedQ === q.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator className="my-3" />
                        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                          {q.answers.map(a => (
                            <div key={a.id} className="flex items-start gap-2.5">
                              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                                {a.answerer_profile?.avatar_url ? (
                                  <AvatarImage src={a.answerer_profile.avatar_url} />
                                ) : null}
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {a.answerer_profile?.full_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <span className="text-xs font-medium">{a.answerer_profile?.full_name || 'User'}</span>
                                  {a.is_employer_official && (
                                    <Badge variant="default" className="h-4 text-[9px] px-1.5 gap-0.5">
                                      <Building2 className="w-2.5 h-2.5" /> Official
                                    </Badge>
                                  )}
                                  {a.is_verified_employee && !a.is_employer_official && (
                                    <Badge variant="secondary" className="h-4 text-[9px] px-1.5 gap-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5" /> Employee
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{a.answer_text}</p>
                                <button
                                  onClick={() => handleHelpful(a.id)}
                                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-1"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  Helpful{a.helpful_count > 0 && ` (${a.helpful_count})`}
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Answer input */}
                          {user && (
                            <div className="flex gap-2 pt-1">
                              <Textarea
                                placeholder="Write an answer..."
                                value={answerTexts[q.id] || ''}
                                onChange={(e) => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                rows={2}
                                className="resize-none rounded-xl text-xs flex-1"
                                maxLength={1000}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAnswer(q.id)}
                                disabled={answeringId === q.id || !(answerTexts[q.id]?.trim())}
                                className="rounded-xl self-end h-8"
                              >
                                {answeringId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
