import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();

  const dashboardPath = profile?.user_type === 'employer' 
    ? '/employer-dashboard' 
    : '/candidate-dashboard';

  const profilePath = user
    ? (profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings')
    : '/login';

  const navItems = [
    { icon: Map, label: 'Explore', path: '/', isActive: location.pathname === '/' },
    { icon: Search, label: 'Browse', path: '/browse-jobs', isActive: location.pathname === '/browse-jobs' },
    { icon: Briefcase, label: 'Dashboard', path: user ? dashboardPath : '/login', isActive: location.pathname.includes('dashboard') },
    { icon: MessageSquare, label: 'Chat', path: user ? (profile?.user_type === 'employer' ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages') : '/login', isActive: location.pathname === '/messages' },
    { icon: User, label: 'Profile', path: profilePath, isActive: location.pathname.includes('settings') || location.pathname.includes('profile') },
  ];

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/95 backdrop-blur-2xl border-t border-border/40",
        "md:hidden",
        "safe-area-pb"
      )}
    >
      <div className="flex items-center justify-around h-[60px] px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                    "transition-all duration-200 active:scale-95",
                    item.isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="absolute top-1 w-5 h-[3px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    animate={{ y: item.isActive ? -1 : 0 }}
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
                    item.isActive ? "font-bold text-primary" : "font-medium text-foreground/60"
                  )}>
                    {item.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNavBar;
