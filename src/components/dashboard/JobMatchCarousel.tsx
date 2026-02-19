import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, MapPin, DollarSign, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  salary_range: string;
  match_score: number;
  company_initials: string;
  is_saved: boolean;
}

interface JobMatchCarouselProps {
  candidateId: string;
  skills: string[];
}

export const JobMatchCarousel = ({ candidateId, skills }: JobMatchCarouselProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    fetchMatchingJobs();
  }, [candidateId, skills]);

  const fetchMatchingJobs = async () => {
    // Fetch active jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        job_address,
        salary_range,
        skills,
        employer_id,
        employers!inner(company_name)
      `)
      .eq('is_active', true)
      .limit(10);

    // Fetch saved jobs for this candidate
    const { data: savedJobs } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('candidate_id', candidateId);

    const savedJobIds = new Set(savedJobs?.map(s => s.job_id) || []);

    if (jobsData) {
      const processedJobs = jobsData.map((job: any) => {
        // Calculate match score based on skills overlap
        const jobSkills = job.skills || [];
        const matchingSkills = skills.filter(s => 
          jobSkills.some((js: string) => js.toLowerCase().includes(s.toLowerCase()))
        );
        const matchScore = skills.length > 0 
          ? Math.round((matchingSkills.length / skills.length) * 100) 
          : Math.floor(Math.random() * 30) + 70; // Demo fallback

        const companyName = job.employers?.company_name || 'Company';
        const initials = companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

        return {
          id: job.id,
          title: job.title,
          company_name: companyName,
          location: job.job_address || 'Remote',
          salary_range: job.salary_range || 'Competitive',
          match_score: matchScore,
          company_initials: initials,
          is_saved: savedJobIds.has(job.id)
        };
      });

      // Sort by match score
      processedJobs.sort((a, b) => b.match_score - a.match_score);
      setJobs(processedJobs);
    }
    setLoading(false);
  };

  const handleSaveJob = async (jobId: string, isSaved: boolean) => {
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('candidate_id', candidateId);
    } else {
      await supabase.from('saved_jobs').insert({ job_id: jobId, candidate_id: candidateId });
    }
    setJobs(jobs.map(j => j.id === jobId ? { ...j, is_saved: !isSaved } : j));
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('job-carousel');
    if (container) {
      const scrollAmount = 320;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-[hsl(142,53%,43%)]';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-[hsl(44,70%,45%)]';
    return 'text-muted-foreground';
  };

  const getInitialsBg = (index: number) => {
    const colors = [
      'bg-primary text-primary-foreground',
      'bg-[hsl(142,53%,43%)] text-white',
      'bg-[hsl(262,83%,58%)] text-white',
      'bg-[hsl(44,70%,45%)] text-white',
      'bg-destructive text-white'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[280px] h-40 bg-muted rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No matching jobs found. Update your skills to see better matches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">Jobs Matching Your Profile</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div 
        id="job-carousel"
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {jobs.map((job, index) => (
          <div 
            key={job.id}
            className="flex-shrink-0 w-[220px] sm:w-[260px] bg-secondary/50 rounded-xl p-3 sm:p-4 border hover:shadow-md transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold", getInitialsBg(index))}>
                {job.company_initials}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", getMatchColor(job.match_score))}>
                  {job.match_score}% Match
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={() => handleSaveJob(job.id, job.is_saved)}
                >
                  <Bookmark className={cn("w-4 h-4", job.is_saved ? "fill-primary text-primary" : "text-muted-foreground")} />
                </Button>
              </div>
            </div>

            {/* Job Info */}
            <Link to={`/jobs/${job.id}`}>
              <h4 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                {job.title}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">{job.company_name}</p>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="line-clamp-1">{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{job.salary_range}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
