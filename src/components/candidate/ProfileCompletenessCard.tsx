import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, User, Briefcase, GraduationCap, MapPin, FileText, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileItem {
  label: string;
  completed: boolean;
  icon: React.ReactNode;
}

interface ProfileCompletenessCardProps {
  profile: {
    full_name?: string;
    avatar_url?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  candidate: {
    job_title?: string;
    skills?: string[];
    experience_years?: number;
    bio?: string;
    education?: any[];
    resume_url?: string;
  } | null;
}

export const ProfileCompletenessCard = ({ profile, candidate }: ProfileCompletenessCardProps) => {
  const items: ProfileItem[] = [
    { label: 'Full Name', completed: !!profile?.full_name, icon: <User className="w-4 h-4" /> },
    { label: 'Profile Photo', completed: !!profile?.avatar_url, icon: <Camera className="w-4 h-4" /> },
    { label: 'Job Title', completed: !!candidate?.job_title, icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Skills', completed: !!(candidate?.skills && candidate.skills.length > 0), icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Experience', completed: !!(candidate?.experience_years && candidate.experience_years > 0), icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Education', completed: !!(candidate?.education && candidate.education.length > 0), icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Location', completed: !!(profile?.latitude && profile?.longitude), icon: <MapPin className="w-4 h-4" /> },
    { label: 'About/Bio', completed: !!(candidate?.bio && candidate.bio.length > 20), icon: <FileText className="w-4 h-4" /> },
    { label: 'Resume', completed: !!candidate?.resume_url, icon: <FileText className="w-4 h-4" /> },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const completeness = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="shadow-google">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          Profile Completeness
          <span className={cn(
            "text-2xl font-bold",
            completeness === 100 ? "text-success" : completeness >= 70 ? "text-warning" : "text-destructive"
          )}>
            {completeness}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={completeness} className="h-2" />
        
        {completeness < 100 && (
          <p className="text-sm text-muted-foreground">
            Complete your profile to increase visibility to employers
          </p>
        )}
        
        <div className="grid grid-cols-1 gap-2">
          {items.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm py-1 px-2 rounded-md transition-colors",
                item.completed ? "text-success bg-success/5" : "text-muted-foreground bg-muted/30"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
