import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, Plus, X, Sparkles, Loader2, Users, Info, GraduationCap, Award, Gift } from 'lucide-react';
import { CURRENCIES, getCurrencyByCode } from '@/lib/currencies';

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
  referralBounty: string;
  setReferralBounty: (bounty: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  skills: string[];
  setSkills: (skills: string[]) => void;
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
  salaryCurrency: string;
  setSalaryCurrency: (currency: string) => void;
  benefits: string[];
  setBenefits: (benefits: string[]) => void;
}

const experienceOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const educationLevels = [
  'No formal education', 'High School', '10th Pass', '12th Pass',
  'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD'
];
const commonLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati'];
const commonSkills = ['Communication', 'MS Office', 'Excel', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management', 'Data Analysis', 'Customer Service'];
const commonBenefits = [
  'Health Insurance', 'Provident Fund', 'Paid Leave', 'Performance Bonus',
  'Free Meals', 'Transport', 'Training', 'Flexible Hours', 'Work from Home',
  'Gym Membership', 'Team Outings', 'Stock Options'
];

export const CandidateRequirementSection = ({
  experienceType, setExperienceType,
  minExperience, setMinExperience,
  maxExperience, setMaxExperience,
  salaryMin, setSalaryMin,
  salaryMax, setSalaryMax,
  hasBonus, setHasBonus,
  referralBounty, setReferralBounty,
  description, setDescription,
  skills, setSkills,
  gender, setGender,
  ageMin, setAgeMin,
  ageMax, setAgeMax,
  education, setEducation,
  languages, setLanguages,
  certifications, setCertifications,
  additionalNotes, setAdditionalNotes,
  onGenerateDescription, generatingDescription,
  title, salaryCurrency, setSalaryCurrency,
  benefits, setBenefits,
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

  const toggleBenefit = (benefit: string) => {
    if (benefits.includes(benefit)) {
      setBenefits(benefits.filter((b) => b !== benefit));
    } else {
      setBenefits([...benefits, benefit]);
    }
  };

  const descriptionQuality = description.length >= 200 ? 'excellent' : description.length >= 100 ? 'good' : description.length >= 50 ? 'fair' : 'short';

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Requirements & Details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define what you're looking for — skills, experience, and compensation
          </p>
        </div>
      </div>

      {/* Experience Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Experience Level *</Label>
          <Tooltip>
            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent>Select the experience level required for this role</TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['Any', 'Fresher Only', 'Experienced Only'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setExperienceType(type)}
              className={`relative p-3 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                experienceType === type
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border hover:border-primary/40 text-muted-foreground'
              }`}
            >
              {type === 'Any' ? '🎯 Any' : type === 'Fresher Only' ? '🌱 Freshers' : '💼 Experienced'}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Range */}
      {experienceType === 'Experienced Only' && (
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border">
          <div className="space-y-2">
            <Label className="text-sm">Min Experience</Label>
            <Select value={minExperience} onValueChange={setMinExperience}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Min Years" /></SelectTrigger>
              <SelectContent>
                {experienceOptions.map((exp) => (
                  <SelectItem key={exp} value={exp}>{exp} {exp === '1' ? 'Year' : 'Years'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Max Experience</Label>
            <Select value={maxExperience} onValueChange={setMaxExperience}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Max Years" /></SelectTrigger>
              <SelectContent>
                {experienceOptions.map((exp) => (
                  <SelectItem key={exp} value={exp}>{exp} {exp === '1' ? 'Year' : 'Years'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Salary Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Monthly Salary *</Label>
          <Tooltip>
            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent>Jobs with salary details get 3x more applications</TooltipContent>
          </Tooltip>
        </div>
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-1.5">
                    <span>{c.flag}</span> <span>{c.code}</span>
                    <span className="text-muted-foreground">({c.symbol})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input placeholder="Min (e.g., 15000)" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} type="number" className="h-11" />
            </div>
            <span className="text-muted-foreground font-medium">to</span>
            <div className="flex-1">
              <Input placeholder="Max (e.g., 25000)" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} type="number" className="h-11" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={hasBonus} onCheckedChange={setHasBonus} />
              <Label className="text-sm text-muted-foreground cursor-pointer">Includes bonus / incentive</Label>
            </div>
            {hasBonus && <Badge variant="outline" className="text-success border-success/30">+ Bonus</Badge>}
          </div>

          {/* Referral Bounty */}
          <div className="pt-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-primary" />
              Referral Bounty (Optional)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">Offer points to users who refer successful candidates</p>
            <Input
              placeholder="e.g., 500 (points awarded on hire)"
              value={referralBounty}
              onChange={(e) => setReferralBounty(e.target.value)}
              type="number"
              min="0"
              className="h-11"
            />
          </div>
        </div>
      </div>

      {/* Job Description */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Job Description *</Label>
          </div>
          <Button
            type="button" variant="outline" size="sm"
            onClick={onGenerateDescription}
            disabled={generatingDescription || !title.trim()}
            className="gap-1.5 rounded-lg"
          >
            {generatingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
            {generatingDescription ? 'Generating...' : 'AI Generate'}
          </Button>
        </div>
        <Textarea
          placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={5000}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`text-xs ${
            descriptionQuality === 'excellent' ? 'border-success/40 text-success' :
            descriptionQuality === 'good' ? 'border-primary/40 text-primary' :
            descriptionQuality === 'fair' ? 'border-warning/40 text-warning' :
            'border-muted-foreground/40 text-muted-foreground'
          }`}>
            {descriptionQuality === 'excellent' ? '✨ Excellent' :
             descriptionQuality === 'good' ? '✓ Good' :
             descriptionQuality === 'fair' ? '⚠ Fair' : '📝 Too short'}
          </Badge>
          <span className="text-xs text-muted-foreground">{description.length}/5000</span>
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Required Skills *</Label>
          <Badge variant="secondary" className="text-xs">{skills.length} added</Badge>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1 py-1.5 px-3 text-sm">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Type a skill and press Enter..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
            className="h-11"
          />
          <Button type="button" variant="outline" size="icon" onClick={() => addSkill(skillInput)} className="h-11 w-11 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Suggestions:</span>
          {commonSkills.filter((s) => !skills.includes(s)).slice(0, 6).map((skill) => (
            <button key={skill} type="button" onClick={() => addSkill(skill)}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 transition-colors">
              + {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Benefits & Perks</Label>
          <Tooltip>
            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent>Highlight perks to attract more candidates</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          {commonBenefits.map((benefit) => (
            <button
              key={benefit} type="button"
              onClick={() => toggleBenefit(benefit)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                benefits.includes(benefit)
                  ? 'bg-success/10 text-success border-success/30 font-medium'
                  : 'bg-background hover:bg-accent border-border text-muted-foreground'
              }`}
            >
              {benefits.includes(benefit) ? '✓ ' : ''}{benefit}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Details */}
      <Collapsible open={isAdditionalOpen} onOpenChange={setIsAdditionalOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between rounded-xl h-12" type="button">
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Education, Languages & More
            </span>
            {isAdditionalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 mt-4 p-5 border rounded-xl bg-muted/20">
          {/* Gender Preference */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Gender Preference</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['Any', 'Male', 'Female'] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`p-2.5 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                    gender === g ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Age Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Minimum Age</Label>
              <Input type="number" placeholder="e.g., 18" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Maximum Age</Label>
              <Input type="number" placeholder="e.g., 35" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="h-11" />
            </div>
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Minimum Education</Label>
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select education level" /></SelectTrigger>
              <SelectContent>
                {educationLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Languages</Label>
            <div className="flex flex-wrap gap-2">
              {commonLanguages.map((lang) => (
                <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    languages.includes(lang)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}>
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label className="text-sm">Certification Required</Label>
            <Input placeholder="e.g., PMP, AWS Certified, etc." value={certifications} onChange={(e) => setCertifications(e.target.value)} className="h-11" />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label className="text-sm">Additional Notes</Label>
            <Textarea placeholder="Any other requirements..." value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} className="resize-none" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
