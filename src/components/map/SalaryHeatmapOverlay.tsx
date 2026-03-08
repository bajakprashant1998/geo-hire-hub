import { useMemo, useEffect, useRef } from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { Job } from '@/types';

interface SalaryRegion {
  id: string;
  lat: number;
  lng: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  jobCount: number;
  topRoles: string[];
}

interface SalaryHeatmapOverlayProps {
  jobs: Job[];
  enabled: boolean;
  roleFilter: string;
}

// Parse salary_range string to extract numeric values (handles formats like "₹5L-10L", "50000-100000", "5 LPA - 10 LPA")
function parseSalary(salaryRange: string | undefined): { min: number; max: number } | null {
  if (!salaryRange || salaryRange === 'Not specified' || salaryRange === 'Competitive') return null;
  
  const cleaned = salaryRange.replace(/[₹$€£,]/g, '').trim();
  
  // Handle LPA/L format (Indian Lakhs)
  const lpaMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:LPA|L|lakh|lac)/gi);
  if (lpaMatch) {
    const nums = lpaMatch.map(m => parseFloat(m) * 100000);
    if (nums.length >= 2) return { min: Math.min(...nums), max: Math.max(...nums) };
    if (nums.length === 1) return { min: nums[0], max: nums[0] };
  }
  
  // Handle K format
  const kMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[kK]/g);
  if (kMatch) {
    const nums = kMatch.map(m => parseFloat(m) * 1000);
    if (nums.length >= 2) return { min: Math.min(...nums), max: Math.max(...nums) };
    if (nums.length === 1) return { min: nums[0], max: nums[0] };
  }
  
  // Handle plain numbers with dash
  const numMatch = cleaned.match(/(\d+(?:,\d+)*(?:\.\d+)?)/g);
  if (numMatch) {
    const nums = numMatch.map(n => parseFloat(n.replace(/,/g, '')));
    if (nums.length >= 2) return { min: Math.min(...nums), max: Math.max(...nums) };
    if (nums.length === 1 && nums[0] > 0) return { min: nums[0], max: nums[0] };
  }
  
  return null;
}

// Grid-based spatial clustering
function clusterBySpatialGrid(jobs: Job[], gridSizeDeg: number = 0.5): SalaryRegion[] {
  const grid = new Map<string, { jobs: Job[]; salaries: number[]; lat: number; lng: number }>();
  
  for (const job of jobs) {
    const salary = parseSalary(job.salary_range);
    if (!salary) continue;
    
    const gridLat = Math.round(job.latitude / gridSizeDeg) * gridSizeDeg;
    const gridLng = Math.round(job.longitude / gridSizeDeg) * gridSizeDeg;
    const key = `${gridLat},${gridLng}`;
    
    if (!grid.has(key)) {
      grid.set(key, { jobs: [], salaries: [], lat: 0, lng: 0 });
    }
    const cell = grid.get(key)!;
    cell.jobs.push(job);
    cell.salaries.push((salary.min + salary.max) / 2);
    cell.lat += job.latitude;
    cell.lng += job.longitude;
  }
  
  const regions: SalaryRegion[] = [];
  
  grid.forEach((cell, key) => {
    if (cell.salaries.length === 0) return;
    
    const avgLat = cell.lat / cell.jobs.length;
    const avgLng = cell.lng / cell.jobs.length;
    const avgSalary = cell.salaries.reduce((a, b) => a + b, 0) / cell.salaries.length;
    const minSalary = Math.min(...cell.salaries);
    const maxSalary = Math.max(...cell.salaries);
    
    // Count top roles
    const roleCounts = new Map<string, number>();
    cell.jobs.forEach(j => {
      const role = j.title.split(/[–\-,/]/)[0].trim();
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    const topRoles = [...roleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([role]) => role);
    
    regions.push({
      id: key,
      lat: avgLat,
      lng: avgLng,
      avgSalary,
      minSalary,
      maxSalary,
      jobCount: cell.jobs.length,
      topRoles,
    });
  });
  
  return regions;
}

// Color scale: low salary = cool blue, high = warm gold
function getSalaryColor(salary: number, minGlobal: number, maxGlobal: number): string {
  const range = maxGlobal - minGlobal || 1;
  const t = Math.max(0, Math.min(1, (salary - minGlobal) / range));
  
  // Blue → Teal → Green → Yellow → Orange
  if (t < 0.25) return `hsl(210, 70%, ${55 + t * 40}%)`;
  if (t < 0.5) return `hsl(${210 - (t - 0.25) * 4 * 50}, 65%, 50%)`;
  if (t < 0.75) return `hsl(${160 - (t - 0.5) * 4 * 80}, 60%, 45%)`;
  return `hsl(${80 - (t - 0.75) * 4 * 50}, 75%, 48%)`;
}

function formatSalary(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export const SalaryHeatmapOverlay = ({ jobs, enabled, roleFilter }: SalaryHeatmapOverlayProps) => {
  const map = useMap();

  const filteredJobs = useMemo(() => {
    if (!roleFilter) return jobs;
    const lower = roleFilter.toLowerCase();
    return jobs.filter(j => j.title.toLowerCase().includes(lower));
  }, [jobs, roleFilter]);

  const regions = useMemo(() => {
    if (!enabled) return [];
    // Adjust grid size based on zoom
    return clusterBySpatialGrid(filteredJobs, 0.3);
  }, [filteredJobs, enabled]);

  const { minSalary, maxSalary } = useMemo(() => {
    if (regions.length === 0) return { minSalary: 0, maxSalary: 1 };
    return {
      minSalary: Math.min(...regions.map(r => r.avgSalary)),
      maxSalary: Math.max(...regions.map(r => r.avgSalary)),
    };
  }, [regions]);

  if (!enabled || regions.length === 0) return null;

  return (
    <>
      {regions.map(region => {
        const color = getSalaryColor(region.avgSalary, minSalary, maxSalary);
        const size = Math.max(52, Math.min(90, 40 + region.jobCount * 4));
        
        return (
          <AdvancedMarker
            key={`salary-${region.id}`}
            position={{ lat: region.lat, lng: region.lng }}
            zIndex={50}
          >
            <div
              style={{
                width: size,
                height: size,
                position: 'relative',
                cursor: 'default',
              }}
              title={`Avg: ${formatSalary(region.avgSalary)} | ${region.jobCount} jobs\n${region.topRoles.join(', ')}`}
            >
              {/* Outer glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: color,
                  opacity: 0.15,
                  filter: 'blur(6px)',
                }}
              />
              {/* Main bubble */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}99)`,
                  border: `2.5px solid ${color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 12px ${color}40`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span style={{
                  fontSize: size > 70 ? 13 : 11,
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  lineHeight: 1,
                }}>
                  {formatSalary(region.avgSalary)}
                </span>
                <span style={{
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 500,
                  marginTop: 1,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  {region.jobCount} job{region.jobCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
};

export { formatSalary, parseSalary };
export type { SalaryRegion };
