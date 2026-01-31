import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User } from "lucide-react";
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
      isActive: location.pathname === '/'
    },
    { 
      icon: Briefcase, 
      label: 'Jobs', 
      path: dashboardPath,
      isActive: location.pathname.includes('dashboard')
    },
    { 
      icon: MessageSquare, 
      label: 'Chat', 
      path: '/messages',
      isActive: location.pathname === '/messages'
    },
    { 
      icon: User, 
      label: 'Profile', 
      path: user ? settingsPath : '/login',
      isActive: location.pathname.includes('settings') || location.pathname.includes('profile')
    },
  ];

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/98 backdrop-blur-xl border-t border-border/50",
        "md:hidden bottom-nav-height",
        "safe-area-pb"
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-1",
                "transition-all touch-target touch-scale",
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {/* Active indicator */}
              {item.isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-10 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <motion.div
                animate={{ 
                  scale: item.isActive ? 1.1 : 1,
                  y: item.isActive ? -2 : 0
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              
              <span className={cn(
                "text-[10px] font-medium transition-all",
                item.isActive && "font-semibold"
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
