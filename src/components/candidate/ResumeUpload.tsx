import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, Trash2, Loader2, Download, Eye, EyeOff, Lock, Users, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ResumeUploadProps {
  candidate: any;
  onUpdate: () => void;
}

export const ResumeUpload = ({ candidate, onUpdate }: ResumeUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibility, setVisibility] = useState(candidate?.resume_visibility || 'approved_employers');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/resume.${fileExt}`;

      // Delete old resume if exists
      if (candidate?.resume_url) {
        await supabase.storage.from('resumes').remove([candidate.resume_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update candidate record
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          resume_url: filePath,
          resume_filename: file.name,
          resume_uploaded_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      toast.success('Resume uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate?.resume_url) return;

    setDeleting(true);
    try {
      await supabase.storage.from('resumes').remove([candidate.resume_url]);

      const { error } = await supabase
        .from('candidates')
        .update({
          resume_url: null,
          resume_filename: null,
          resume_uploaded_at: null,
        })
        .eq('id', candidate.id);

      if (error) throw error;

      toast.success('Resume deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    } finally {
      setDeleting(false);
    }
  };

  const handleVisibilityChange = async (value: string) => {
    setVisibility(value);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ resume_visibility: value })
        .eq('id', candidate.id);

      if (error) throw error;
      toast.success('Privacy settings updated');
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  const downloadResume = async () => {
    if (!candidate?.resume_url) return;

    const { data, error } = await supabase.storage
      .from('resumes')
      .download(candidate.resume_url);

    if (error) {
      toast.error('Failed to download resume');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = candidate.resume_filename || 'resume';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-google">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Resume & Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resume Upload */}
        <div className="space-y-4">
          {candidate?.resume_url ? (
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{candidate.resume_filename}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded {new Date(candidate.resume_uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadResume}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Upload your resume</p>
                <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX (max 10MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.doc,.docx"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}

          {uploading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Uploading...</span>
            </div>
          )}

          {candidate?.resume_url && (
            <label className="block">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Replace Resume
                </span>
              </Button>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.doc,.docx"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-base font-medium">Resume Visibility</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            By default, only your Photo, Name, and Job Title are visible to everyone.
            Your full resume is protected by your privacy settings.
          </p>

          <RadioGroup value={visibility} onValueChange={handleVisibilityChange}>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
              <RadioGroupItem value="private" id="private" className="mt-1" />
              <Label htmlFor="private" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <EyeOff className="w-4 h-4" />
                  <span className="font-medium">Private</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only you can see your full resume
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
              <RadioGroupItem value="approved_employers" id="approved" className="mt-1" />
              <Label htmlFor="approved" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Approved Employers Only</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only verified and approved employers can view your resume
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
              <RadioGroupItem value="all_employers" id="all" className="mt-1" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">All Registered Employers</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Any logged-in employer can view your resume
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};
