import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages, Plus, X } from 'lucide-react';

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

export const LanguagesSection = ({ languages, onChange }: LanguagesSectionProps) => {
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
              <div className="flex-1">
                <Input
                  value={lang.name}
                  onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                  placeholder="Language name"
                />
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
