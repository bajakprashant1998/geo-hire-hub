import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, XCircle, Ban, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  isProcessing?: boolean;
  entityType?: 'employer' | 'job' | 'candidate' | 'user';
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onApprove,
  onReject,
  onSuspend,
  onDelete,
  onExport,
  isProcessing = false,
  entityType = 'employer'
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-3 px-4 py-3",
          "bg-card border rounded-xl shadow-lg"
        )}
      >
        <div className="flex items-center gap-2 pr-3 border-r">
          <span className="bg-primary text-primary-foreground text-sm font-medium px-2 py-0.5 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {entityType}{selectedCount > 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onApprove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onApprove}
              disabled={isProcessing}
              className="text-success hover:text-success hover:bg-success/10"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          
          {onReject && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={isProcessing}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}
          
          {onSuspend && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSuspend}
              disabled={isProcessing}
              className="text-warning hover:text-warning hover:bg-warning/10"
            >
              <Ban className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          )}
          
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={isProcessing}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          
          {onExport && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onExport}
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
