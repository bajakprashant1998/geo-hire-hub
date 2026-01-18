import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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

const shifts = ['Day Shift', 'Night Shift', 'Rotational Shift', 'Flexible'];
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TimingsSection = ({
  shiftType,
  setShiftType,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  workDays,
  setWorkDays,
  interviewTime,
  setInterviewTime,
  interviewDays,
  setInterviewDays,
}: TimingsSectionProps) => {
  const toggleDay = (day: string, current: string[], setter: (days: string[]) => void) => {
    if (current.includes(day)) {
      setter(current.filter((d) => d !== day));
    } else {
      setter([...current, day]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          3
        </div>
        <h2 className="text-lg font-semibold">Timings</h2>
      </div>

      {/* Shift Type */}
      <div className="space-y-2">
        <Label>Shift Type</Label>
        <Select value={shiftType} onValueChange={setShiftType}>
          <SelectTrigger>
            <SelectValue placeholder="Select shift type" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map((shift) => (
              <SelectItem key={shift} value={shift}>
                {shift}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Timings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Work Days */}
      <div className="space-y-2">
        <Label>Working Days</Label>
        <div className="flex flex-wrap gap-2">
          {weekDays.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day, workDays, setWorkDays)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                workDays.includes(day)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-border'
              }`}
            >
              {shortDays[index]}
            </button>
          ))}
        </div>
      </div>

      {/* Interview Details */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium mb-4">Interview Details</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interview Timing</Label>
            <Input
              placeholder="e.g., 10:00 AM - 5:00 PM"
              value={interviewTime}
              onChange={(e) => setInterviewTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Interview Days</Label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day, interviewDays, setInterviewDays)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    interviewDays.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  {shortDays[index]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
