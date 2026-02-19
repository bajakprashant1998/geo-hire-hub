import { cn } from '@/lib/utils';
import { Home, Briefcase, MessageSquare, User, Plus, Users } from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  value: string;
}

interface DashboardBottomNavProps {
  type: 'candidate' | 'employer';
  activeItem: string | null;
  onItemClick: (value: string) => void;
}

const candidateItems: NavItem[] = [
  { icon: Home, label: 'Home', value: 'home' },
  { icon: Briefcase, label: 'Applied', value: 'jobs' },
  { icon: MessageSquare, label: 'Chat', value: 'messages' },
  { icon: User, label: 'Profile', value: 'profile' },
];

const employerItems: NavItem[] = [
  { icon: Home, label: 'Home', value: 'home' },
  { icon: Briefcase, label: 'Jobs', value: 'jobs' },
  { icon: MessageSquare, label: 'Chat', value: 'chat' },
  { icon: Users, label: 'Candidates', value: 'candidates' },
];

export const DashboardBottomNav = ({ type, activeItem, onItemClick }: DashboardBottomNavProps) => {
  const items = type === 'candidate' ? candidateItems : employerItems;
  const currentActive = activeItem || 'home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t shadow-lg md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = currentActive === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onItemClick(item.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors touch-target",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
