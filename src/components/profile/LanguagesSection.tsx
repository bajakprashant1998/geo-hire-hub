import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface Language {
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

interface LanguagesSectionProps {
  languages: Language[];
  onChange: (languages: Language[]) => void;
}

const proficiencyLevels = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native / Bilingual' },
];

const COMMON_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Mandarin Chinese', 'Portuguese',
  'Bengali', 'Russian', 'Japanese', 'German', 'Korean', 'Italian', 'Turkish',
  'Vietnamese', 'Tamil', 'Telugu', 'Marathi', 'Urdu', 'Gujarati', 'Kannada',
  'Malayalam', 'Punjabi', 'Thai', 'Dutch', 'Polish', 'Swedish', 'Greek',
  'Czech', 'Romanian', 'Hungarian', 'Indonesian', 'Malay', 'Swahili', 'Persian',
];

export const LanguagesSection = ({ languages, onChange }: LanguagesSectionProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSuggestions !== null) {
        const ref = containerRefs.current[showSuggestions];
        if (ref && !ref.contains(e.target as Node)) setShowSuggestions(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  const addLanguage = () => {
    onChange([...languages, { name: '', proficiency: 'conversational' }]);
  };

  const updateLanguage = (index: number, field: keyof Language, value: string) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    onChange(languages.filter((_, i) => i !== index));
  };

  const filterSuggestions = (query: string) => {
    const existing = languages.map(l => l.name.toLowerCase());
    return COMMON_LANGUAGES.filter(
      lang => lang.toLowerCase().includes(query.toLowerCase()) && !existing.includes(lang.toLowerCase())
    ).slice(0, 6);
  };

  const handleNameChange = (index: number, value: string) => {
    setInputValues(prev => ({ ...prev, [index]: value }));
    updateLanguage(index, 'name', value);
    if (value.length >= 1) {
      setSuggestions(filterSuggestions(value));
      setShowSuggestions(index);
    } else {
      setShowSuggestions(null);
    }
  };

  const selectSuggestion = (index: number, lang: string) => {
    updateLanguage(index, 'name', lang);
    setInputValues(prev => ({ ...prev, [index]: lang }));
    setShowSuggestions(null);
  };

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            Languages
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {languages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Languages className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Add languages you speak</p>
          </div>
        ) : (
          languages.map((lang, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1 relative" ref={el => { containerRefs.current[index] = el; }}>
                <Input
                  value={lang.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  onFocus={() => {
                    if (lang.name.length >= 1) {
                      setSuggestions(filterSuggestions(lang.name));
                      setShowSuggestions(index);
                    }
                  }}
                  placeholder="Type language name..."
                />
                {showSuggestions === index && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => selectSuggestion(index, s)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-40">
                <Select
                  value={lang.proficiency}
                  onValueChange={(value) => updateLanguage(index, 'proficiency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeLanguage(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
