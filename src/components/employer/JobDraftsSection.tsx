import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileEdit, 
  Trash2, 
  Clock, 
  Briefcase, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface JobDraft {
  id: string;
  title: string | null;
  draft_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface JobDraftsSectionProps {
  employerId: string;
}

export const JobDraftsSection = ({ employerId }: JobDraftsSectionProps) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, [employerId]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_drafts')
        .select('*')
        .eq('employer_id', employerId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts((data || []) as JobDraft[]);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDraft = (draftId: string) => {
    // Navigate to post-job page - the draft will be loaded automatically
    navigate(`/post-job?draft=${draftId}`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    setDeletingId(draftId);
    try {
      const { error } = await supabase
        .from('job_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(drafts.filter((d) => d.id !== draftId));
      toast.success('Draft deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete draft');
    } finally {
      setDeletingId(null);
    }
  };

  const getDraftPreview = (draft: JobDraft) => {
    const data = draft.draft_data || {};
    const items = [];
    
    if (data.jobType) items.push(data.jobType);
    if (data.address) items.push(data.address.split(',')[0]);
    if (data.salaryMin || data.salaryMax) {
      items.push(`₹${data.salaryMin || '0'} - ₹${data.salaryMax || data.salaryMin}`);
    }
    
    return items.join(' • ') || 'No details added yet';
  };

  const getCompletionPercent = (draft: JobDraft) => {
    const data = draft.draft_data || {};
    let filled = 0;
    const fields = ['title', 'description', 'coordinates', 'salaryMin', 'skills', 'contactPerson'];
    
    fields.forEach((field) => {
      if (data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : true)) {
        filled++;
      }
    });
    
    return Math.round((filled / fields.length) * 100);
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading drafts...</p>
        </CardContent>
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 text-center">
          <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No saved drafts</p>
          <p className="text-sm text-muted-foreground">
            When you start creating a job and save it as a draft, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Saved Drafts ({drafts.length})
        </h3>
      </div>

      {drafts.map((draft) => {
        const completion = getCompletionPercent(draft);
        
        return (
          <Card key={draft.id} className="shadow-google">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h4 className="font-medium truncate">
                      {draft.title || 'Untitled Draft'}
                    </h4>
                    <Badge variant="outline" className="shrink-0">
                      {completion}% complete
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {getDraftPreview(draft)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Last edited {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResumeDraft(draft.id)}
                  >
                    <FileEdit className="w-4 h-4 mr-1" />
                    Resume
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === draft.id}
                      >
                        {deletingId === draft.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{draft.title || 'Untitled Draft'}". 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
