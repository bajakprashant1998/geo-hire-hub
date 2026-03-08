import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Plus, Trash2, Share2, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface TimeSlot {
  day: string;
  start: string;
  end: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

export const InterviewAvailability = ({ candidateId }: { candidateId: string }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

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

      // Parse slots from availability_status JSON if stored
      if (data?.availability_status) {
        try {
          const parsed = JSON.parse(data.availability_status);
          if (parsed.slots) setSlots(parsed.slots);
          if (parsed.isPublic !== undefined) setIsPublic(parsed.isPublic);
        } catch {
          // Not JSON, old format
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
        .update({
          availability_status: JSON.stringify({ slots, isPublic })
        })
        .eq('id', candidateId);

      if (error) throw error;
      toast.success('Availability saved!');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addSlot = () => {
    if (!addingDay) return;
    if (newStart >= newEnd) {
      toast.error('End time must be after start time');
      return;
    }
    setSlots(prev => [...prev, { day: addingDay, start: newStart, end: newEnd }]);
    setAddingDay(null);
    setNewStart('09:00');
    setNewEnd('17:00');
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const copyShareLink = () => {
    const text = slots.map(s => `${s.day}: ${s.start} - ${s.end}`).join('\n');
    navigator.clipboard.writeText(`My Interview Availability:\n${text}`);
    toast.success('Availability copied to clipboard!');
  };

  const groupedSlots = DAYS.reduce((acc, day) => {
    const daySlots = slots.filter(s => s.day === day);
    if (daySlots.length > 0) acc[day] = daySlots;
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Interview Availability
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share your available time slots with employers for faster scheduling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Visible to employers</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={copyShareLink} disabled={slots.length === 0}>
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          <Button size="sm" className="rounded-xl gap-1.5" onClick={saveAvailability} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Weekly Calendar View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {DAYS.map(day => {
          const daySlots = groupedSlots[day] || [];
          return (
            <Card key={day} className={cn(
              "transition-all",
              daySlots.length > 0 ? "border-primary/20 bg-primary/3" : "border-border/40"
            )}>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  {day}
                  {daySlots.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5">
                      {daySlots.length} slot{daySlots.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <AnimatePresence>
                  {daySlots.map((slot, i) => {
                    const globalIndex = slots.findIndex(s => s === slot);
                    return (
                      <motion.div
                        key={`${slot.start}-${slot.end}-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/8 border border-primary/15"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {slot.start} — {slot.end}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSlot(globalIndex)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {addingDay === day ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <select
                        value={newStart}
                        onChange={e => setNewStart(e.target.value)}
                        className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-muted-foreground self-center">to</span>
                      <select
                        value={newEnd}
                        onChange={e => setNewEnd(e.target.value)}
                        className="flex-1 text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 h-7 text-xs rounded-lg" onClick={addSlot}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setAddingDay(null)}>Cancel</Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-primary gap-1"
                    onClick={() => setAddingDay(day)}
                  >
                    <Plus className="w-3 h-3" />
                    Add Slot
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
