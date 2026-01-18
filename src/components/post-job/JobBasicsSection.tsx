import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JobCategorySearch } from '@/components/JobCategorySearch';
import { LocationMapPicker } from './LocationMapPicker';

interface JobBasicsSectionProps {
  jobType: 'Full Time' | 'Part Time';
  setJobType: (type: 'Full Time' | 'Part Time') => void;
  title: string;
  setTitle: (title: string) => void;
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  setAddress: (address: string) => void;
  openings: string;
  setOpenings: (openings: string) => void;
}

export const JobBasicsSection = ({
  jobType,
  setJobType,
  title,
  setTitle,
  coordinates,
  setCoordinates,
  address,
  setAddress,
  openings,
  setOpenings,
}: JobBasicsSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          1
        </div>
        <h2 className="text-lg font-semibold">Job Basics</h2>
      </div>

      {/* Job Type Toggle */}
      <div className="space-y-2">
        <Label>Job Type *</Label>
        <div className="toggle-container">
          <button
            type="button"
            onClick={() => setJobType('Full Time')}
            className={`toggle-option ${jobType === 'Full Time' ? 'active' : ''}`}
          >
            Full Time
          </button>
          <button
            type="button"
            onClick={() => setJobType('Part Time')}
            className={`toggle-option ${jobType === 'Part Time' ? 'active' : ''}`}
          >
            Part Time
          </button>
        </div>
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Job Title *</Label>
        <JobCategorySearch
          value={title}
          onChange={setTitle}
          placeholder="e.g., Software Engineer, Sales Executive, Data Analyst..."
        />
        <p className="text-xs text-muted-foreground">
          AI-powered suggestions from 30,000+ job categories
        </p>
      </div>

      {/* Map Location Picker */}
      <LocationMapPicker
        coordinates={coordinates}
        setCoordinates={setCoordinates}
        address={address}
        setAddress={setAddress}
      />

      {/* Number of Openings */}
      <div className="space-y-2">
        <Label htmlFor="openings">No. of Openings *</Label>
        <Input
          id="openings"
          type="number"
          min="1"
          placeholder="e.g., 5"
          value={openings}
          onChange={(e) => setOpenings(e.target.value)}
          className="w-32"
        />
      </div>
    </div>
  );
};
