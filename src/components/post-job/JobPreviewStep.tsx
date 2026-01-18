import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Clock, 
  Briefcase, 
  DollarSign, 
  Users, 
  Calendar, 
  Building2,
  Mail,
  Phone,
  User,
  CheckCircle2,
  GraduationCap,
  Languages,
  Award
} from 'lucide-react';

interface JobPreviewStepProps {
  // Job Basics
  title: string;
  jobType: 'Full Time' | 'Part Time';
  address: string;
  openings: string;
  // Requirements
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
  // Timings
  shiftType: string;
  startTime: string;
  endTime: string;
  workDays: string[];
  interviewTime: string;
  interviewDays: string[];
  // Company
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  contactRole: string;
  organizationSize: string;
  hiringUrgency: 'Immediately' | 'Can Wait';
  isVerified: boolean;
}

export const JobPreviewStep = ({
  title,
  jobType,
  address,
  openings,
  experienceType,
  minExperience,
  maxExperience,
  salaryMin,
  salaryMax,
  hasBonus,
  description,
  skills,
  gender,
  ageMin,
  ageMax,
  education,
  languages,
  certifications,
  shiftType,
  startTime,
  endTime,
  workDays,
  interviewTime,
  interviewDays,
  companyName,
  contactPerson,
  phoneNumber,
  email,
  contactRole,
  organizationSize,
  hiringUrgency,
  isVerified,
}: JobPreviewStepProps) => {
  const formatSalary = () => {
    if (salaryMin && salaryMax) {
      return `₹${parseInt(salaryMin).toLocaleString()} - ₹${parseInt(salaryMax).toLocaleString()}/month`;
    }
    if (salaryMin) return `₹${parseInt(salaryMin).toLocaleString()}/month`;
    if (salaryMax) return `₹${parseInt(salaryMax).toLocaleString()}/month`;
    return 'Not specified';
  };

  const formatExperience = () => {
    if (experienceType === 'Any') return 'Any experience level';
    if (experienceType === 'Fresher Only') return 'Freshers welcome';
    if (minExperience && maxExperience) {
      return `${minExperience} - ${maxExperience} years experience`;
    }
    return 'Experienced candidates only';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Preview Your Job</h2>
        <p className="text-muted-foreground">
          This is how your job will appear to candidates. Review all details before posting.
        </p>
      </div>

      {/* Job Card Preview */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-foreground">{title || 'Job Title'}</h3>
                {isVerified && (
                  <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{companyName || 'Company Name'}</span>
              </div>
            </div>
            <Badge variant={hiringUrgency === 'Immediately' ? 'default' : 'secondary'}>
              {hiringUrgency === 'Immediately' ? 'Urgent' : 'Open'}
            </Badge>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium truncate max-w-[120px]">{address || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium">{jobType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="font-medium text-success">{formatSalary()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Openings</p>
                <p className="font-medium">{openings || '1'} position{parseInt(openings) > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Description */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Job Description
            </h4>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {description || 'No description provided.'}
            </p>
            {hasBonus && (
              <Badge variant="outline" className="mt-3 gap-1 border-success/30 text-success">
                <CheckCircle2 className="w-3 h-3" />
                Bonus / Incentive Available
              </Badge>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Required Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="bg-muted">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Requirements
              </h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="font-medium">{formatExperience()}</span>
                </p>
                {gender !== 'Any' && (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium">{gender}</span>
                  </p>
                )}
                {(ageMin || ageMax) && (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{ageMin || '18'} - {ageMax || '60'} years</span>
                  </p>
                )}
                {education && (
                  <p className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{education}</span>
                  </p>
                )}
                {languages.length > 0 && (
                  <p className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{languages.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Work Schedule
              </h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Shift:</span>
                  <span className="font-medium">{shiftType}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Hours:</span>
                  <span className="font-medium">{startTime} - {endTime}</span>
                </p>
                {workDays.length > 0 && (
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Days:</span>
                    <span className="font-medium">{workDays.length === 7 ? 'All days' : workDays.slice(0, 3).map(d => d.slice(0, 3)).join(', ')}{workDays.length > 3 ? '...' : ''}</span>
                  </p>
                )}
                {interviewDays.length > 0 && interviewTime && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Interviews: {interviewDays.slice(0, 2).map(d => d.slice(0, 3)).join(', ')} at {interviewTime}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Contact Information
            </h4>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{contactPerson || 'Not specified'}</p>
                  {contactRole && <p className="text-xs text-muted-foreground">{contactRole}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{phoneNumber || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium truncate">{email || 'Not specified'}</span>
              </div>
            </div>
            {organizationSize && (
              <p className="text-sm text-muted-foreground mt-3">
                Company Size: {organizationSize}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="bg-success/5 border-success/20">
        <CardContent className="p-4">
          <h4 className="font-semibold text-success mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Ready to Post
          </h4>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Job title and type defined</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Location set on map</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Salary range specified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Job description added</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Required skills listed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Contact details complete</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
