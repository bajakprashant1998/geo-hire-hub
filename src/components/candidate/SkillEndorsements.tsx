import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SkillEndorsementsProps {
  candidateId: string;
  skills: string[];
  isOwnProfile?: boolean;
}

interface EndorsementCount {
  skill_name: string;
  count: number;
  endorsedByMe: boolean;
}

export const SkillEndorsements = ({ candidateId, skills, isOwnProfile = false }: SkillEndorsementsProps) => {
  const { user, profile } = useAuth();
  const [endorsements, setEndorsements] = useState<EndorsementCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null);

  useEffect(() => {
    fetchEndorsements();
  }, [candidateId, user]);

  const fetchEndorsements = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_endorsements')
        .select('skill_name, endorser_profile_id')
        .eq('candidate_id', candidateId);

      if (error) throw error;

      const countMap: Record<string, { count: number; endorsedByMe: boolean }> = {};
      
      // Initialize all skills
      skills.forEach(s => { countMap[s] = { count: 0, endorsedByMe: false }; });

      // Count endorsements
      (data || []).forEach(row => {
        if (!countMap[row.skill_name]) {
          countMap[row.skill_name] = { count: 0, endorsedByMe: false };
        }
        countMap[row.skill_name].count++;
        if (profile && row.endorser_profile_id === profile.id) {
          countMap[row.skill_name].endorsedByMe = true;
        }
      });

      // Sort: endorsed first, then by count
      const sorted = Object.entries(countMap)
        .map(([skill_name, val]) => ({ skill_name, ...val }))
        .sort((a, b) => b.count - a.count);

      setEndorsements(sorted);
    } catch (err) {
      console.error('Error fetching endorsements:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEndorsement = async (skillName: string) => {
    if (!user || !profile || isOwnProfile) return;

    setTogglingSkill(skillName);
    const current = endorsements.find(e => e.skill_name === skillName);

    try {
      if (current?.endorsedByMe) {
        const { error } = await supabase
          .from('skill_endorsements')
          .delete()
          .eq('candidate_id', candidateId)
          .eq('endorser_profile_id', profile.id)
          .eq('skill_name', skillName);
        if (error) throw error;

        setEndorsements(prev =>
          prev.map(e => e.skill_name === skillName
            ? { ...e, count: e.count - 1, endorsedByMe: false }
            : e
          )
        );
        toast.success('Endorsement removed');
      } else {
        const { error } = await supabase
          .from('skill_endorsements')
          .insert({
            candidate_id: candidateId,
            endorser_profile_id: profile.id,
            skill_name: skillName,
          });
        if (error) throw error;

        setEndorsements(prev =>
          prev.map(e => e.skill_name === skillName
            ? { ...e, count: e.count + 1, endorsedByMe: true }
            : e
          )
        );
        toast.success(`Endorsed "${skillName}"`);
      }
    } catch (err: any) {
      console.error('Endorsement error:', err);
      toast.error(err?.message?.includes('violates') ? "You can't endorse your own skills" : 'Failed to update endorsement');
    } finally {
      setTogglingSkill(null);
    }
  };

  if (loading) return null;

  const canEndorse = user && profile && !isOwnProfile;

  return (
    <div className="flex flex-wrap gap-2">
      {endorsements.map((item, i) => {
        const isToggling = togglingSkill === item.skill_name;

        return (
          <motion.div
            key={item.skill_name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={!canEndorse || isToggling}
                  onClick={() => canEndorse && toggleEndorsement(item.skill_name)}
                  className={`
                    group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                    ${item.endorsedByMe
                      ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/20'
                      : 'bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 hover:border-primary/20'
                    }
                    ${!canEndorse ? 'cursor-default' : 'cursor-pointer'}
                    disabled:opacity-60
                  `}
                >
                  {isToggling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    canEndorse && (
                      <ThumbsUp className={`w-3 h-3 transition-transform group-hover:scale-110 ${item.endorsedByMe ? 'fill-primary' : ''}`} />
                    )
                  )}
                  <span>{item.skill_name}</span>
                  <AnimatePresence>
                    {item.count > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary min-w-[18px] text-center"
                      >
                        {item.count}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {item.count > 0
                  ? `${item.count} endorsement${item.count > 1 ? 's' : ''}${item.endorsedByMe ? ' (including you)' : ''}`
                  : canEndorse ? 'Click to endorse this skill' : 'No endorsements yet'
                }
              </TooltipContent>
            </Tooltip>
          </motion.div>
        );
      })}
    </div>
  );
};
