import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardSkeletonProps {
  type?: 'candidate' | 'employer';
}

export const DashboardSkeleton = ({ type = 'candidate' }: DashboardSkeletonProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Actions Bar Skeleton */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40 skeleton-shimmer" />
              <Skeleton className="h-3 w-64 skeleton-shimmer" />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-24 sm:w-28 skeleton-shimmer" />
            <Skeleton className="h-9 w-24 sm:w-28 skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-card rounded-xl border-t-4 border-muted p-4 sm:p-5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 skeleton-shimmer" />
                <Skeleton className="h-8 w-16 skeleton-shimmer" />
                <Skeleton className="h-3 w-24 skeleton-shimmer" />
              </div>
              <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Preview Skeleton */}
        <div className="lg:col-span-2 bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 skeleton-shimmer" />
                <Skeleton className="h-3 w-24 skeleton-shimmer" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 skeleton-shimmer hidden sm:block" />
              <Skeleton className="h-8 w-24 skeleton-shimmer hidden sm:block" />
            </div>
          </div>
          <div className="h-52 p-4 space-y-4 bg-muted/30">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                <Skeleton className={cn("h-16 rounded-2xl skeleton-shimmer", i % 2 === 0 ? "w-48" : "w-56")} />
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-10 flex-1 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-9 w-9 rounded-full skeleton-shimmer" />
          </div>
        </div>

        {/* Interview Card Skeleton */}
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-5">
            <Skeleton className="w-5 h-5 skeleton-shimmer" />
            <Skeleton className="h-5 w-40 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="w-12 h-12 rounded-xl skeleton-shimmer" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 skeleton-shimmer" />
              <Skeleton className="h-3 w-24 skeleton-shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg skeleton-shimmer" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-8 skeleton-shimmer" />
                <Skeleton className="h-3 w-20 skeleton-shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg skeleton-shimmer" />
              <div className="space-y-1">
                <Skeleton className="h-2 w-8 skeleton-shimmer" />
                <Skeleton className="h-3 w-20 skeleton-shimmer" />
              </div>
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-lg skeleton-shimmer mt-5" />
        </div>
      </div>

      {/* Job Matches Skeleton */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40 skeleton-shimmer" />
          <Skeleton className="h-4 w-16 skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 skeleton-shimmer" />
                  <Skeleton className="h-3 w-24 skeleton-shimmer" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full skeleton-shimmer" />
                <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Individual skeleton components for more granular loading states
export const StatCardSkeleton = () => (
  <div className="bg-card rounded-xl border-t-4 border-muted p-4 sm:p-5 animate-fade-in">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-20 skeleton-shimmer" />
        <Skeleton className="h-8 w-16 skeleton-shimmer" />
        <Skeleton className="h-3 w-24 skeleton-shimmer" />
      </div>
      <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg skeleton-shimmer" />
    </div>
  </div>
);

export const MessagePreviewSkeleton = () => (
  <div className="bg-card rounded-xl border overflow-hidden animate-fade-in">
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 skeleton-shimmer" />
          <Skeleton className="h-3 w-24 skeleton-shimmer" />
        </div>
      </div>
    </div>
    <div className="h-52 p-4 space-y-4 bg-muted/30">
      {[1, 2].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <Skeleton className={cn("h-16 rounded-2xl skeleton-shimmer", i % 2 === 0 ? "w-48" : "w-56")} />
        </div>
      ))}
    </div>
  </div>
);

export const JobCardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3 animate-fade-in">
    <div className="flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-lg skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 skeleton-shimmer" />
        <Skeleton className="h-3 w-24 skeleton-shimmer" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-full skeleton-shimmer" />
      <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
    </div>
    <Skeleton className="h-9 w-full rounded-lg skeleton-shimmer" />
  </div>
);
