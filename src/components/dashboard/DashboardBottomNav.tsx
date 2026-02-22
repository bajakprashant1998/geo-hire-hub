import { cn } from '@/lib/utils';
import { Home, Briefcase, MessageSquare, User, Plus, Users, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

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
  { icon: Bell, label: 'Alerts', value: 'notifications' },
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
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden safe-area-pb"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = currentActive === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onItemClick(item.value)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomnav-active"
                  className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};
