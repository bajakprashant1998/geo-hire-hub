import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Clock, Briefcase, DollarSign, Users, Calendar, Building2,
  Mail, Phone, User, CheckCircle2, GraduationCap, Languages, Award,
  Wifi, Heart, Eye
} from 'lucide-react';

interface JobPreviewStepProps {
  title: string;
  jobType: 'Full Time' | 'Part Time';
  address: string;
  openings: string;
  experienceType: 'Any' | 'Fresher Only' | 'Experienced Only';
  minExperience: string;
  maxExperience: string;
  salaryMin: string;
  salaryMax: string;
  hasBonus: boolean;
  description: string;
  skills: string[];
  gender: 'Any' | 'Male' | 'Female';
  ageMin: string;
  ageMax: string;
  education: string;
  languages: string[];
  certifications: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  workDays: string[];
  interviewTime: string;
  interviewDays: string[];
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  contactRole: string;
  organizationSize: string;
  hiringUrgency: 'Immediately' | 'Can Wait';
  isVerified: boolean;
  workMode?: string;
  benefits?: string[];
}

export const JobPreviewStep = ({
  title, jobType, address, openings,
  experienceType, minExperience, maxExperience,
  salaryMin, salaryMax, hasBonus,
  description, skills,
  gender, ageMin, ageMax, education, languages, certifications,
  shiftType, startTime, endTime, workDays,
  interviewTime, interviewDays,
  companyName, contactPerson, phoneNumber, email, contactRole,
  organizationSize, hiringUrgency, isVerified,
  workMode = 'onsite', benefits = [],
}: JobPreviewStepProps) => {
  const formatSalary = () => {
    if (salaryMin && salaryMax) return `₹${parseInt(salaryMin).toLocaleString()} - ₹${parseInt(salaryMax).toLocaleString()}/month`;
    if (salaryMin) return `₹${parseInt(salaryMin).toLocaleString()}/month`;
    if (salaryMax) return `₹${parseInt(salaryMax).toLocaleString()}/month`;
    return 'Not specified';
  };

  const formatExperience = () => {
    if (experienceType === 'Any') return 'Any experience level';
    if (experienceType === 'Fresher Only') return 'Freshers welcome';
    if (minExperience && maxExperience) return `${minExperience} - ${maxExperience} years`;
    return 'Experienced candidates';
  };

  const completionChecks = [
    { label: 'Job title and type', done: !!title },
    { label: 'Location set', done: workMode === 'remote' || !!address },
    { label: 'Salary range', done: !!(salaryMin || salaryMax) },
    { label: 'Job description', done: description.length >= 50 },
    { label: 'Required skills', done: skills.length > 0 },
    { label: 'Contact details', done: !!(contactPerson && phoneNumber && email) },
  ];
  const completedCount = completionChecks.filter(c => c.done).length;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <Eye className="w-6 h-6 text-success" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Preview & Publish</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review how your job will appear to candidates
          </p>
        </div>
      </div>

      {/* Completion Score */}
      <div className={`p-4 rounded-xl border-2 ${completedCount === completionChecks.length ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${completedCount === completionChecks.length ? 'text-success' : 'text-warning'}`} />
            Completion: {completedCount}/{completionChecks.length}
          </h4>
          <Badge variant={completedCount === completionChecks.length ? 'default' : 'secondary'} className={completedCount === completionChecks.length ? 'bg-success' : ''}>
            {completedCount === completionChecks.length ? 'Ready to Post!' : 'Almost there'}
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {completionChecks.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.done ? 'text-success' : 'text-muted-foreground/40'}`} />
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Card */}
      <div className="rounded-2xl border-2 border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-xl font-bold text-foreground">{title || 'Job Title'}</h3>
                {isVerified && (
                  <Badge className="gap-1 bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{companyName || 'Company Name'}</span>
              </div>
            </div>
            <Badge variant={hiringUrgency === 'Immediately' ? 'destructive' : 'secondary'}>
              {hiringUrgency === 'Immediately' ? '🔥 Urgent' : 'Open'}
            </Badge>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline"><Briefcase className="w-3 h-3 mr-1" />{jobType}</Badge>
            <Badge variant="outline">
              {workMode === 'remote' ? <><Wifi className="w-3 h-3 mr-1" />Remote</> :
               workMode === 'hybrid' ? <><MapPin className="w-3 h-3 mr-1" />Hybrid</> :
               <><MapPin className="w-3 h-3 mr-1" />On-site</>}
            </Badge>
            <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{shiftType}</Badge>
            {openings && parseInt(openings) > 1 && (
              <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{openings} openings</Badge>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted/30">
          {[
            { icon: MapPin, label: 'Location', value: workMode === 'remote' ? 'Remote' : (address || 'Not set'), color: 'text-primary' },
            { icon: DollarSign, label: 'Salary', value: formatSalary(), color: 'text-success' },
            { icon: Users, label: 'Experience', value: formatExperience(), color: 'text-primary' },
            { icon: Calendar, label: 'Work Days', value: workDays.length === 7 ? 'All days' : `${workDays.length} days/wk`, color: 'text-primary' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center p-3 bg-card rounded-lg">
              <item.icon className={`w-4 h-4 ${item.color} mb-1`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-semibold mt-0.5 truncate max-w-full">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2 text-sm">Job Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {description || 'No description provided.'}
            </p>
            {hasBonus && (
              <Badge variant="outline" className="mt-3 gap-1 border-success/30 text-success">
                <CheckCircle2 className="w-3 h-3" /> Bonus / Incentive Available
              </Badge>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><Award className="w-4 h-4" /> Skills</h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
              </div>
            </div>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><Heart className="w-4 h-4" /> Benefits</h4>
              <div className="flex flex-wrap gap-2">
                {benefits.map((b, i) => <Badge key={i} variant="outline" className="bg-success/5 text-success border-success/20">✓ {b}</Badge>)}
              </div>
            </div>
          )}

          <Separator />

          {/* Requirements & Schedule */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Requirements</h4>
              <div className="space-y-1.5 text-sm">
                {education && <p className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />{education}</p>}
                {gender !== 'Any' && <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" />{gender} preferred</p>}
                {(ageMin || ageMax) && <p className="text-muted-foreground">Age: {ageMin || '18'} - {ageMax || '60'} years</p>}
                {languages.length > 0 && <p className="flex items-center gap-2"><Languages className="w-3.5 h-3.5 text-muted-foreground" />{languages.join(', ')}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Schedule</h4>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>Hours: {startTime} - {endTime}</p>
                {interviewDays.length > 0 && interviewTime && (
                  <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />Interviews: {interviewDays.slice(0, 2).map(d => d.slice(0, 3)).join(', ')} at {interviewTime}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3 text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Contact</h4>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{contactPerson || '—'}</p>
                  {contactRole && <p className="text-xs text-muted-foreground">{contactRole}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{phoneNumber || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{email || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
