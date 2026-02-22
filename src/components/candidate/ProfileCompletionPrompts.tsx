import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Mic, Camera, Wrench, MapPin, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  color: string;
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
      color: 'from-[hsl(217,89%,61%)]/10 to-[hsl(217,89%,61%)]/5 border-[hsl(217,89%,61%)]/20',
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
      color: 'from-[hsl(262,83%,58%)]/10 to-[hsl(262,83%,58%)]/5 border-[hsl(262,83%,58%)]/20',
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
      color: 'from-[hsl(142,53%,43%)]/10 to-[hsl(142,53%,43%)]/5 border-[hsl(142,53%,43%)]/20',
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
      color: 'from-[hsl(44,98%,50%)]/10 to-[hsl(44,98%,50%)]/5 border-[hsl(44,98%,50%)]/20',
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
      color: 'from-[hsl(0,84%,60%)]/10 to-[hsl(0,84%,60%)]/5 border-[hsl(0,84%,60%)]/20',
    });
  }

  const visiblePrompts = allPrompts
    .filter(p => !dismissed.includes(p.id))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  if (visiblePrompts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AnimatePresence>
        {visiblePrompts.map((prompt, idx) => (
          <motion.div
            key={prompt.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={cn(
              "relative overflow-hidden bg-gradient-to-br border group hover:shadow-md transition-shadow",
              prompt.color
            )}>
              <button
                onClick={() => dismiss(prompt.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-card/80 flex items-center justify-center shrink-0 shadow-sm">
                  <prompt.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground font-medium leading-snug mb-2.5">{prompt.message}</p>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs gap-1 rounded-lg" 
                    onClick={prompt.action}
                  >
                    {prompt.cta}
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
