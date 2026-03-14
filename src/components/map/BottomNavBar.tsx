import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User, Search, Zap, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const profilePath = user
    ? (profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings')
    : '/login';

  const isEmployer = profile?.user_type === 'employer';

  // Quick action config based on user type
  const quickAction = !user
    ? { icon: Zap, label: 'Sign Up', path: '/signup' }
    : isEmployer
      ? { icon: Users, label: 'Talent', path: '/employer-dashboard?tab=candidates' }
      : { icon: Zap, label: 'Apply', path: '/candidate-dashboard?tab=jobs' };

  const navItems = [
    { icon: Map, label: 'Explore', path: '/', isActive: location.pathname === '/' },
    { icon: Search, label: 'Browse', path: '/browse-jobs', isActive: location.pathname === '/browse-jobs' },
    { icon: quickAction.icon, label: quickAction.label, path: quickAction.path, isActive: false, isQuickAction: true },
    { icon: Briefcase, label: 'Dashboard', path: user ? dashboardPath : '/login', isActive: location.pathname.includes('dashboard') },
    { icon: MessageSquare, label: 'Chat', path: user ? (isEmployer ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages') : '/login', isActive: location.pathname === '/messages' || location.search.includes('tab=chat') || location.search.includes('tab=messages') },
    { icon: User, label: 'Profile', path: profilePath, isActive: location.pathname.includes('settings') || location.pathname.includes('profile') },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/95 backdrop-blur-2xl border-t border-border/20",
        "md:hidden safe-area-pb"
      )}
    >
      <div className="flex items-center justify-around h-[60px] px-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isQuick = (item as any).isQuickAction;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                "transition-all duration-200 active:scale-90",
                item.isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute top-0 w-8 h-[3px] rounded-b-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <motion.div
                animate={{ y: item.isActive ? -2 : 0, scale: item.isActive ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isQuick ? "bg-primary/15" : item.isActive ? "bg-primary/10" : ""
                )}
              >
                <Icon className={cn(
                  "w-[18px] h-[18px] transition-colors",
                  isQuick ? "text-primary" : item.isActive ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>

              <span className={cn(
                "text-[9px] transition-all leading-none",
                isQuick ? "font-bold text-primary" : item.isActive ? "font-bold text-primary" : "font-medium text-foreground/50"
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

export default BottomNavBar;
