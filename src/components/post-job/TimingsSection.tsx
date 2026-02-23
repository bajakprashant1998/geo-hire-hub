import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Calendar, Info, Sun, Moon, RotateCcw, Zap } from 'lucide-react';

interface TimingsSectionProps {
  shiftType: string;
  setShiftType: (shift: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  workDays: string[];
  setWorkDays: (days: string[]) => void;
  interviewTime: string;
  setInterviewTime: (time: string) => void;
  interviewDays: string[];
  setInterviewDays: (days: string[]) => void;
}

const shifts = [
  { value: 'Day Shift', icon: Sun, label: 'Day Shift', desc: '6 AM – 6 PM' },
  { value: 'Night Shift', icon: Moon, label: 'Night Shift', desc: '6 PM – 6 AM' },
  { value: 'Rotational Shift', icon: RotateCcw, label: 'Rotational', desc: 'Varies' },
  { value: 'Flexible', icon: Zap, label: 'Flexible', desc: 'Choose hours' },
];
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TimingsSection = ({
  shiftType, setShiftType,
  startTime, setStartTime,
  endTime, setEndTime,
  workDays, setWorkDays,
  interviewTime, setInterviewTime,
  interviewDays, setInterviewDays,
}: TimingsSectionProps) => {
  const toggleDay = (day: string, current: string[], setter: (days: string[]) => void) => {
    if (current.includes(day)) {
      setter(current.filter((d) => d !== day));
    } else {
      setter([...current, day]);
    }
  };

  const selectAllWeekdays = () => {
    setWorkDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Work Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set the work hours, shift type, and interview availability
          </p>
        </div>
      </div>

      {/* Shift Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Shift Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {shifts.map((shift) => {
            const Icon = shift.icon;
            return (
              <button
                key={shift.value}
                type="button"
                onClick={() => setShiftType(shift.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  shiftType === shift.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border hover:border-primary/40 text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{shift.label}</span>
                <span className="text-xs opacity-60">{shift.desc}</span>
                {shiftType === shift.value && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Timings */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Working Hours</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start Time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End Time</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11" />
          </div>
        </div>
        {startTime && endTime && (
          <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            ⏱ Total: ~{Math.abs(parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]))} hours/day
          </p>
        )}
      </div>

      {/* Work Days */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Working Days</Label>
          <button type="button" onClick={selectAllWeekdays} className="text-xs text-primary hover:underline">
            Select weekdays
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {weekDays.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day, workDays, setWorkDays)}
              className={`w-12 h-12 rounded-xl text-sm font-medium border-2 transition-all ${
                workDays.includes(day)
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background hover:bg-accent border-border text-muted-foreground'
              }`}
            >
              {shortDays[index]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {workDays.length === 0 ? 'No days selected' :
           workDays.length === 7 ? 'All 7 days' :
           workDays.length === 5 && !workDays.includes('Saturday') && !workDays.includes('Sunday') ? 'Weekdays (Mon-Fri)' :
           `${workDays.length} days/week`}
        </p>
      </div>

      {/* Interview Details */}
      <div className="p-5 rounded-xl border-2 border-dashed bg-muted/20 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Interview Schedule</h3>
            <p className="text-xs text-muted-foreground">When can candidates come for interviews?</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Interview Timing</Label>
          <Input
            placeholder="e.g., 10:00 AM - 5:00 PM"
            value={interviewTime}
            onChange={(e) => setInterviewTime(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Interview Days</Label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day, interviewDays, setInterviewDays)}
                className={`w-12 h-12 rounded-xl text-sm font-medium border-2 transition-all ${
                  interviewDays.includes(day)
                    ? 'bg-success text-success-foreground border-success shadow-sm'
                    : 'bg-background hover:bg-accent border-border text-muted-foreground'
                }`}
              >
                {shortDays[index]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
