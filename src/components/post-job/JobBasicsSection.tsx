import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JobCategorySearch } from '@/components/JobCategorySearch';
import { LocationMapPicker, type GeoComponents } from './LocationMapPicker';
import { JobCategorySelector } from '@/components/government/JobCategorySelector';
import { Briefcase, MapPin, Users, Info, Wifi, Building } from 'lucide-react';

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
  jobCategory: 'private' | 'government';
  setJobCategory: (category: 'private' | 'government') => void;
  isGovernmentEmployer: boolean;
  workMode: 'onsite' | 'remote' | 'hybrid';
  setWorkMode: (mode: 'onsite' | 'remote' | 'hybrid') => void;
  onGeoComponents?: (components: GeoComponents) => void;
}

const workModeOptions = [
  { value: 'onsite' as const, label: 'On-site', icon: Building, desc: 'Work from office' },
  { value: 'remote' as const, label: 'Remote', icon: Wifi, desc: 'Work from anywhere' },
  { value: 'hybrid' as const, label: 'Hybrid', icon: MapPin, desc: 'Mix of both' },
];

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
  jobCategory,
  setJobCategory,
  isGovernmentEmployer,
  workMode,
  setWorkMode,
  onGeoComponents,
}: JobBasicsSectionProps) => {
  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Briefcase className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Job Basics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start with the essential details — title, type, and location
          </p>
        </div>
      </div>

      {/* Job Category Selector */}
      <JobCategorySelector
        value={jobCategory}
        onChange={setJobCategory}
        isGovernmentEmployer={isGovernmentEmployer}
      />

      {/* Job Type & Work Mode */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Job Type *</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Choose between full-time or part-time employment</TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['Full Time', 'Part Time'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setJobType(type)}
                className={`relative flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                  jobType === type
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                {type}
                {jobType === type && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Work Mode *</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Select where the candidate will primarily work</TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {workModeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWorkMode(opt.value)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                    workMode === opt.value
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                  {workMode === opt.value && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Job Title */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="title" className="text-sm font-semibold">Job Title *</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Use a clear, specific title that candidates search for</TooltipContent>
          </Tooltip>
        </div>
        <JobCategorySearch
          value={title}
          onChange={setTitle}
          placeholder="e.g., Software Engineer, Sales Executive, Data Analyst..."
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            AI-powered suggestions from 30,000+ job categories
          </p>
          {title.length > 0 && (
            <Badge variant="outline" className={`text-xs ${title.length >= 5 ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
              {title.length >= 5 ? '✓ Good title' : 'Too short'}
            </Badge>
          )}
        </div>
      </div>

      {/* Map Location Picker */}
      {workMode !== 'remote' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Job Location *</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Pin the exact work location on the map</TooltipContent>
            </Tooltip>
          </div>
          <LocationMapPicker
            coordinates={coordinates}
            setCoordinates={setCoordinates}
            address={address}
            setAddress={setAddress}
          />
        </div>
      )}

      {workMode === 'remote' && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Remote Position</p>
              <p className="text-xs text-muted-foreground">This job allows working from anywhere. A default location will be used for map visibility.</p>
            </div>
          </div>
        </div>
      )}

      {/* Number of Openings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="openings" className="text-sm font-semibold">No. of Openings *</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>How many positions are you hiring for?</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenings(String(Math.max(1, parseInt(openings || '1') - 1)))}
              className="px-4 py-2.5 hover:bg-muted transition-colors text-lg font-medium border-r"
            >
              −
            </button>
            <Input
              id="openings"
              type="number"
              min="1"
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
              className="w-20 text-center border-0 focus-visible:ring-0 text-lg font-semibold"
            />
            <button
              type="button"
              onClick={() => setOpenings(String(parseInt(openings || '1') + 1))}
              className="px-4 py-2.5 hover:bg-muted transition-colors text-lg font-medium border-l"
            >
              +
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            {parseInt(openings) === 1 ? 'position' : 'positions'}
          </span>
        </div>
      </div>
    </div>
  );
};
