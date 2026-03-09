import { cn } from '@/lib/utils';
import { Home, Briefcase, MessageSquare, User, Bell, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: number;
}

interface DashboardBottomNavProps {
  type: 'candidate' | 'employer';
  activeItem: string | null;
  onItemClick: (value: string) => void;
  messageBadge?: number;
  notificationBadge?: number;
}

export const DashboardBottomNav = ({ type, activeItem, onItemClick, messageBadge = 0, notificationBadge = 0 }: DashboardBottomNavProps) => {
  const candidateItems: NavItem[] = [
    { icon: Home, label: 'Home', value: 'home' },
    { icon: Search, label: 'Jobs', value: 'job-radar' },
    { icon: Briefcase, label: 'Applied', value: 'jobs' },
    { icon: MessageSquare, label: 'Chat', value: 'messages', badge: messageBadge },
    { icon: User, label: 'Profile', value: 'profile' },
  ];

  const employerItems: NavItem[] = [
    { icon: Home, label: 'Home', value: 'home' },
    { icon: Briefcase, label: 'Jobs', value: 'jobs' },
    { icon: MessageSquare, label: 'Chat', value: 'chat', badge: messageBadge },
    { icon: Users, label: 'Applicants', value: 'candidates' },
    { icon: Bell, label: 'Alerts', value: 'notifications', badge: notificationBadge },
  ];

  const items = type === 'candidate' ? candidateItems : employerItems;
  const currentActive = activeItem || 'home';

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-xl border-t border-border/30 shadow-[0_-2px_16px_rgba(0,0,0,0.06)] md:hidden safe-area-pb"
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {items.map((item) => {
          const isActive = currentActive === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onItemClick(item.value)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomnav-pill"
                  className="absolute top-0 w-10 h-[2.5px] bg-primary rounded-b-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  "w-10 h-8 rounded-xl flex items-center justify-center transition-colors duration-150 relative",
                  isActive ? "bg-primary/10" : ""
                )}
              >
                <item.icon className={cn(
                  "w-[18px] h-[18px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                {/* Badge dot */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center px-0.5 shadow-sm shadow-destructive/30"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </motion.span>
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-medium leading-tight",
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
