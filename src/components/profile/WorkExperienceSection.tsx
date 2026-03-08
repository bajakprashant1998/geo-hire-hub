import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Briefcase, Plus, X, Building2, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  location?: string;
}

interface WorkExperienceSectionProps {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
  skills?: string[];
}

export const WorkExperienceSection = ({ experiences, onChange, skills = [] }: WorkExperienceSectionProps) => {
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  const addExperience = () => {
    onChange([
      ...experiences,
      { company: '', position: '', startDate: '', endDate: '', isCurrent: false, description: '', location: '' },
    ]);
  };

  const updateExperience = (index: number, field: keyof WorkExperience, value: string | boolean) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'isCurrent' && value === true) updated[index].endDate = '';
    onChange(updated);
  };

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  const generateDescription = async (index: number) => {
    const exp = experiences[index];
    if (!exp.position && !exp.company) {
      toast.error('Add position and company first');
      return;
    }
    setGeneratingIdx(index);
    try {
      const { data, error } = await supabase.functions.invoke('ai-profile-content', {
        body: { type: 'work_description', position: exp.position, company: exp.company, skills },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.content) {
        updateExperience(index, 'description', data.content);
        toast.success('Description generated!');
      }
    } catch (err) {
      console.error('AI description error:', err);
      toast.error('Failed to generate description');
    } finally {
      setGeneratingIdx(null);
    }
  };

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Work Experience
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addExperience}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {experiences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No work experience added yet</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addExperience}>
              <Plus className="w-4 h-4 mr-1" />
              Add Experience
            </Button>
          </div>
        ) : (
          experiences.map((exp, index) => (
            <div key={index} className="p-4 border border-border rounded-lg space-y-4 relative bg-card">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeExperience(index)}
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="grid md:grid-cols-2 gap-4 pr-10">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <Input
                    value={exp.position}
                    onChange={(e) => updateExperience(index, 'position', e.target.value)}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={exp.location || ''}
                  onChange={(e) => updateExperience(index, 'location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <MonthYearPicker
                    value={exp.startDate}
                    onChange={(value) => updateExperience(index, 'startDate', value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  {exp.isCurrent ? (
                    <Input disabled placeholder="Present" className="w-full text-muted-foreground" />
                  ) : (
                    <MonthYearPicker
                      value={exp.endDate}
                      onChange={(value) => updateExperience(index, 'endDate', value)}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`current-${index}`}
                  checked={exp.isCurrent}
                  onCheckedChange={(checked) => updateExperience(index, 'isCurrent', checked === true)}
                />
                <Label htmlFor={`current-${index}`} className="text-sm cursor-pointer">
                  I currently work here
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    disabled={generatingIdx === index || (!exp.position && !exp.company)}
                    onClick={() => generateDescription(index)}
                  >
                    {generatingIdx === index ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {generatingIdx === index ? 'Writing...' : 'AI Write'}
                  </Button>
                </div>
                <Textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  placeholder="Describe your responsibilities and achievements..."
                  rows={3}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
