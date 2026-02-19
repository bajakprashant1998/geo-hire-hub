import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReportDialogProps {
  targetId: string;
  targetType: 'job' | 'employer';
  children?: React.ReactNode;
}

const REASONS = {
  job: ['Misleading information', 'Spam or scam', 'Discriminatory content', 'Expired/filled position', 'Other'],
  employer: ['Fraudulent company', 'Harassment', 'Misleading information', 'Spam', 'Other'],
};

export const ReportDialog = ({ targetId, targetType, children }: ReportDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      if (targetType === 'job') {
        const { error: e } = await supabase.from('job_reports').insert({
          job_id: targetId,
          reporter_id: user.id,
          reason,
          details: details || null,
        });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('employer_reports').insert({
          employer_id: targetId,
          reporter_id: user.id,
          reason,
          details: details || null,
        });
        if (e) throw e;
      }
      
      toast.success('Report submitted. Our team will review it.');
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Flag className="w-4 h-4" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType === 'job' ? 'Job Listing' : 'Employer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS[targetType].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Additional Details</Label>
            <Textarea
              placeholder="Provide more details about your report..."
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !reason} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
