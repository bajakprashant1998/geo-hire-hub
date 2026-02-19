import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Mic, Camera, Wrench, MapPin } from 'lucide-react';

interface ProfileCompletionPromptsProps {
  candidate: any;
  profile: any;
  onNavigate: (section: string) => void;
  onEditProfile: () => void;
}

interface Prompt {
  id: string;
  icon: React.ElementType;
  message: string;
  cta: string;
  action: () => void;
  priority: number;
}

export const ProfileCompletionPrompts = ({ candidate, profile, onNavigate, onEditProfile }: ProfileCompletionPromptsProps) => {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed-prompts-candidate') || '[]');
    } catch { return []; }
  });

  const dismiss = (id: string) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed-prompts-candidate', JSON.stringify(updated));
  };

  const allPrompts: Prompt[] = [];

  if (!candidate?.resume_url) {
    allPrompts.push({
      id: 'resume',
      icon: FileText,
      message: 'Upload your resume to get noticed by employers',
      cta: 'Upload Resume',
      action: () => onNavigate('resume'),
      priority: 1,
    });
  }

  if (!candidate?.audio_resume_url) {
    allPrompts.push({
      id: 'audio',
      icon: Mic,
      message: 'Record a voice intro to stand out from the crowd',
      cta: 'Record Audio',
      action: () => onNavigate('audio-resume'),
      priority: 2,
    });
  }

  if (!profile?.avatar_url) {
    allPrompts.push({
      id: 'photo',
      icon: Camera,
      message: 'Add a profile photo to build trust with employers',
      cta: 'Add Photo',
      action: onEditProfile,
      priority: 3,
    });
  }

  if (!candidate?.skills?.length) {
    allPrompts.push({
      id: 'skills',
      icon: Wrench,
      message: 'Add your skills to match with relevant jobs',
      cta: 'Add Skills',
      action: onEditProfile,
      priority: 4,
    });
  }

  if (!profile?.latitude || !profile?.longitude) {
    allPrompts.push({
      id: 'location',
      icon: MapPin,
      message: 'Set your location to find nearby job opportunities',
      cta: 'Set Location',
      action: onEditProfile,
      priority: 5,
    });
  }

  const visiblePrompts = allPrompts
    .filter(p => !dismissed.includes(p.id))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  if (visiblePrompts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {visiblePrompts.map(prompt => (
        <Card key={prompt.id} className="border-primary/20 bg-primary/5 relative">
          <button
            onClick={() => dismiss(prompt.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <prompt.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug mb-2">{prompt.message}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={prompt.action}>
                {prompt.cta}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
