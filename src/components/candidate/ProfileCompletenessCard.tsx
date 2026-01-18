import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, User, Briefcase, GraduationCap, MapPin, 
  FileText, Camera, Zap, TrendingUp, Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileItem {
  label: string;
  completed: boolean;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
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
    { label: 'Full Name', completed: !!profile?.full_name, icon: <User className="w-4 h-4" />, priority: 'high' },
    { label: 'Profile Photo', completed: !!profile?.avatar_url, icon: <Camera className="w-4 h-4" />, priority: 'high' },
    { label: 'Job Title', completed: !!candidate?.job_title, icon: <Briefcase className="w-4 h-4" />, priority: 'high' },
    { label: 'Skills', completed: !!(candidate?.skills && candidate.skills.length > 0), icon: <Zap className="w-4 h-4" />, priority: 'high' },
    { label: 'Experience', completed: !!(candidate?.experience_years && candidate.experience_years > 0), icon: <TrendingUp className="w-4 h-4" />, priority: 'medium' },
    { label: 'Education', completed: !!(candidate?.education && candidate.education.length > 0), icon: <GraduationCap className="w-4 h-4" />, priority: 'medium' },
    { label: 'Location', completed: !!(profile?.latitude && profile?.longitude), icon: <MapPin className="w-4 h-4" />, priority: 'medium' },
    { label: 'About/Bio', completed: !!(candidate?.bio && candidate.bio.length > 20), icon: <FileText className="w-4 h-4" />, priority: 'low' },
    { label: 'Resume', completed: !!candidate?.resume_url, icon: <FileText className="w-4 h-4" />, priority: 'high' },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const completeness = Math.round((completedCount / items.length) * 100);
  
  // Google colors for status
  const getStatusColor = () => {
    if (completeness === 100) return 'text-google-green';
    if (completeness >= 70) return 'text-google-yellow';
    return 'text-google-red';
  };

  const getProgressStroke = () => {
    if (completeness === 100) return 'hsl(142, 53%, 43%)'; // Google Green
    if (completeness >= 70) return 'hsl(44, 98%, 50%)'; // Google Yellow
    return 'hsl(5, 81%, 56%)'; // Google Red
  };

  const incompleteItems = items.filter(item => !item.completed);
  const highPriorityIncomplete = incompleteItems.filter(i => i.priority === 'high');

  return (
    <Card className="overflow-hidden border border-border shadow-google-lg bg-card">
      <CardHeader className="pb-3 bg-secondary/50 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-3 font-heading">
          <div className="p-2.5 bg-google-blue/10 rounded-xl">
            <Sparkles className="w-5 h-5 text-google-blue" />
          </div>
          <div className="flex-1">
            <span>Profile Strength</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Complete your profile to stand out
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Circular Progress */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle 
                cx="40" cy="40" r="34" fill="none" 
                stroke="hsl(var(--border))" strokeWidth="6"
              />
              <circle 
                cx="40" cy="40" r="34" fill="none" 
                stroke={getProgressStroke()} strokeWidth="6"
                strokeDasharray={`${completeness * 2.14} 214`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl font-bold font-heading", getStatusColor())}>
                {completeness}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{completedCount} of {items.length}</span>
              <span className="text-xs text-muted-foreground">completed</span>
            </div>
            {completeness === 100 ? (
              <p className="text-sm text-google-green flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Profile complete!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {highPriorityIncomplete.length > 0 
                  ? `${highPriorityIncomplete.length} high-priority items left`
                  : `${incompleteItems.length} items left to complete`}
              </p>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Checklist
          </p>
          <div className="grid gap-1.5">
            {items.map((item, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl transition-all duration-200 border",
                  item.completed 
                    ? "bg-google-green/5 border-google-green/20 text-google-green" 
                    : item.priority === 'high'
                      ? "bg-google-red/5 border-google-red/20 text-google-red"
                      : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  item.completed 
                    ? "bg-google-green text-white" 
                    : "border-2 border-current"
                )}>
                  {item.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current opacity-30" />
                  )}
                </div>
                <span className="flex items-center gap-2 flex-1 font-medium">
                  {item.icon}
                  {item.label}
                </span>
                {!item.completed && item.priority === 'high' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-google-red/10 text-google-red rounded-full">
                    Priority
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
