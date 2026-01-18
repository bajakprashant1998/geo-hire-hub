import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, Circle, User, Briefcase, GraduationCap, MapPin, 
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
  
  const getStatusColor = () => {
    if (completeness === 100) return 'text-emerald-500';
    if (completeness >= 70) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getProgressColor = () => {
    if (completeness === 100) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    if (completeness >= 70) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-rose-500 to-pink-500';
  };

  const incompleteItems = items.filter(item => !item.completed);
  const highPriorityIncomplete = incompleteItems.filter(i => i.priority === 'high');

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/80">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <span>Profile Strength</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Complete your profile to stand out
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Circular Progress */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle 
                cx="40" cy="40" r="34" fill="none" 
                stroke="currentColor" strokeWidth="8"
                className="text-secondary"
              />
              <circle 
                cx="40" cy="40" r="34" fill="none" 
                stroke="url(#progressGradient)" strokeWidth="8"
                strokeDasharray={`${completeness * 2.14} 214`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={completeness >= 70 ? (completeness === 100 ? '#10b981' : '#f59e0b') : '#f43f5e'} />
                  <stop offset="100%" stopColor={completeness >= 70 ? (completeness === 100 ? '#14b8a6' : '#f97316') : '#ec4899'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl font-bold", getStatusColor())}>
                {completeness}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{completedCount} of {items.length}</span>
              <span className="text-xs text-muted-foreground">completed</span>
            </div>
            {completeness === 100 ? (
              <p className="text-sm text-emerald-600 flex items-center gap-1">
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Checklist
          </p>
          <div className="grid gap-1.5">
            {items.map((item, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 text-sm py-2 px-3 rounded-xl transition-all duration-200",
                  item.completed 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" 
                    : item.priority === 'high'
                      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  item.completed 
                    ? "bg-emerald-500 text-white" 
                    : "border-2 border-current"
                )}>
                  {item.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current opacity-30" />
                  )}
                </div>
                <span className="flex items-center gap-2 flex-1">
                  {item.icon}
                  {item.label}
                </span>
                {!item.completed && item.priority === 'high' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900 rounded-full">
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
