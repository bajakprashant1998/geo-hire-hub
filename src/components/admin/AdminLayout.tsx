import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  Users, 
  CreditCard, 
  Flag, 
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Globe,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { QuickSearch } from '@/components/admin/QuickSearch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/employers', label: 'Employers', icon: Building2 },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/candidates', label: 'Candidates', icon: Users },
  { href: '/admin/government', label: 'Government', icon: Shield },
  { href: '/admin/messages', label: 'Messages', icon: Flag },
  { href: '/admin/plans', label: 'Plans & Revenue', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/login', { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden md:block w-64 border-r bg-card p-4">
          <Skeleton className="h-8 w-32 mb-8" />
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
        <div className="flex-1 p-4 md:p-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Admin Panel</span>
        </Link>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground min-h-[44px]"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b bg-card px-4 md:px-6 py-3 md:py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold flex-1">{title}</h1>
          <QuickSearch />
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
