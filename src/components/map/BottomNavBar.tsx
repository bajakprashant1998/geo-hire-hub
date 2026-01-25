import { useNavigate, useLocation } from "react-router-dom";
import { Map, Briefcase, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
      label: 'Map', 
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
      label: 'Messages', 
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform",
                item.isActive && "scale-110"
              )} />
              <span className={cn(
                "text-xs font-medium",
                item.isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {item.isActive && (
                <div className="absolute bottom-1 w-8 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
