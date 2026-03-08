import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Compass, ArrowRight, Loader2, Sparkles, Target, Clock, TrendingUp, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CareerStep {
  title: string;
  timeframe: string;
  skills: string[];
  description: string;
  salaryRange?: string;
}

interface CareerPathResult {
  currentRole: string;
  targetRole: string;
  estimatedYears: number;
  steps: CareerStep[];
  tips: string[];
}

export const CareerPathVisualizer = ({ currentJobTitle, currentSkills }: { currentJobTitle: string; currentSkills: string[] }) => {
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CareerPathResult | null>(null);

  const generatePath = async () => {
    if (!targetRole.trim()) {
      toast.error('Enter your target role');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-career-path', {
        body: { currentRole: currentJobTitle, targetRole: targetRole.trim(), currentSkills }
      });
      if (error) throw error;
      setResult(data);
    } catch (err) {
      console.error('Career path error:', err);
      toast.error('Failed to generate career path');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          Career Path Visualizer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated roadmap from your current role to your dream position.
        </p>
      </div>

      {/* Input */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Role</label>
              <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/40 text-sm text-foreground">
                {currentJobTitle || 'Not specified'}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-5" />
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Role</label>
              <Input
                placeholder="e.g. CTO, VP Engineering..."
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generatePath()}
                className="rounded-lg"
              />
            </div>
          </div>
          <Button onClick={generatePath} disabled={loading} className="w-full rounded-xl gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Career Roadmap
          </Button>
        </CardContent>
      </Card>

      {/* Career Path Timeline */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {result.currentRole} → {result.targetRole}
                  </p>
                  <p className="text-xs text-muted-foreground">Estimated journey</p>
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-sm gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{result.estimatedYears} years
                </Badge>
              </CardContent>
            </Card>

            {/* Steps Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />

              <div className="space-y-4">
                {result.steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="relative pl-14"
                  >
                    {/* Node */}
                    <div className={cn(
                      "absolute left-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      i === 0 ? "bg-primary border-primary text-primary-foreground" :
                      i === result.steps.length - 1 ? "bg-success border-success text-success-foreground" :
                      "bg-card border-primary/50"
                    )}>
                      {i === result.steps.length - 1 ? (
                        <Target className="w-3 h-3" />
                      ) : (
                        <span className="text-[8px] font-bold">{i + 1}</span>
                      )}
                    </div>

                    <Card className={cn(
                      "transition-all hover:shadow-md",
                      i === result.steps.length - 1 && "border-success/30 bg-success/5"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{step.timeframe}</span>
                            </div>
                          </div>
                          {step.salaryRange && (
                            <Badge variant="outline" className="text-[10px]">
                              {step.salaryRange}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                        {step.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {step.skills.map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[10px] rounded-md">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <GraduationCap className="w-4 h-4" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <TrendingUp className="w-3 h-3 text-primary mt-1 shrink-0" />
                        {tip}
                      </li>
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
