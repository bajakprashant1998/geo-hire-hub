import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Plus, X, Building2 } from 'lucide-react';

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
}

export const WorkExperienceSection = ({ experiences, onChange }: WorkExperienceSectionProps) => {
  const addExperience = () => {
    onChange([
      ...experiences,
      {
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        description: '',
        location: '',
      },
    ]);
  };

  const updateExperience = (index: number, field: keyof WorkExperience, value: string | boolean) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    
    // If setting current, clear end date
    if (field === 'isCurrent' && value === true) {
      updated[index].endDate = '';
    }
    
    onChange(updated);
  };

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
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
                  <Input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                    disabled={exp.isCurrent}
                    placeholder={exp.isCurrent ? 'Present' : ''}
                  />
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
                <Label>Description</Label>
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
