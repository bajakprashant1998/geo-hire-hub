import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Camera, CreditCard, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
