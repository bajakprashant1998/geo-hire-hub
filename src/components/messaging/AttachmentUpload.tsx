import { useState, useRef } from 'react';
import { Paperclip, X, Loader2, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const AttachmentUpload = ({ 
  userId, 
  conversationId, 
  onAttachmentReady,
  pendingAttachment,
  onClearAttachment
}: AttachmentUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="relative inline-flex items-center gap-2 p-2 bg-muted rounded-lg mr-2">
          {pendingAttachment.preview ? (
            <img 
              src={pendingAttachment.preview} 
              alt="Preview" 
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-10 h-10 bg-background rounded flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm truncate max-w-[100px]">
            {pendingAttachment.file.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => {
              if (pendingAttachment.preview) {
                URL.revokeObjectURL(pendingAttachment.preview);
              }
              onClearAttachment();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
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
