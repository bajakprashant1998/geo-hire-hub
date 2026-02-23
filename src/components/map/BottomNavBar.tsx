import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User } from "lucide-react";
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

  const settingsPath = profile?.user_type === 'employer'
    ? '/company-profile'
    : '/candidate-settings';

  const navItems = [
    { icon: Map, label: 'Explore', path: '/', isActive: location.pathname === '/' },
    { icon: Briefcase, label: 'Jobs', path: dashboardPath, isActive: location.pathname.includes('dashboard') },
    { icon: MessageSquare, label: 'Chat', path: '/messages', isActive: location.pathname === '/messages' },
    { icon: User, label: 'Profile', path: user ? settingsPath : '/login', isActive: location.pathname.includes('settings') || location.pathname.includes('profile') },
  ];

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card backdrop-blur-2xl border-t border-border/40",
        "md:hidden bottom-nav-height",
        "safe-area-pb"
      )}
    >
      <div className="flex items-center justify-around h-[56px] px-2">
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
                  {/* Active indicator dot */}
                  {item.isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="absolute top-1.5 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    animate={{ 
                      y: item.isActive ? -1 : 0,
                    }}
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
                    "text-[10px] transition-all leading-none",
                    item.isActive ? "font-bold text-primary" : "font-semibold text-foreground/60"
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