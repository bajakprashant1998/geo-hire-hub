export type ViewMode = 'hiring' | 'seeking';

export interface Candidate {
  id: string;
  profile_id: string;
  full_name: string;
  job_title: string;
  experience_years: number;
  skills: string[];
  latitude: number;
  longitude: number;
  avatar_url?: string;
  distance_km?: number;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description?: string;
  salary_range?: string;
  job_type: string;
  latitude: number;
  longitude: number;
  status: 'open' | 'closed';
  created_at: string;
  distance_km?: number;
  company_name: string;
  job_category?: 'private' | 'government';
  is_government_employer?: boolean;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'candidate' | 'job';
  data: Candidate | Job;
}
