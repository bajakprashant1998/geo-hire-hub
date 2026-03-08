import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIGenerateButtonProps {
  type: 'headline' | 'summary' | 'cover_letter' | 'industries';
  onGenerated: (content: string) => void;
  context: Record<string, any>;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export const AIGenerateButton = ({
  type,
  onGenerated,
  context,
  label = 'AI Generate',
  disabled = false,
  size = 'sm',
  className,
}: AIGenerateButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-profile-content', {
        body: { type, ...context },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.content) {
        onGenerated(data.content);
        toast.success(`${type === 'headline' ? 'Headline' : type === 'summary' ? 'Summary' : type === 'cover_letter' ? 'Cover letter' : 'Content'} generated!`);
      }
    } catch (err) {
      console.error(`AI ${type} error:`, err);
      toast.error('Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={`gap-1.5 ${className || ''}`}
      disabled={disabled || loading}
      onClick={handleGenerate}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {loading ? 'Generating...' : label}
    </Button>
  );
};

interface AIIndustrySuggestButtonProps {
  jobTitle: string;
  currentIndustries: string[];
  onSuggest: (suggestions: string[]) => void;
}

export const AIIndustrySuggestButton = ({ jobTitle, currentIndustries, onSuggest }: AIIndustrySuggestButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    if (!jobTitle.trim()) { toast.error('Set your job title first'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-profile-content', {
        body: { type: 'industries', jobTitle },
      });
      if (error) throw error;
      if (data?.suggestions) {
        const filtered = data.suggestions.filter(
          (s: string) => !currentIndustries.some(i => i.toLowerCase() === s.toLowerCase())
        );
        onSuggest(filtered);
        if (filtered.length === 0) toast.info('No new suggestions found.');
      }
    } catch (err) {
      console.error('AI industry suggest error:', err);
      toast.error('Failed to get suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={loading || !jobTitle.trim()}
      onClick={handleSuggest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {loading ? 'Suggesting...' : 'AI Suggest'}
    </Button>
  );
};
