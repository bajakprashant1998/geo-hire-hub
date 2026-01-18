import { FileText, Download, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface MessageAttachmentProps {
  attachment: Attachment;
  isOwn?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return ImageIcon;
  if (fileType === 'application/pdf') return FileText;
  return File;
};

export const MessageAttachment = ({ attachment, isOwn = false }: MessageAttachmentProps) => {
  const isImage = attachment.file_type.startsWith('image/');
  const FileIcon = getFileIcon(attachment.file_type);

  const handleDownload = () => {
    window.open(attachment.file_url, '_blank');
  };

  if (isImage) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(attachment.file_url, '_blank')}
        />
        <div className={cn(
          "flex items-center justify-between px-2 py-1 text-xs",
          isOwn ? "bg-white/10 text-white/80" : "bg-muted text-muted-foreground"
        )}>
          <span className="truncate max-w-[150px]">{attachment.file_name}</span>
          <span>{formatFileSize(attachment.file_size)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "mt-2 flex items-center gap-3 p-3 rounded-lg max-w-xs",
      isOwn ? "bg-white/10" : "bg-muted"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        isOwn ? "bg-white/20" : "bg-background"
      )}>
        <FileIcon className={cn("w-5 h-5", isOwn ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isOwn ? "text-white" : "text-foreground"
        )}>
          {attachment.file_name}
        </p>
        <p className={cn("text-xs", isOwn ? "text-white/70" : "text-muted-foreground")}>
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDownload}
        className={cn(
          "w-8 h-8",
          isOwn ? "text-white hover:bg-white/20" : "text-muted-foreground hover:bg-muted"
        )}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};
