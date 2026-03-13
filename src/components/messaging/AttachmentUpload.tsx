import { useState, useRef } from 'react';
import { Paperclip, X, Loader2, Image, FileText, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PendingAttachment {
  file: File;
  preview?: string;
}

interface AttachmentUploadProps {
  userId: string;
  conversationId: string;
  onAttachmentReady: (attachment: {
    file: File;
    localPreview?: string;
  }) => void;
  pendingAttachment: PendingAttachment | null;
  onClearAttachment: () => void;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentUpload = ({ 
  userId, 
  conversationId, 
  onAttachmentReady,
  pendingAttachment,
  onClearAttachment
}: AttachmentUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('File type not supported. Allowed: Images, PDF, Word, Text');
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    onAttachmentReady({ file, localPreview: preview });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {pendingAttachment ? (
        <div className="relative inline-flex items-center gap-3 p-2.5 bg-muted/80 rounded-xl border border-border/40">
          {pendingAttachment.preview ? (
            <div className="relative group">
              <img 
                src={pendingAttachment.preview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded-lg shadow-sm"
              />
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 bg-background rounded-lg flex items-center justify-center border border-border/30">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate max-w-[140px]">
              {pendingAttachment.file.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatFileSize(pendingAttachment.file.size)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
            onClick={() => {
              if (pendingAttachment.preview) {
                URL.revokeObjectURL(pendingAttachment.preview);
              }
              onClearAttachment();
            }}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Full-size image preview dialog */}
          {pendingAttachment.preview && (
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-w-2xl p-2">
                <img
                  src={pendingAttachment.preview}
                  alt="Full preview"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {pendingAttachment.file.name} • {formatFileSize(pendingAttachment.file.size)}
                </p>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
};

// Utility function to upload attachment
export const uploadAttachment = async (
  file: File,
  userId: string,
  messageId: string
): Promise<{ file_name: string; file_url: string; file_type: string; file_size: number } | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${messageId}/${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    toast.error('Failed to upload file');
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(fileName);

  // For private buckets, we need to create a signed URL
  const { data: signedUrlData } = await supabase.storage
    .from('message-attachments')
    .createSignedUrl(fileName, 60 * 60 * 24 * 60); // 60 days

  return {
    file_name: file.name,
    file_url: signedUrlData?.signedUrl || publicUrl,
    file_type: file.type,
    file_size: file.size,
  };
};
