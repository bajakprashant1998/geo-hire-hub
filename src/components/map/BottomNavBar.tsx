import { useNavigate, useLocation } from "react-router-dom";
 import { Map, Briefcase, MessageSquare, User, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    { 
      icon: Map, 
      label: 'Explore', 
      path: '/',
       isActive: location.pathname === '/',
       color: 'primary'
    },
    { 
      icon: Briefcase, 
      label: 'Jobs', 
      path: dashboardPath,
       isActive: location.pathname.includes('dashboard'),
       color: 'destructive'
    },
    { 
      icon: MessageSquare, 
      label: 'Chat', 
      path: '/messages',
       isActive: location.pathname === '/messages',
       color: 'success'
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: user ? settingsPath : '/login',
       isActive: location.pathname.includes('settings') || location.pathname.includes('profile'),
       color: 'primary'
    },
  ];

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
         "bg-card/95 backdrop-blur-xl border-t border-border/30",
        "md:hidden bottom-nav-height",
        "safe-area-pb"
      )}
    >
       <div className="flex items-center justify-around h-14 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                 "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                 "transition-all duration-200 touch-target",
                item.isActive 
                   ? `text-${item.color}` 
                   : "text-muted-foreground active:text-foreground active:scale-95"
              )}
            >
              {/* Active indicator */}
              {item.isActive && (
                <motion.div
                  layoutId="nav-indicator"
                   className={cn(
                     "absolute -top-px w-8 h-0.5 rounded-full",
                     item.color === 'destructive' ? 'bg-destructive' :
                     item.color === 'success' ? 'bg-success' : 'bg-primary'
                   )}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <motion.div
                animate={{ 
                   scale: item.isActive ? 1.05 : 1,
                   y: item.isActive ? -1 : 0
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                 className={cn(
                   "p-1 rounded-lg transition-colors",
                   item.isActive && "bg-current/10"
                 )}
              >
                 <Icon className={cn(
                   "w-5 h-5",
                   item.isActive && (
                     item.color === 'destructive' ? 'text-destructive' :
                     item.color === 'success' ? 'text-success' : 'text-primary'
                   )
                 )} />
              </motion.div>
              
              <span className={cn(
                 "text-[10px] transition-all",
                 item.isActive ? "font-semibold" : "font-medium"
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
