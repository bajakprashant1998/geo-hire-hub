import { ViewMode, Candidate, Job } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CandidatePopup } from './CandidatePopup';
import { JobPopup } from './JobPopup';
import { toast } from 'sonner';

interface MarkerDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ViewMode;
  selectedItem: Candidate | Job | null;
}

export const MarkerDetailSheet = ({
  isOpen,
  onClose,
  mode,
  selectedItem,
}: MarkerDetailSheetProps) => {
  const handleContact = () => {
    toast.success('Contact request sent! Sign in to connect with candidates.');
    onClose();
  };

  const handleApply = () => {
    toast.success('Application submitted! Sign in to track your applications.');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>
            {mode === 'hiring' ? 'Candidate Details' : 'Job Details'}
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          {mode === 'hiring' && selectedItem && 'job_title' in selectedItem ? (
            <CandidatePopup candidate={selectedItem} onContact={handleContact} />
          ) : mode === 'seeking' && selectedItem && 'title' in selectedItem ? (
            <JobPopup job={selectedItem} onApply={handleApply} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
