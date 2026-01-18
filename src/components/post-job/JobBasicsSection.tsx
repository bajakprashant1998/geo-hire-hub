import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobCategorySearch } from '@/components/JobCategorySearch';

interface JobBasicsSectionProps {
  jobType: 'Full Time' | 'Part Time';
  setJobType: (type: 'Full Time' | 'Part Time') => void;
  title: string;
  setTitle: (title: string) => void;
  location: string;
  setLocation: (location: string) => void;
  area: string;
  setArea: (area: string) => void;
  openings: string;
  setOpenings: (openings: string) => void;
}

const locations = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Remote', 'Other'
];

export const JobBasicsSection = ({
  jobType,
  setJobType,
  title,
  setTitle,
  location,
  setLocation,
  area,
  setArea,
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

      {/* Job Location */}
      <div className="space-y-2">
        <Label>Job Location *</Label>
        <div className="grid grid-cols-2 gap-3">
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Area / Locality"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
      </div>

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
