import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Building2, 
  User, 
  Briefcase, 
  Settings,
  Users,
  Globe,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'employer' | 'candidate' | 'job' | 'page';
  title: string;
  subtitle?: string;
  href: string;
}

const ADMIN_PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview & stats', href: '/admin' },
  { id: 'employers', type: 'page', title: 'Employers', subtitle: 'Manage employers', href: '/admin/employers' },
  { id: 'jobs', type: 'page', title: 'Jobs', subtitle: 'Job moderation', href: '/admin/jobs' },
  { id: 'candidates', type: 'page', title: 'Candidates', subtitle: 'Candidate management', href: '/admin/candidates' },
  { id: 'users', type: 'page', title: 'Users', subtitle: 'User accounts', href: '/admin/users' },
  { id: 'analytics', type: 'page', title: 'Analytics', subtitle: 'Platform analytics', href: '/admin/analytics' },
  { id: 'government', type: 'page', title: 'Government Domains', subtitle: 'Trusted domains', href: '/admin/government' },
  { id: 'messages', type: 'page', title: 'Messages', subtitle: 'Message moderation', href: '/admin/messages' },
  { id: 'plans', type: 'page', title: 'Plans & Revenue', subtitle: 'Subscription plans', href: '/admin/plans' },
  { id: 'reports', type: 'page', title: 'Reports', subtitle: 'User reports', href: '/admin/reports' },
  { id: 'settings', type: 'page', title: 'Settings', subtitle: 'Platform settings', href: '/admin/settings' },
];

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search employers
  const { data: employers } = useQuery({
    queryKey: ['quick-search-employers', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await supabase
        .from('employers')
        .select('id, company_name')
        .ilike('company_name', `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: open && search.length >= 2,
  });

  // Search candidates
  const { data: candidates } = useQuery({
    queryKey: ['quick-search-candidates', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await supabase
        .from('candidates')
        .select('id, job_title, profile:profiles!candidates_profile_id_fkey(full_name)')
        .or(`job_title.ilike.%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: open && search.length >= 2,
  });

  // Search jobs
  const { data: jobs } = useQuery({
    queryKey: ['quick-search-jobs', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data } = await supabase
        .from('jobs')
        .select('id, title, employer:employers!jobs_employer_id_fkey(company_name)')
        .ilike('title', `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: open && search.length >= 2,
  });

  // Combine results
  const results: SearchResult[] = [
    // Pages (always show if matching)
    ...ADMIN_PAGES.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subtitle?.toLowerCase().includes(search.toLowerCase())
    ),
    // Employers
    ...(employers?.map(e => ({
      id: e.id,
      type: 'employer' as const,
      title: e.company_name,
      subtitle: 'Employer',
      href: `/admin/employers?search=${encodeURIComponent(e.company_name)}`
    })) || []),
    // Candidates
    ...(candidates?.map(c => ({
      id: c.id,
      type: 'candidate' as const,
      title: (c.profile as { full_name: string } | null)?.full_name || 'Unknown',
      subtitle: c.job_title,
      href: `/admin/candidates?search=${encodeURIComponent((c.profile as { full_name: string } | null)?.full_name || '')}`
    })) || []),
    // Jobs
    ...(jobs?.map(j => ({
      id: j.id,
      type: 'job' as const,
      title: j.title,
      subtitle: (j.employer as { company_name: string } | null)?.company_name,
      href: `/admin/jobs?search=${encodeURIComponent(j.title)}`
    })) || []),
  ];

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.href);
    setOpen(false);
    setSearch('');
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, handleSelect]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'employer': return <Building2 className="h-4 w-4" />;
      case 'candidate': return <User className="h-4 w-4" />;
      case 'job': return <Briefcase className="h-4 w-4" />;
      case 'page': return <Settings className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted/50 rounded-lg border border-border/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-lg gap-0">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employers, candidates, jobs..."
              className="border-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
          
          <ScrollArea className="max-h-[400px]">
            {results.length === 0 && search.length >= 2 && (
              <div className="py-6 text-center text-muted-foreground">
                No results found
              </div>
            )}
            
            {search.length < 2 && (
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1">Quick Navigation</p>
                {ADMIN_PAGES.slice(0, 6).map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => handleSelect(page)}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left transition-colors",
                      selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    {getIcon(page.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.length > 0 && search.length >= 2 && (
              <div className="p-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left transition-colors",
                      selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    {getIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {result.type}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center gap-4 px-3 py-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted">esc</kbd>
              to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
