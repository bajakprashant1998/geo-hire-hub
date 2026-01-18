import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plus, X, Sparkles, Loader2 } from 'lucide-react';

interface CandidateRequirementSectionProps {
  experienceType: 'Any' | 'Fresher Only' | 'Experienced Only';
  setExperienceType: (type: 'Any' | 'Fresher Only' | 'Experienced Only') => void;
  minExperience: string;
  setMinExperience: (exp: string) => void;
  maxExperience: string;
  setMaxExperience: (exp: string) => void;
  salaryMin: string;
  setSalaryMin: (salary: string) => void;
  salaryMax: string;
  setSalaryMax: (salary: string) => void;
  hasBonus: boolean;
  setHasBonus: (hasBonus: boolean) => void;
  description: string;
  setDescription: (desc: string) => void;
  skills: string[];
  setSkills: (skills: string[]) => void;
  // Additional details
  gender: 'Any' | 'Male' | 'Female';
  setGender: (gender: 'Any' | 'Male' | 'Female') => void;
  ageMin: string;
  setAgeMin: (age: string) => void;
  ageMax: string;
  setAgeMax: (age: string) => void;
  education: string;
  setEducation: (edu: string) => void;
  languages: string[];
  setLanguages: (langs: string[]) => void;
  certifications: string;
  setCertifications: (cert: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  onGenerateDescription: () => void;
  generatingDescription: boolean;
  title: string;
}

const experienceOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const educationLevels = [
  'No formal education',
  'High School',
  '10th Pass',
  '12th Pass',
  'Diploma',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD'
];
const commonLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati'];
const commonSkills = ['Communication', 'MS Office', 'Excel', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management'];

export const CandidateRequirementSection = ({
  experienceType,
  setExperienceType,
  minExperience,
  setMinExperience,
  maxExperience,
  setMaxExperience,
  salaryMin,
  setSalaryMin,
  salaryMax,
  setSalaryMax,
  hasBonus,
  setHasBonus,
  description,
  setDescription,
  skills,
  setSkills,
  gender,
  setGender,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  education,
  setEducation,
  languages,
  setLanguages,
  certifications,
  setCertifications,
  additionalNotes,
  setAdditionalNotes,
  onGenerateDescription,
  generatingDescription,
  title,
}: CandidateRequirementSectionProps) => {
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Candidate Requirements</h2>
        <p className="text-sm text-muted-foreground">Define what you're looking for in ideal candidates</p>
      </div>

      {/* Experience Type Toggle */}
      <div className="space-y-2">
        <Label>Total Experience of Candidate *</Label>
        <div className="toggle-container">
          {(['Any', 'Fresher Only', 'Experienced Only'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setExperienceType(type)}
              className={`toggle-option ${experienceType === type ? 'active' : ''}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Range */}
      {experienceType === 'Experienced Only' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Experience</Label>
            <Select value={minExperience} onValueChange={setMinExperience}>
              <SelectTrigger>
                <SelectValue placeholder="Min Years" />
              </SelectTrigger>
              <SelectContent>
                {experienceOptions.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {exp} {exp === '1' ? 'Year' : 'Years'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Maximum Experience</Label>
            <Select value={maxExperience} onValueChange={setMaxExperience}>
              <SelectTrigger>
                <SelectValue placeholder="Max Years" />
              </SelectTrigger>
              <SelectContent>
                {experienceOptions.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {exp} {exp === '1' ? 'Year' : 'Years'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Salary Range */}
      <div className="space-y-2">
        <Label>Monthly In-hand Salary (₹) *</Label>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Min (e.g., 15000)"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            type="number"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            placeholder="Max (e.g., 25000)"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            type="number"
          />
        </div>
      </div>

      {/* Bonus Toggle */}
      <div className="space-y-2">
        <Label>Bonus / Incentive</Label>
        <div className="toggle-container">
          <button
            type="button"
            onClick={() => setHasBonus(true)}
            className={`toggle-option ${hasBonus ? 'active' : ''}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setHasBonus(false)}
            className={`toggle-option ${!hasBonus ? 'active' : ''}`}
          >
            No
          </button>
        </div>
      </div>

      {/* Job Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Job Description *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateDescription}
            disabled={generatingDescription || !title.trim()}
            className="gap-1.5"
          >
            {generatingDescription ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generatingDescription ? 'Generating...' : 'Generate with AI'}
          </Button>
        </div>
        <Textarea
          placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length}/5000 characters
        </p>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label>Required Skills *</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => addSkill(skillInput)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {commonSkills
            .filter((s) => !skills.includes(s))
            .slice(0, 5)
            .map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-accent transition-colors"
              >
                + {skill}
              </button>
            ))}
        </div>
      </div>

      {/* Additional Details Collapsible */}
      <Collapsible open={isAdditionalOpen} onOpenChange={setIsAdditionalOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between" type="button">
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Personal details, Education, Additional info
            </span>
            {isAdditionalOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/30">
          {/* Gender Preference */}
          <div className="space-y-2">
            <Label>Gender Preference</Label>
            <div className="toggle-container">
              {(['Any', 'Male', 'Female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`toggle-option ${gender === g ? 'active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Age Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Age</Label>
              <Input
                type="number"
                placeholder="e.g., 18"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Age</Label>
              <Input
                type="number"
                placeholder="e.g., 35"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>
          </div>

          {/* Education Level */}
          <div className="space-y-2">
            <Label>Minimum Education Level</Label>
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger>
                <SelectValue placeholder="Select education level" />
              </SelectTrigger>
              <SelectContent>
                {educationLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label>Language Requirements</Label>
            <div className="flex flex-wrap gap-2">
              {commonLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    languages.includes(lang)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label>Certification Required (Optional)</Label>
            <Input
              placeholder="e.g., PMP, AWS Certified, etc."
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes for Candidates</Label>
            <Textarea
              placeholder="Any other requirements or notes..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
