import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreenedCandidate {
  candidate_id: string;
  candidate_name: string;
  match_score: number;
  ai_screening_score: number;
  recommendation: string;
  screening_summary: string;
  skill_gaps: string[];
  skill_overlap: string[];
}

const RECOMMENDATION_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  strong_match: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Strong Match' },
  good_match: { color: 'bg-blue-100 text-blue-800', icon: TrendingUp, label: 'Good Match' },
  potential: { color: 'bg-amber-100 text-amber-800', icon: Sparkles, label: 'Potential' },
  not_recommended: { color: 'bg-destructive/10 text-destructive', icon: XCircle, label: 'Not Recommended' },
};

export const AIScreeningPanel = ({ jobId, jobTitle }: { jobId: string; jobTitle: string }) => {
  const [candidates, setCandidates] = useState<ScreenedCandidate[]>([]);
  const [screening, setScreening] = useState(false);
  const [screened, setScreened] = useState(false);

  const runScreening = async () => {
    setScreening(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-candidate-screening`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id: jobId }),
        }
      );

      if (!res.ok) throw new Error('Screening failed');
      const data = await res.json();
      setCandidates(data.results || []);
      setScreened(true);
      toast.success(`Screened ${data.results?.length || 0} candidates`);
    } catch (err: any) {
      toast.error(err.message || 'AI Screening failed');
    } finally {
      setScreening(false);
    }
  };

  return (
    <Card className="shadow-google">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Candidate Screening
            </CardTitle>
            <CardDescription>Auto-rank applicants with AI scoring and skill-gap analysis</CardDescription>
          </div>
          <Button onClick={runScreening} disabled={screening} className="gap-2 rounded-xl">
            {screening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {screening ? 'Analyzing...' : screened ? 'Re-screen' : 'Screen Applicants'}
          </Button>
        </div>
      </CardHeader>

      {candidates.length > 0 && (
        <CardContent className="space-y-3">
          <AnimatePresence>
            {candidates.sort((a, b) => b.ai_screening_score - a.ai_screening_score).map((candidate, i) => {
              const config = RECOMMENDATION_CONFIG[candidate.recommendation] || RECOMMENDATION_CONFIG.potential;
              const Icon = config.icon;

              return (
                <motion.div
                  key={candidate.candidate_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{candidate.candidate_name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{candidate.screening_summary}</p>
                    </div>
                    <Badge className={`${config.color} gap-1 shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">AI Score</span>
                        <span className="text-sm font-bold">{candidate.ai_screening_score}%</span>
                      </div>
                      <Progress value={candidate.ai_screening_score} className="h-2" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Match Score</span>
                        <span className="text-sm font-bold">{candidate.match_score}%</span>
                      </div>
                      <Progress value={candidate.match_score} className="h-2" />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {candidate.skill_overlap?.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Matching Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skill_overlap.slice(0, 5).map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.skill_gaps?.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Skill Gaps
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skill_gaps.slice(0, 5).map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      )}

      {screened && candidates.length === 0 && (
        <CardContent>
          <div className="text-center p-6">
            <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No applicants found for this job yet.</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
