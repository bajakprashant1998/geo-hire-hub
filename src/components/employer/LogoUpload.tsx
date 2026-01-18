import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Building2, Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface LogoUploadProps {
  userId: string;
  currentLogoUrl?: string | null;
  onLogoUploaded: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export const LogoUpload = ({
  userId,
  currentLogoUrl,
  onLogoUploaded,
  size = 'md',
  className = '',
}: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or SVG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/company-logo.${fileExt}`;

      // Delete old logos if exist
      await supabase.storage.from('avatars').remove([
        `${userId}/company-logo.jpg`,
        `${userId}/company-logo.png`,
        `${userId}/company-logo.webp`,
        `${userId}/company-logo.svg`,
      ]);

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      
      onLogoUploaded(urlWithTimestamp);
      toast.success('Company logo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload logo');
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!previewUrl) return;

    setUploading(true);
    try {
      // Remove from storage
      await supabase.storage
        .from('avatars')
        .remove([
          `${userId}/company-logo.jpg`,
          `${userId}/company-logo.png`,
          `${userId}/company-logo.webp`,
          `${userId}/company-logo.svg`,
        ]);

      setPreviewUrl(null);
      onLogoUploaded('');
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error('Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative group">
        <div 
          className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shadow-lg`}
        >
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Company logo" 
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <Building2 className="w-1/3 h-1/3 text-muted-foreground" />
          )}
        </div>

        {/* Overlay */}
        <div
          className={`absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
            uploading ? 'opacity-100' : ''
          }`}
          onClick={triggerFileInput}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Remove button */}
        {previewUrl && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerFileInput}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            {previewUrl ? 'Change Logo' : 'Upload Logo'}
          </>
        )}
      </Button>
    </div>
  );
};
