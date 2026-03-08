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
  Globe,
  MessageSquare,
  BarChart3,
  Mail,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Crown,
  AlertTriangle,
  Clock,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { QuickSearch } from '@/components/admin/QuickSearch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/admin/applications', label: 'Applications', icon: Briefcase },
      { href: '/admin/categories', label: 'Categories', icon: Globe },
      { href: '/admin/content-seo', label: 'Content & SEO', icon: FileText },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/employers', label: 'Employers', icon: Building2 },
      { href: '/admin/candidates', label: 'Candidates', icon: Users },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { href: '/admin/moderation', label: 'Moderation', icon: Flag },
      { href: '/admin/reports', label: 'Reports', icon: Flag },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
      { href: '/admin/notifications', label: 'Notifications', icon: MessageSquare },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/plans', label: 'Plans & Revenue', icon: CreditCard },
      { href: '/admin/revenue', label: 'Revenue Analytics', icon: DollarSign },
      { href: '/admin/roles', label: 'Role Management', icon: Crown },
      { href: '/admin/fraud', label: 'Fraud Detection', icon: AlertTriangle },
      { href: '/admin/scheduled-jobs', label: 'Scheduled Jobs', icon: Clock },
      { href: '/admin/government', label: 'Government', icon: Shield },
      { href: '/admin/email-templates', label: 'Email Templates', icon: Mail },
      { href: '/admin/tasks', label: 'Tasks', icon: FileText },
      { href: '/admin/auto-apply', label: 'Auto Apply', icon: Activity },
      { href: '/admin/system-health', label: 'System Health', icon: Activity },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/login', { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Build breadcrumb
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/admin') return null;
    const segment = path.replace('/admin/', '');
    const allItems = navSections.flatMap(s => s.items);
    const item = allItems.find(i => i.href === path);
    return item?.label || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  if (!isAdmin) return null;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border/40">
        <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && <span className="font-semibold text-lg">Admin</span>}
        </Link>
      </div>
      
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 min-h-[40px] relative',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary/10 text-primary border-l-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="opacity-40" />
      <div className="p-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full gap-2.5 text-muted-foreground min-h-[40px] text-sm',
            collapsed ? 'justify-center px-2' : 'justify-start'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </>
  );

  const breadcrumbLabel = getBreadcrumb();

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden md:flex border-r border-border/40 bg-card/95 backdrop-blur-sm flex-col transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-60'
      )}>
        <SidebarContent />
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
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
        <header className="sticky top-0 z-10 border-b border-border/40 bg-card/95 backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-accent" />
          <div className="px-4 md:px-6 py-3 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold truncate">{title}</h1>
              {breadcrumbLabel && (
                <Breadcrumb className="mt-0.5">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/admin" className="text-xs">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-xs">{breadcrumbLabel}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            <QuickSearch />
          </div>
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
