import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';

interface JobActiveToggleProps {
  jobId: string;
  employerId: string;
  isActive: boolean;
  onToggle: (newState: boolean) => void;
}

export const JobActiveToggle = ({ 
  jobId, 
  employerId, 
  isActive, 
  onToggle 
}: JobActiveToggleProps) => {
  const [loading, setLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      // Deactivating is always allowed
      await updateJobStatus(false);
      return;
    }

    // Check if employer can activate more jobs
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('can_employer_activate_job', { 
          p_employer_id: employerId,
          p_exclude_job_id: jobId 
        });

      if (error) throw error;

      const result = data as { can_activate: boolean; active_count: number; max_allowed: number; plan_name: string };
      if (result.can_activate) {
        await updateJobStatus(true);
      } else {
        setShowUpgradeDialog(true);
      }
    } catch (error) {
      console.error('Error checking job limit:', error);
      toast.error('Failed to check job limit');
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (active: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: active })
        .eq('id', jobId);

      if (error) throw error;

      onToggle(active);
      toast.success(active ? 'Job activated' : 'Job deactivated');
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Switch
          id={`job-active-${jobId}`}
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
        <Label 
          htmlFor={`job-active-${jobId}`}
          className={isActive ? 'text-success' : 'text-muted-foreground'}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Label>
      </div>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-warning" />
              Upgrade Your Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              You've reached your active job limit. Upgrade your plan to publish more jobs and reach more candidates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Link to="/plans">
              <Button>
                <Crown className="w-4 h-4 mr-2" />
                View Plans
              </Button>
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
