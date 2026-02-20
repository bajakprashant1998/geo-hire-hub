import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  userId: string;
  type: 'office' | 'business-card';
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  label: string;
  description?: string;
}

export const DocumentUpload = ({
  userId,
  type,
  currentUrl,
  onUploaded,
  label,
  description,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUploaded(publicUrl);
      toast.success(`${label} uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!preview) return;

    try {
      // Extract file path from URL
      // Make sure we can handle both old employer-documents URLs and new avatars URLs
      const bucketName = preview.includes('/employer-documents/') ? 'employer-documents' : 'avatars';
      const urlParts = preview.split(`/${bucketName}/`);
      if (urlParts[1]) {
        await supabase.storage
          .from(bucketName)
          .remove([urlParts[1]]);
      }

      setPreview(null);
      onUploaded('');
      toast.success(`${label} removed`);
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove file');
    }
  };

  return (
    <Card className={cn(
      'border-dashed transition-colors',
      preview ? 'border-success/50' : 'border-muted-foreground/25',
      !preview && 'hover:border-primary/50'
    )}>
      <CardContent className="p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="flex items-center gap-4">
          {/* Preview or Upload Area */}
          <div
            className={cn(
              'w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden shrink-0',
              preview ? 'border border-border/50 bg-muted/30' : 'bg-muted cursor-pointer'
            )}
            onClick={() => !preview && inputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt={label} className="w-full h-full object-cover" />
            ) : uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Info & Actions */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{label}</h4>
              {preview && <CheckCircle2 className="w-4 h-4 text-success" />}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                {preview ? 'Replace' : 'Upload'}
              </Button>
              {preview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
