import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Heart, Building2, Users, Coffee, Trophy, Clock, Sparkles, Loader2, Save, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CulturePreference {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  value: number; // 0-100
}

interface EmployerMatch {
  id: string;
  company_name: string;
  matchScore: number;
  culture_description: string | null;
  work_culture_type: string | null;
  work_life_balance_rating: number | null;
  benefits: string[] | null;
  company_values: string[] | null;
}

const DEFAULT_PREFERENCES: CulturePreference[] = [
  { key: 'worklife', label: 'Work-Life Balance', icon: Clock, description: 'How important is flexibility?', value: 70 },
  { key: 'growth', label: 'Career Growth', icon: Trophy, description: 'Fast promotion vs stability', value: 60 },
  { key: 'teamwork', label: 'Team Collaboration', icon: Users, description: 'Solo vs team-oriented', value: 50 },
  { key: 'innovation', label: 'Innovation Culture', icon: Sparkles, description: 'Cutting-edge vs established', value: 50 },
  { key: 'perks', label: 'Benefits & Perks', icon: Coffee, description: 'Salary vs perks priority', value: 60 },
];

export const CultureMatchScore = ({ candidateId }: { candidateId: string }) => {
  const [preferences, setPreferences] = useState<CulturePreference[]>(DEFAULT_PREFERENCES);
  const [matches, setMatches] = useState<EmployerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);

  const updatePreference = (key: string, value: number) => {
    setPreferences(prev => prev.map(p => p.key === key ? { ...p, value } : p));
    setShowResults(false);
  };

  const calculateMatches = async () => {
    setLoading(true);
    try {
      const { data: employers, error } = await supabase
        .from('employers')
        .select('id, company_name, culture_description, work_culture_type, work_life_balance_rating, benefits, company_values')
        .eq('verification_status', 'approved')
        .not('culture_description', 'is', null)
        .limit(50);

      if (error) throw error;

      // Calculate match score for each employer
      const scored = (employers || []).map(emp => {
        let score = 0;
        let factors = 0;

        // Work-life balance match
        const wlPref = preferences.find(p => p.key === 'worklife')!.value;
        if (emp.work_life_balance_rating) {
          const wlScore = (emp.work_life_balance_rating / 5) * 100;
          score += Math.max(0, 100 - Math.abs(wlPref - wlScore));
          factors++;
        }

        // Benefits match
        const perkPref = preferences.find(p => p.key === 'perks')!.value;
        if (emp.benefits && emp.benefits.length > 0) {
          const benefitScore = Math.min(emp.benefits.length * 15, 100);
          score += Math.max(0, 100 - Math.abs(perkPref - benefitScore) * 0.5);
          factors++;
        }

        // Culture type match
        const innovPref = preferences.find(p => p.key === 'innovation')!.value;
        if (emp.work_culture_type) {
          const cultureScore = emp.work_culture_type === 'startup' ? 90 : emp.work_culture_type === 'innovative' ? 80 : 40;
          score += Math.max(0, 100 - Math.abs(innovPref - cultureScore) * 0.7);
          factors++;
        }

        // Values match
        if (emp.company_values && emp.company_values.length > 0) {
          score += Math.min(emp.company_values.length * 12, 100);
          factors++;
        }

        // Growth match
        const growthPref = preferences.find(p => p.key === 'growth')!.value;
        if (emp.culture_description) {
          const hasGrowthKeywords = /growth|promotion|career|advancement|learning/i.test(emp.culture_description);
          score += hasGrowthKeywords ? Math.min(growthPref, 85) : 30;
          factors++;
        }

        const matchScore = factors > 0 ? Math.round(score / factors) : 0;

        return {
          id: emp.id,
          company_name: emp.company_name,
          matchScore,
          culture_description: emp.culture_description,
          work_culture_type: emp.work_culture_type,
          work_life_balance_rating: emp.work_life_balance_rating,
          benefits: emp.benefits,
          company_values: emp.company_values,
        };
      }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);

      setMatches(scored);
      setShowResults(true);
    } catch (err) {
      console.error('Error calculating matches:', err);
      toast.error('Failed to calculate matches');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning-foreground';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Company Culture Match
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Rate your preferences and discover companies that match your work style.
        </p>
      </div>

      {/* Preferences Sliders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Your Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {preferences.map((pref, i) => (
            <motion.div
              key={pref.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <pref.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{pref.label}</span>
                </div>
                <span className={cn("text-sm font-bold", getScoreColor(pref.value))}>
                  {pref.value}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{pref.description}</p>
              <Slider
                value={[pref.value]}
                onValueChange={([v]) => updatePreference(pref.key, v)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </motion.div>
          ))}
          <Button onClick={calculateMatches} disabled={loading} className="w-full rounded-xl gap-2 mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Find Matching Companies
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence mode="wait">
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Top Matches ({matches.length})
            </h3>
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No companies with culture data found. Matches improve as employers fill their profiles.
              </p>
            ) : (
              matches.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={cn(
                    "hover:shadow-md transition-all",
                    i === 0 && "border-primary/30 bg-primary/3"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {i === 0 && <Trophy className="w-4 h-4 text-primary" />}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{emp.company_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{emp.work_culture_type || 'Corporate'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn("text-xl font-bold", getScoreColor(emp.matchScore))}>
                            {emp.matchScore}%
                          </span>
                          <p className="text-[10px] text-muted-foreground">match</p>
                        </div>
                      </div>
                      <Progress value={emp.matchScore} className="h-1.5 mb-2" />
                      {emp.company_values && emp.company_values.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {emp.company_values.slice(0, 4).map(v => (
                            <Badge key={v} variant="outline" className="text-[9px]">{v}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
