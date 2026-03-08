import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface VerifiedSkill {
  skill_category: string;
  best_percentage: number;
  assessment_title: string;
  passed_at: string | null;
}

interface VerifiedSkillBadgesProps {
  candidateId: string;
  compact?: boolean;
}

export const VerifiedSkillBadges = ({ candidateId, compact = false }: VerifiedSkillBadgesProps) => {
  const [skills, setSkills] = useState<VerifiedSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('assessment_results')
        .select('percentage, completed_at, skill_assessments!assessment_results_assessment_id_fkey(title, skill_category)')
        .eq('candidate_id', candidateId)
        .eq('passed', true)
        .order('percentage', { ascending: false });

      if (data) {
        // Dedupe by skill_category, keep best score
        const map = new Map<string, VerifiedSkill>();
        data.forEach((r: any) => {
          const cat = r.skill_assessments?.skill_category;
          if (!cat) return;
          const existing = map.get(cat);
          if (!existing || r.percentage > existing.best_percentage) {
            map.set(cat, {
              skill_category: cat,
              best_percentage: r.percentage,
              assessment_title: r.skill_assessments?.title || cat,
              passed_at: r.completed_at,
            });
          }
        });
        setSkills(Array.from(map.values()).sort((a, b) => b.best_percentage - a.best_percentage));
      }
      setLoading(false);
    };
    fetch();
  }, [candidateId]);

  if (loading) return null;
  if (skills.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {skills.slice(0, 5).map(s => (
          <Tooltip key={s.skill_category}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-[10px] border-success/30 bg-success/10 text-success cursor-default">
                <ShieldCheck className="w-3 h-3" />
                {s.skill_category}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Verified — scored {s.best_percentage}% on "{s.assessment_title}"
            </TooltipContent>
          </Tooltip>
        ))}
        {skills.length > 5 && (
          <Badge variant="secondary" className="text-[10px]">+{skills.length - 5} more</Badge>
        )}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className="border-border/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-success/60 to-success/20" />
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <h4 className="text-sm font-bold text-foreground">Verified Skills</h4>
              <Badge variant="secondary" className="text-[10px]">{skills.length}</Badge>
            </div>
            <Badge variant="outline" className="text-[10px] border-success/30 bg-success/10 text-success">
              Assessment Verified
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <motion.div
                key={s.skill_category}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-success/30 bg-success/10 text-success cursor-default transition-all hover:bg-success/15">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{s.skill_category}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-success/20 min-w-[28px] text-center">
                        {s.best_percentage}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">✓ Verified via assessment</p>
                    <p className="text-muted-foreground">Scored {s.best_percentage}% on "{s.assessment_title}"</p>
                    {s.passed_at && (
                      <p className="text-muted-foreground text-[10px]">
                        {new Date(s.passed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
