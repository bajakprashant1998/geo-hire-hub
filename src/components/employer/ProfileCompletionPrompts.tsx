import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, Camera, CreditCard, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmployerProfileCompletionPromptsProps {
  employer: any;
  jobCount: number;
}

interface Prompt {
  id: string;
  icon: React.ElementType;
  message: string;
  cta: string;
  action: () => void;
  priority: number;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

export const EmployerProfileCompletionPrompts = ({ employer, jobCount }: EmployerProfileCompletionPromptsProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed-prompts-employer') || '[]');
    } catch { return []; }
  });

  const dismiss = (id: string) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed-prompts-employer', JSON.stringify(updated));
  };

  const allPrompts: Prompt[] = [];

  if (!employer?.description || employer.description.length < 20) {
    allPrompts.push({
      id: 'description',
      icon: FileText,
      message: 'Add a company description to attract top candidates',
      cta: 'Add Description',
      action: () => navigate('/company-profile'),
      priority: 1,
      gradient: 'from-[hsl(217,89%,61%)]/10 to-[hsl(217,89%,61%)]/5',
      iconBg: 'bg-[hsl(217,89%,61%)]/15',
      iconColor: 'text-[hsl(217,89%,61%)]',
    });
  }

  if (!employer?.office_photo_url) {
    allPrompts.push({
      id: 'photo',
      icon: Camera,
      message: 'Upload an office photo to build trust with applicants',
      cta: 'Upload Photo',
      action: () => navigate('/company-profile'),
      priority: 2,
      gradient: 'from-[hsl(142,53%,43%)]/10 to-[hsl(142,53%,43%)]/5',
      iconBg: 'bg-[hsl(142,53%,43%)]/15',
      iconColor: 'text-[hsl(142,53%,43%)]',
    });
  }

  if (!employer?.tax_id) {
    allPrompts.push({
      id: 'tax',
      icon: CreditCard,
      message: 'Add your Tax ID for faster verification',
      cta: 'Add Tax ID',
      action: () => navigate('/company-profile'),
      priority: 3,
      gradient: 'from-[hsl(262,83%,58%)]/10 to-[hsl(262,83%,58%)]/5',
      iconBg: 'bg-[hsl(262,83%,58%)]/15',
      iconColor: 'text-[hsl(262,83%,58%)]',
    });
  }

  if (jobCount === 0) {
    allPrompts.push({
      id: 'first-job',
      icon: Briefcase,
      message: 'Post your first job to start receiving applications',
      cta: 'Post Job',
      action: () => navigate('/post-job'),
      priority: 4,
      gradient: 'from-[hsl(44,98%,50%)]/10 to-[hsl(44,98%,50%)]/5',
      iconBg: 'bg-[hsl(44,98%,50%)]/15',
      iconColor: 'text-[hsl(44,70%,45%)]',
    });
  }

  const visiblePrompts = allPrompts
    .filter(p => !dismissed.includes(p.id))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  if (visiblePrompts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AnimatePresence mode="popLayout">
        {visiblePrompts.map((prompt, index) => (
          <motion.div
            key={prompt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative"
          >
            <div className={cn(
              "rounded-2xl border border-border/50 p-4 bg-gradient-to-br transition-all duration-300 hover:shadow-md",
              prompt.gradient
            )}>
              <button
                onClick={() => dismiss(prompt.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  prompt.iconBg
                )}>
                  <prompt.icon className={cn("w-5 h-5", prompt.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug mb-2.5 font-medium">{prompt.message}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1"
                    onClick={prompt.action}
                  >
                    {prompt.cta}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
