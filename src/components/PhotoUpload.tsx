import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, User, X, Crop } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropper } from './ImageCropper';

interface PhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  onPhotoUploaded: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export const PhotoUpload = ({
  userId,
  currentPhotoUrl,
  onPhotoUploaded,
  size = 'md',
  className = '',
}: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync previewUrl with currentPhotoUrl prop when it changes externally
  useEffect(() => {
    if (currentPhotoUrl !== undefined) {
      setPreviewUrl(currentPhotoUrl || null);
    }
  }, [currentPhotoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB for cropping)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    // Create preview for cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Create preview
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setPreviewUrl(croppedUrl);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileName = `${userId}/avatar.jpg`;

      // Delete old avatar if exists
      await supabase.storage.from('avatars').remove([
        `${userId}/avatar.jpg`,
        `${userId}/avatar.png`,
        `${userId}/avatar.webp`,
        `${userId}/avatar.gif`,
      ]);

      // Upload new cropped avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
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
      
      onPhotoUploaded(urlWithTimestamp);
      toast.success('Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
      setPreviewUrl(currentPhotoUrl || null);
    } finally {
      setUploading(false);
      setSelectedImage(null);
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
          `${userId}/avatar.jpg`,
          `${userId}/avatar.png`,
          `${userId}/avatar.webp`,
          `${userId}/avatar.gif`,
        ]);

      setPreviewUrl(null);
      onPhotoUploaded('');
      toast.success('Photo removed');
    } catch (error: any) {
      toast.error('Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="relative group">
          <Avatar className={`${sizeClasses[size]} border-4 border-background shadow-google`}>
            <AvatarImage src={previewUrl || ''} alt="Profile photo" />
            <AvatarFallback className="bg-google-blue/10">
              <User className="w-1/2 h-1/2 text-google-blue" />
            </AvatarFallback>
          </Avatar>

          {/* Overlay */}
          <div
            className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
              uploading ? 'opacity-100' : ''
            }`}
            onClick={triggerFileInput}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <div className="flex flex-col items-center">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[10px] text-white mt-1">Edit</span>
              </div>
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
              className="absolute -top-1 -right-1 w-6 h-6 bg-google-red text-white rounded-full flex items-center justify-center shadow-md hover:bg-google-red/90 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
          className="gap-2 hover:bg-google-blue/10 hover:text-google-blue hover:border-google-blue"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Crop className="w-4 h-4" />
              {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </>
          )}
        </Button>
      </div>

      {/* Image Cropper Modal */}
      {selectedImage && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          circularCrop={true}
        />
      )}
    </>
  );
};
