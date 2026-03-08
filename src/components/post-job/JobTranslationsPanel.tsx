import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Languages, Loader2, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
];

interface Translation {
  title: string;
  description: string;
}

interface JobTranslationsPanelProps {
  title: string;
  description: string;
  translations: Record<string, Translation>;
  onTranslationsChange: (translations: Record<string, Translation>) => void;
}

export const JobTranslationsPanel = ({
  title,
  description,
  translations,
  onTranslationsChange,
}: JobTranslationsPanelProps) => {
  const { session } = useAuth();
  const [selectedLangs, setSelectedLangs] = useState<string[]>(Object.keys(translations));
  const [translating, setTranslating] = useState(false);
  const [editingLang, setEditingLang] = useState<string | null>(null);

  const toggleLang = (code: string) => {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleAutoTranslate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a job title first');
      return;
    }
    const langsToTranslate = selectedLangs.filter(l => !translations[l]);
    if (langsToTranslate.length === 0 && selectedLangs.length > 0) {
      toast.info('All selected languages already translated');
      return;
    }
    if (selectedLangs.length === 0) {
      toast.error('Select at least one language');
      return;
    }

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-job', {
        body: {
          title,
          description,
          targetLanguages: langsToTranslate.length > 0 ? langsToTranslate : selectedLangs,
        },
      });

      if (error) throw error;
      if (data?.translations) {
        onTranslationsChange({ ...translations, ...data.translations });
        toast.success(`Translated to ${Object.keys(data.translations).length} language(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleEditField = (lang: string, field: 'title' | 'description', value: string) => {
    onTranslationsChange({
      ...translations,
      [lang]: { ...translations[lang], [field]: value },
    });
  };

  const handleRemoveLang = (code: string) => {
    const updated = { ...translations };
    delete updated[code];
    onTranslationsChange(updated);
    setSelectedLangs(prev => prev.filter(c => c !== code));
  };

  const translatedLangs = Object.keys(translations);

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Multi-Language Translations</h3>
          </div>
          {translatedLangs.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {translatedLangs.length} language{translatedLangs.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Reach more candidates by translating your job post. Select languages and auto-translate with AI.
        </p>

        {/* Language selector */}
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map(lang => {
            const isSelected = selectedLangs.includes(lang.code);
            const isTranslated = !!translations[lang.code];
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLang(lang.code)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  isTranslated
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : isSelected
                    ? 'bg-accent border-accent-foreground/20 text-accent-foreground'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/30'
                )}
              >
                <span>{lang.flag}</span>
                {lang.label}
                {isTranslated && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Auto-translate button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoTranslate}
          disabled={translating || selectedLangs.length === 0}
          className="gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
        >
          {translating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {translating ? 'Translating...' : 'Auto-translate selected'}
        </Button>

        {/* Translation previews / editors */}
        {translatedLangs.length > 0 && (
          <Tabs defaultValue={translatedLangs[0]} className="w-full">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
              {translatedLangs.map(code => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                return (
                  <TabsTrigger
                    key={code}
                    value={code}
                    className="text-xs rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-3 py-1.5"
                  >
                    {lang?.flag} {lang?.label || code}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {translatedLangs.map(code => (
              <TabsContent key={code} value={code} className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {SUPPORTED_LANGUAGES.find(l => l.code === code)?.flag}{' '}
                    {SUPPORTED_LANGUAGES.find(l => l.code === code)?.label}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingLang(editingLang === code ? null : code)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveLang(code)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {editingLang === code ? (
                  <>
                    <Input
                      value={translations[code]?.title || ''}
                      onChange={e => handleEditField(code, 'title', e.target.value)}
                      placeholder="Translated title"
                      className="text-sm"
                    />
                    <Textarea
                      value={translations[code]?.description || ''}
                      onChange={e => handleEditField(code, 'description', e.target.value)}
                      placeholder="Translated description"
                      rows={4}
                      className="text-sm"
                    />
                  </>
                ) : (
                  <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                    <p className="text-sm font-semibold text-foreground">{translations[code]?.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                      {translations[code]?.description || '(No description)'}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
