import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User, Search } from "lucide-react";
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

  const navItems = [
    { icon: Map, label: 'Explore', path: '/', isActive: location.pathname === '/' },
    { icon: Search, label: 'Browse', path: '/browse-jobs', isActive: location.pathname === '/browse-jobs' },
    { icon: Briefcase, label: 'Dashboard', path: user ? dashboardPath : '/login', isActive: location.pathname.includes('dashboard') },
    { icon: MessageSquare, label: 'Chat', path: user ? (profile?.user_type === 'employer' ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages') : '/login', isActive: location.pathname === '/messages' || location.search.includes('tab=chat') || location.search.includes('tab=messages') },
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
      <div className="flex items-center justify-around h-[60px] px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
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
                  className="absolute top-0 w-12 h-[3px] rounded-b-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <motion.div
                animate={{ y: item.isActive ? -2 : 0, scale: item.isActive ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  item.isActive && "bg-primary/10"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  item.isActive ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>

              <span className={cn(
                "text-[9px] transition-all leading-none",
                item.isActive ? "font-bold text-primary" : "font-medium text-foreground/50"
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
