import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardCheck, Star, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterviewFeedbackFormsProps {
  employerId: string;
}

const CRITERIA = [
  { key: 'technical', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'culture_fit', label: 'Culture Fit' },
  { key: 'leadership', label: 'Leadership Potential' },
];

export const InterviewFeedbackForms = ({ employerId }: InterviewFeedbackFormsProps) => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedInterview, setSelectedInterview] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const { data } = await supabase
          .from('interviews')
          .select(`
            id, scheduled_date, scheduled_time, status, employer_notes,
            candidates!interviews_candidate_id_fkey (
              job_title,
              profiles!candidates_profile_id_fkey (full_name)
            ),
            jobs!interviews_job_id_fkey (title)
          `)
          .eq('employer_id', employerId)
          .in('status', ['completed', 'confirmed', 'scheduled'])
          .order('scheduled_date', { ascending: false })
          .limit(20);

        setInterviews(data || []);
      } catch {
        toast.error('Failed to load interviews');
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [employerId]);

  const handleSubmit = async () => {
    if (!selectedInterview || !recommendation) {
      toast.error('Please select an interview and provide a recommendation');
      return;
    }

    setSubmitting(true);
    try {
      const feedbackData = {
        ratings,
        strengths,
        weaknesses,
        recommendation,
        notes,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('interviews')
        .update({ employer_notes: JSON.stringify(feedbackData) })
        .eq('id', selectedInterview);

      if (error) throw error;

      setSubmitted(true);
      toast.success('Feedback submitted successfully!');
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRatings({});
    setStrengths('');
    setWeaknesses('');
    setRecommendation('');
    setNotes('');
    setSelectedInterview('');
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Interview Feedback</h2>
          <p className="text-sm text-muted-foreground">Structured post-interview evaluation forms</p>
        </div>
      </div>

      {submitted ? (
        <Card className="border-border/40">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
            <h3 className="text-lg font-bold text-foreground mb-2">Feedback Submitted!</h3>
            <p className="text-sm text-muted-foreground mb-4">Your structured feedback has been recorded.</p>
            <Button onClick={resetForm} variant="outline" className="rounded-xl">Submit Another Feedback</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Select Interview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedInterview} onValueChange={setSelectedInterview}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose an interview" />
                </SelectTrigger>
                <SelectContent>
                  {interviews.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {(i.candidates as any)?.profiles?.full_name || 'Unknown'} — {(i.jobs as any)?.title || ''} ({i.scheduled_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Rate Each Criteria</Label>
                {CRITERIA.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRatings({ ...ratings, [c.key]: n })}
                          className="p-1"
                        >
                          <Star
                            className={cn(
                              'w-5 h-5 transition-colors',
                              (ratings[c.key] || 0) >= n ? 'text-warning fill-warning' : 'text-muted-foreground/30'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Key Strengths</Label>
                <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="What impressed you?" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Areas for Improvement</Label>
                <Textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} placeholder="Any concerns or gaps?" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Recommendation *</Label>
                <div className="flex gap-2">
                  {['Strong Hire', 'Hire', 'Maybe', 'No Hire'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRecommendation(r)}
                      className={cn(
                        'px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                        recommendation === r
                          ? r.includes('Hire') && !r.includes('No')
                            ? 'border-success bg-success/10 text-success'
                            : r === 'Maybe'
                            ? 'border-warning bg-warning/10 text-warning-foreground'
                            : 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-border/40 text-muted-foreground hover:border-border'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other observations..." rows={2} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2 rounded-xl">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
