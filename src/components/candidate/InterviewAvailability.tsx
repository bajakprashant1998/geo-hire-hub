import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Clock, Plus, Trash2, Share2, CheckCircle2, Loader2,
  Eye, EyeOff, Copy, Zap, Sun, Moon, Sunrise, CalendarDays, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimeSlot {
  day: string;
  start: string;
  end: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAYS = DAYS.slice(0, 5);
const WEEKENDS = DAYS.slice(5);

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

// Quick presets
const PRESETS = [
  { label: 'Morning', icon: Sunrise, start: '09:00', end: '12:00' },
  { label: 'Afternoon', icon: Sun, start: '13:00', end: '17:00' },
  { label: 'Evening', icon: Moon, start: '18:00', end: '21:00' },
];

const getTimeOfDay = (time: string): 'morning' | 'afternoon' | 'evening' => {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const timeColors = {
  morning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  afternoon: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  evening: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

// --- Sub-components ---

const StatCard = ({ icon: Icon, label, value, accent }: {
  icon: typeof Clock; label: string; value: string | number; accent: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", accent)}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  </div>
);

const SlotBadge = ({ slot, onRemove }: { slot: TimeSlot; onRemove: () => void }) => {
  const timeOfDay = getTimeOfDay(slot.start);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
      className={cn(
        "group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all",
        timeColors[timeOfDay]
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">
          {slot.start} — {slot.end}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </motion.div>
  );
};

const DayCard = ({ day, slots, isAdding, onStartAdding, onAddSlot, onRemoveSlot, onCancel }: {
  day: string;
  slots: TimeSlot[];
  isAdding: boolean;
  onStartAdding: () => void;
  onAddSlot: (start: string, end: string) => void;
  onRemoveSlot: (index: number) => void;
  onCancel: () => void;
}) => {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setStart(preset.start);
    setEnd(preset.end);
    setActivePreset(preset.label);
  };

  const handleAdd = () => {
    if (start >= end) {
      toast.error('End time must be after start time');
      return;
    }
    onAddSlot(start, end);
    setStart('09:00');
    setEnd('17:00');
    setActivePreset(null);
  };

  const hasSlots = slots.length > 0;
  const totalHours = slots.reduce((acc, s) => {
    const startH = parseInt(s.start.split(':')[0]) + parseInt(s.start.split(':')[1]) / 60;
    const endH = parseInt(s.end.split(':')[0]) + parseInt(s.end.split(':')[1]) / 60;
    return acc + (endH - startH);
  }, 0);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      hasSlots ? "border-primary/30 bg-gradient-to-b from-primary/5 to-transparent" : "border-border/40"
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {day}
          </CardTitle>
          {hasSlots && (
            <Badge variant="secondary" className="text-[10px] px-2 gap-1">
              <Clock className="w-2.5 h-2.5" />
              {totalHours.toFixed(1)}h
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {slots.map((slot, i) => (
            <SlotBadge key={`${slot.start}-${slot.end}-${i}`} slot={slot} onRemove={() => onRemoveSlot(i)} />
          ))}
        </AnimatePresence>

        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2"
          >
            {/* Quick Presets */}
            <div className="flex gap-1.5">
              {PRESETS.map(p => (
                <Button
                  key={p.label}
                  variant={activePreset === p.label ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-7 text-[10px] gap-1 rounded-lg"
                  onClick={() => handlePreset(p)}
                >
                  <p.icon className="w-3 h-3" />
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Custom time pickers */}
            <div className="flex items-center gap-2">
              <select
                value={start}
                onChange={e => { setStart(e.target.value); setActivePreset(null); }}
                className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-xs text-muted-foreground font-medium">to</span>
              <select
                value={end}
                onChange={e => { setEnd(e.target.value); setActivePreset(null); }}
                className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs rounded-lg gap-1" onClick={handleAdd}>
                <Plus className="w-3 h-3" />
                Add Slot
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full h-9 text-xs gap-1.5 rounded-xl border-2 border-dashed",
              hasSlots
                ? "text-primary border-primary/20 hover:bg-primary/5"
                : "text-muted-foreground border-border/50 hover:border-primary/30 hover:text-primary"
            )}
            onClick={onStartAdding}
          >
            <Plus className="w-3.5 h-3.5" />
            {hasSlots ? 'Add Another' : 'Set Availability'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const EmptyState = () => (
  <div className="text-center py-12 space-y-4">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
      <Calendar className="w-8 h-8 text-primary" />
    </div>
    <div>
      <p className="text-base font-semibold text-foreground">No availability set</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Add your available time slots to help employers schedule interviews with you faster.
      </p>
    </div>
  </div>
);

// --- Main Component ---

export const InterviewAvailability = ({ candidateId }: { candidateId: string }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'weekdays' | 'weekends'>('weekdays');

  useEffect(() => {
    loadAvailability();
  }, [candidateId]);

  const loadAvailability = async () => {
    try {
      const { data } = await supabase
        .from('candidates')
        .select('availability_status')
        .eq('id', candidateId)
        .single();

      if (data?.availability_status) {
        try {
          const parsed = JSON.parse(data.availability_status);
          if (parsed.slots) setSlots(parsed.slots);
          if (parsed.isPublic !== undefined) setIsPublic(parsed.isPublic);
        } catch {
          // Old format
        }
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ availability_status: JSON.stringify({ slots, isPublic }) })
        .eq('id', candidateId);

      if (error) throw error;
      toast.success('Availability saved successfully!');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addSlot = (day: string, start: string, end: string) => {
    setSlots(prev => [...prev, { day, start, end }]);
    setAddingDay(null);
  };

  const removeSlot = (day: string, localIndex: number) => {
    const daySlots = slots.filter(s => s.day === day);
    const slotToRemove = daySlots[localIndex];
    setSlots(prev => prev.filter(s => s !== slotToRemove));
  };

  const copyShareLink = () => {
    const grouped = DAYS.reduce((acc, day) => {
      const daySlots = slots.filter(s => s.day === day);
      if (daySlots.length > 0) {
        acc.push(`${day}: ${daySlots.map(s => `${s.start}-${s.end}`).join(', ')}`);
      }
      return acc;
    }, [] as string[]);
    navigator.clipboard.writeText(`📅 My Interview Availability:\n\n${grouped.join('\n')}`);
    toast.success('Availability copied to clipboard!');
  };

  const applyToAll = (days: string[]) => {
    if (slots.length === 0) {
      toast.error('Add at least one slot first');
      return;
    }
    const templateSlots = slots.filter(s => s.day === slots[0].day);
    const newSlots = days.flatMap(day =>
      templateSlots.map(s => ({ ...s, day }))
    );
    setSlots(newSlots);
    toast.success(`Applied to ${days.length === 5 ? 'all weekdays' : 'weekend'}`);
  };

  // Stats
  const stats = useMemo(() => {
    const daysWithSlots = new Set(slots.map(s => s.day)).size;
    const totalHours = slots.reduce((acc, s) => {
      const startH = parseInt(s.start.split(':')[0]) + parseInt(s.start.split(':')[1]) / 60;
      const endH = parseInt(s.end.split(':')[0]) + parseInt(s.end.split(':')[1]) / 60;
      return acc + (endH - startH);
    }, 0);
    const completeness = Math.round((daysWithSlots / 7) * 100);
    return { daysWithSlots, totalHours: totalHours.toFixed(1), totalSlots: slots.length, completeness };
  }, [slots]);

  const getSlotsByDay = (day: string) => slots.filter(s => s.day === day);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Interview Availability
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set your available time slots to help employers schedule interviews faster.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 rounded-xl gap-1.5 text-xs",
              isPublic ? "border-emerald-500/30 text-emerald-600" : "border-border"
            )}
            onClick={() => setIsPublic(!isPublic)}
          >
            {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPublic ? 'Visible' : 'Hidden'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl gap-1.5 text-xs"
            onClick={copyShareLink}
            disabled={slots.length === 0}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-xl gap-1.5 text-xs"
            onClick={saveAvailability}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CalendarDays} label="Days Available" value={stats.daysWithSlots} accent="bg-primary/10 text-primary" />
        <StatCard icon={Clock} label="Total Hours" value={stats.totalHours} accent="bg-sky-500/10 text-sky-600" />
        <StatCard icon={Zap} label="Time Slots" value={stats.totalSlots} accent="bg-amber-500/10 text-amber-600" />
        <div className="flex flex-col justify-center p-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Completeness</span>
            <span className="text-xs font-bold text-foreground">{stats.completeness}%</span>
          </div>
          <Progress value={stats.completeness} className="h-2" />
        </div>
      </div>

      {/* Tabbed View */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekdays' | 'weekends')} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="weekdays" className="gap-1.5 text-xs">
              <Sun className="w-3.5 h-3.5" />
              Weekdays
            </TabsTrigger>
            <TabsTrigger value="weekends" className="gap-1.5 text-xs">
              <Moon className="w-3.5 h-3.5" />
              Weekends
            </TabsTrigger>
          </TabsList>

          {slots.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-xl gap-1.5"
              onClick={() => applyToAll(activeTab === 'weekdays' ? WEEKDAYS : WEEKENDS)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply to all {activeTab}
            </Button>
          )}
        </div>

        <TabsContent value="weekdays" className="mt-0">
          {slots.filter(s => WEEKDAYS.includes(s.day)).length === 0 && !addingDay ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {WEEKDAYS.map(day => (
                <DayCard
                  key={day}
                  day={day}
                  slots={getSlotsByDay(day)}
                  isAdding={addingDay === day}
                  onStartAdding={() => setAddingDay(day)}
                  onAddSlot={(start, end) => addSlot(day, start, end)}
                  onRemoveSlot={(i) => removeSlot(day, i)}
                  onCancel={() => setAddingDay(null)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekends" className="mt-0">
          {slots.filter(s => WEEKENDS.includes(s.day)).length === 0 && !addingDay ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              {WEEKENDS.map(day => (
                <DayCard
                  key={day}
                  day={day}
                  slots={getSlotsByDay(day)}
                  isAdding={addingDay === day}
                  onStartAdding={() => setAddingDay(day)}
                  onAddSlot={(start, end) => addSlot(day, start, end)}
                  onRemoveSlot={(i) => removeSlot(day, i)}
                  onCancel={() => setAddingDay(null)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
