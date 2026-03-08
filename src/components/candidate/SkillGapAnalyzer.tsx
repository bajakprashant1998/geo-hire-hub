import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Search, TrendingUp, BookOpen, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkillGapResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: { skill: string; importance: 'critical' | 'important' | 'nice_to_have'; course?: string }[];
  recommendations: string[];
}

export const SkillGapAnalyzer = ({ candidateSkills }: { candidateSkills: string[] }) => {
  const [dreamJob, setDreamJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkillGapResult | null>(null);

  const analyze = async () => {
    if (!dreamJob.trim()) {
      toast.error('Enter your dream job title');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-skill-gap-analyzer', {
        body: { dreamJob: dreamJob.trim(), currentSkills: candidateSkills }
      });
      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error('Skill gap analysis error:', err);
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const importanceColor = {
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
    important: 'bg-warning/20 text-warning-foreground border-warning/30',
    nice_to_have: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Skill Gap Analyzer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compare your skills against your dream job and get personalized course recommendations.
        </p>
      </div>

      {/* Input Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g. Senior React Developer, Data Scientist, UX Designer..."
                value={dreamJob}
                onChange={e => setDreamJob(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="pl-10 rounded-xl h-11"
              />
            </div>
            <Button onClick={analyze} disabled={loading} className="rounded-xl h-11 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze
            </Button>
          </div>
          {candidateSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground font-medium mr-1">Your skills:</span>
              {candidateSkills.slice(0, 10).map(skill => (
                <Badge key={skill} variant="secondary" className="text-[10px] rounded-md">
                  {skill}
                </Badge>
              ))}
              {candidateSkills.length > 10 && (
                <Badge variant="outline" className="text-[10px] rounded-md">
                  +{candidateSkills.length - 10} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Match Score */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Skill Match for "{dreamJob}"</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Based on industry requirements</p>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    result.matchScore >= 80 ? "text-success" :
                    result.matchScore >= 50 ? "text-warning-foreground" : "text-destructive"
                  )}>
                    {result.matchScore}%
                  </div>
                </div>
                <Progress value={result.matchScore} className="h-2.5 rounded-full" />
              </CardContent>
            </Card>

            {/* Matched Skills */}
            {result.matchedSkills.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    Skills You Have ({result.matchedSkills.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {result.matchedSkills.map(skill => (
                    <Badge key={skill} className="bg-success/10 text-success border-success/30 text-xs">
                      ✓ {skill}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Missing Skills */}
            {result.missingSkills.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <XCircle className="w-4 h-4" />
                    Skills to Develop ({result.missingSkills.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.missingSkills.map((item, i) => (
                    <motion.div
                      key={item.skill}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("text-[10px] capitalize", importanceColor[item.importance])}>
                          {item.importance.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{item.skill}</span>
                      </div>
                      {item.course && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {item.course}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <TrendingUp className="w-4 h-4" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="text-primary mt-0.5">→</span>
                        {rec}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
