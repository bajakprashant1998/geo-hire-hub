import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
}

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  candidate: any;
  onSave: () => void;
}

export const ProfileEditModal = ({ open, onOpenChange, profile, candidate, onSave }: ProfileEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [expectedSalary, setExpectedSalary] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState<Education[]>([]);

  useEffect(() => {
    if (profile && candidate) {
      setFullName(profile.full_name || '');
      setJobTitle(candidate.job_title || '');
      setBio(candidate.bio || '');
      setExperienceYears(candidate.experience_years || 0);
      setExpectedSalary(candidate.expected_salary || '');
      setSkills(candidate.skills || []);
      setEducation(candidate.education || []);
    }
  }, [profile, candidate]);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addEducation = () => {
    setEducation([...education, { institution: '', degree: '', field: '', startYear: '', endYear: '' }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const newEducation = [...education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    setEducation(newEducation);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!profile || !candidate) return;
    
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update candidate
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({
          job_title: jobTitle,
          bio,
          experience_years: experienceYears,
          expected_salary: expectedSalary,
          skills,
          education: education as unknown as any,
        })
        .eq('id', candidate.id);

      if (candidateError) throw candidateError;

      toast.success('Profile updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Software Engineer" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input 
                type="number" 
                min="0" 
                value={experienceYears} 
                onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Salary</Label>
              <Input value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} placeholder="e.g., $80,000 - $100,000" />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>About / Summary</Label>
            <Textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Write a brief summary about yourself..."
              rows={4}
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input 
                value={skillInput} 
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill..."
              />
              <Button type="button" onClick={addSkill} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {skill}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeSkill(skill)} 
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education
              </Label>
              <Button type="button" onClick={addEducation} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Education
              </Button>
            </div>
            
            {education.map((edu, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => removeEducation(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    placeholder="Institution" 
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                  />
                  <Input 
                    placeholder="Degree" 
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input 
                    placeholder="Field of Study" 
                    value={edu.field}
                    onChange={(e) => updateEducation(index, 'field', e.target.value)}
                  />
                  <Input 
                    placeholder="Start Year" 
                    value={edu.startYear}
                    onChange={(e) => updateEducation(index, 'startYear', e.target.value)}
                  />
                  <Input 
                    placeholder="End Year" 
                    value={edu.endYear}
                    onChange={(e) => updateEducation(index, 'endYear', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
