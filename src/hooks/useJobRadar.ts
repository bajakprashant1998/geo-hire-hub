import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JobRadarFilters {
  keyword: string;
  locationCity: string;
  radiusKm: number;
  remoteOnly: boolean;
  hybridOnly: boolean;
  minSalary: number;
  hideUndisclosed: boolean;
  experience: string[];
  jobTypes: string[];
  minMatchScore: number;
  freshness: 'all' | 'today' | '3days' | '1week';
  activelyHiring: boolean;
  verifiedOnly: boolean;
}

export const defaultFilters: JobRadarFilters = {
  keyword: '',
  locationCity: '',
  radiusKm: 50,
  remoteOnly: false,
  hybridOnly: false,
  minSalary: 0,
  hideUndisclosed: false,
  experience: [],
  jobTypes: [],
  minMatchScore: 0,
  freshness: 'all',
  activelyHiring: false,
  verifiedOnly: false,
};

export type SortOption = 'match' | 'distance' | 'salary' | 'recent';

interface RawJob {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  salary_currency: string | null;
  job_type: string | null;
  latitude: number;
  longitude: number;
  skills: string[] | null;
  min_experience: number | null;
  max_experience: number | null;
  hiring_urgency: string | null;
  created_at: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  status: string | null;
  is_active: boolean | null;
  slug: string | null;
  employer_id: string;
  employers: {
    company_name: string;
    verification_status: string | null;
    profile_completeness: number | null;
    work_life_balance_rating: number | null;
    slug: string | null;
    industry: string | null;
  } | null;
}

export interface ScoredJob {
  id: string;
  title: string;
  description: string | null;
  salaryRange: string | null;
  salaryCurrency: string | null;
  jobType: string | null;
  latitude: number;
  longitude: number;
  skills: string[];
  minExperience: number | null;
  maxExperience: number | null;
  hiringUrgency: string | null;
  createdAt: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  slug: string | null;
  employerId: string;
  companyName: string;
  companyVerified: boolean;
  companyIndustry: string | null;
  companySlug: string | null;
  matchScore: number;
  distanceKm: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  salaryInsight: string | null;
  isSaved: boolean;
}

// Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseSalaryNumber(s: string | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseSalaryRange(range: string | null): { min: number | null; max: number | null } {
  if (!range) return { min: null, max: null };
  const parts = range.split(/[-–to]/i).map(p => parseSalaryNumber(p.trim()));
  if (parts.length >= 2) return { min: parts[0], max: parts[1] };
  if (parts.length === 1) return { min: parts[0], max: parts[0] };
  return { min: null, max: null };
}

export function useJobRadar(
  candidateId: string | undefined,
  candidate: any,
  profile: any,
  filters: JobRadarFilters,
  sort: SortOption
) {
  const [rawJobs, setRawJobs] = useState<RawJob[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Fetch all jobs + saved + applied
  useEffect(() => {
    if (!candidateId) return;
    const fetchData = async () => {
      setLoading(true);
      const [jobsRes, savedRes, appsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, description, salary_range, salary_currency, job_type, latitude, longitude, skills, min_experience, max_experience, hiring_urgency, created_at, location_city, location_state, location_country, status, is_active, slug, employer_id, employers(company_name, verification_status, profile_completeness, work_life_balance_rating, slug, industry)')
          .eq('status', 'open')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('saved_jobs').select('job_id').eq('candidate_id', candidateId),
        supabase.from('applications').select('job_id').eq('candidate_id', candidateId),
      ]);

      setRawJobs((jobsRes.data as any) || []);
      setSavedJobIds(new Set((savedRes.data || []).map((s: any) => s.job_id)));
      setAppliedJobIds(new Set((appsRes.data || []).map((a: any) => a.job_id)));
      setLoading(false);
    };
    fetchData();
  }, [candidateId]);

  // Candidate data for scoring
  const candidateSkills = useMemo(() =>
    (candidate?.skills || []).map((s: string) => s.toLowerCase()), [candidate?.skills]);
  const candidateExp = candidate?.experience_years || 0;
  const candidateSalary = parseSalaryNumber(candidate?.expected_salary);
  const candidateLat = profile?.latitude;
  const candidateLng = profile?.longitude;

  // Score + filter + sort
  const scoredJobs = useMemo(() => {
    let jobs: ScoredJob[] = rawJobs.map(job => {
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());

      // Skill match (40%)
      const matched = candidateSkills.filter((s: string) => jobSkills.includes(s));
      const missing = jobSkills.filter(s => !candidateSkills.includes(s));
      const skillScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 100 : 50;

      // Experience match (25%)
      let expScore = 50;
      if (job.min_experience != null || job.max_experience != null) {
        const minExp = job.min_experience ?? 0;
        const maxExp = job.max_experience ?? 30;
        if (candidateExp >= minExp && candidateExp <= maxExp) expScore = 100;
        else if (candidateExp < minExp) expScore = Math.max(0, 100 - (minExp - candidateExp) * 20);
        else expScore = Math.max(0, 100 - (candidateExp - maxExp) * 10);
      }

      // Salary compatibility (15%)
      let salaryScore = 50;
      const jobSalary = parseSalaryRange(job.salary_range);
      let salaryInsight: string | null = null;
      if (candidateSalary && jobSalary.max) {
        const avg = ((jobSalary.min || 0) + jobSalary.max) / 2;
        if (avg > 0) {
          const diff = ((avg - candidateSalary) / candidateSalary) * 100;
          if (diff > 10) salaryInsight = `Pays ${Math.round(diff)}% above your expectation`;
          else if (diff < -10) salaryInsight = `${Math.round(Math.abs(diff))}% below your expectation`;
        }
        if (candidateSalary <= jobSalary.max && candidateSalary >= (jobSalary.min || 0)) salaryScore = 100;
        else if (candidateSalary <= jobSalary.max * 1.2) salaryScore = 70;
        else salaryScore = 30;
      }

      // Location proximity (10%)
      let distanceKm: number | null = null;
      let locationScore = 50;
      if (candidateLat && candidateLng && job.latitude && job.longitude) {
        distanceKm = haversineDistance(candidateLat, candidateLng, job.latitude, job.longitude);
        if (distanceKm <= 5) locationScore = 100;
        else if (distanceKm <= 10) locationScore = 90;
        else if (distanceKm <= 25) locationScore = 70;
        else if (distanceKm <= 50) locationScore = 50;
        else if (distanceKm <= 100) locationScore = 30;
        else locationScore = 10;
      }

      // Company quality (10%)
      let qualityScore = 50;
      const emp = job.employers;
      if (emp) {
        if (emp.verification_status === 'approved') qualityScore += 20;
        if (emp.profile_completeness && emp.profile_completeness > 70) qualityScore += 15;
        if (emp.work_life_balance_rating && emp.work_life_balance_rating >= 4) qualityScore += 15;
        qualityScore = Math.min(100, qualityScore);
      }

      const matchScore = Math.round(
        skillScore * 0.4 + expScore * 0.25 + salaryScore * 0.15 + locationScore * 0.1 + qualityScore * 0.1
      );

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        salaryRange: job.salary_range,
        salaryCurrency: job.salary_currency,
        jobType: job.job_type,
        latitude: job.latitude,
        longitude: job.longitude,
        skills: job.skills || [],
        minExperience: job.min_experience,
        maxExperience: job.max_experience,
        hiringUrgency: job.hiring_urgency,
        createdAt: job.created_at,
        locationCity: job.location_city,
        locationState: job.location_state,
        locationCountry: job.location_country,
        slug: job.slug,
        employerId: job.employer_id,
        companyName: emp?.company_name || 'Unknown',
        companyVerified: emp?.verification_status === 'approved',
        companyIndustry: emp?.industry || null,
        companySlug: emp?.slug || null,
        matchScore,
        distanceKm,
        matchedSkills: matched,
        missingSkills: missing.slice(0, 5),
        salaryInsight,
        isSaved: savedJobIds.has(job.id),
      };
    });

    // Apply filters
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(kw) ||
        j.companyName.toLowerCase().includes(kw) ||
        j.skills.some(s => s.toLowerCase().includes(kw))
      );
    }
    if (filters.locationCity) {
      const loc = filters.locationCity.toLowerCase();
      jobs = jobs.filter(j => j.locationCity?.toLowerCase().includes(loc) || j.locationState?.toLowerCase().includes(loc));
    }
    if (filters.radiusKm < 200 && candidateLat && candidateLng) {
      jobs = jobs.filter(j => j.distanceKm === null || j.distanceKm <= filters.radiusKm);
    }
    if (filters.remoteOnly) {
      jobs = jobs.filter(j => j.jobType?.toLowerCase().includes('remote'));
    }
    if (filters.hybridOnly) {
      jobs = jobs.filter(j => j.jobType?.toLowerCase().includes('hybrid'));
    }
    if (filters.minSalary > 0) {
      jobs = jobs.filter(j => {
        if (!j.salaryRange) return !filters.hideUndisclosed;
        const parsed = parseSalaryRange(j.salaryRange);
        return (parsed.max || 0) >= filters.minSalary;
      });
    }
    if (filters.hideUndisclosed) {
      jobs = jobs.filter(j => j.salaryRange && j.salaryRange.trim() !== '');
    }
    if (filters.experience.length > 0) {
      jobs = jobs.filter(j => {
        const min = j.minExperience ?? 0;
        return filters.experience.some(exp => {
          if (exp === 'fresher') return min === 0;
          if (exp === '1-3') return min <= 3;
          if (exp === '3-5') return min >= 1 && min <= 5;
          if (exp === '5+') return min >= 3;
          return true;
        });
      });
    }
    if (filters.jobTypes.length > 0) {
      jobs = jobs.filter(j => j.jobType && filters.jobTypes.some(t => j.jobType!.toLowerCase().includes(t.toLowerCase())));
    }
    if (filters.minMatchScore > 0) {
      jobs = jobs.filter(j => j.matchScore >= filters.minMatchScore);
    }
    if (filters.freshness !== 'all') {
      const now = Date.now();
      const cutoffs = { today: 1, '3days': 3, '1week': 7 };
      const days = cutoffs[filters.freshness];
      jobs = jobs.filter(j => j.createdAt && (now - new Date(j.createdAt).getTime()) <= days * 86400000);
    }
    if (filters.activelyHiring) {
      jobs = jobs.filter(j => j.hiringUrgency === 'urgent' || j.hiringUrgency === 'high');
    }
    if (filters.verifiedOnly) {
      jobs = jobs.filter(j => j.companyVerified);
    }

    // Sort
    switch (sort) {
      case 'match': jobs.sort((a, b) => b.matchScore - a.matchScore); break;
      case 'distance': jobs.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)); break;
      case 'salary': jobs.sort((a, b) => {
        const sa = parseSalaryRange(a.salaryRange).max || 0;
        const sb = parseSalaryRange(b.salaryRange).max || 0;
        return sb - sa;
      }); break;
      case 'recent': jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()); break;
    }

    return jobs;
  }, [rawJobs, filters, sort, candidateSkills, candidateExp, candidateSalary, candidateLat, candidateLng, savedJobIds]);

  const paginatedJobs = useMemo(() => scoredJobs.slice(0, page * PAGE_SIZE), [scoredJobs, page]);
  const hasMore = paginatedJobs.length < scoredJobs.length;

  const loadMore = useCallback(() => setPage(p => p + 1), []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filters, sort]);

  const toggleSave = useCallback(async (jobId: string) => {
    if (!candidateId) return;
    const isSaved = savedJobIds.has(jobId);
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('candidate_id', candidateId).eq('job_id', jobId);
      setSavedJobIds(prev => { const next = new Set(prev); next.delete(jobId); return next; });
    } else {
      await supabase.from('saved_jobs').insert({ candidate_id: candidateId, job_id: jobId });
      setSavedJobIds(prev => new Set(prev).add(jobId));
    }
  }, [candidateId, savedJobIds]);

  return {
    jobs: paginatedJobs,
    totalCount: scoredJobs.length,
    loading,
    hasMore,
    loadMore,
    toggleSave,
    appliedJobIds,
  };
}
