import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ChevronRight, Sparkles } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
}

interface OnboardingTourProps {
  userId: string;
  type: 'candidate' | 'employer';
}

const candidateSteps: TourStep[] = [
  { title: 'Welcome to Your Dashboard! 🎉', description: 'This is your central hub. View your stats, applications, and job matches all in one place.' },
  { title: 'Browse & Apply', description: 'Use the sidebar to access your applications, saved jobs, and resume builder.' },
  { title: 'Complete Your Profile', description: 'A complete profile gets 3x more views from employers. Add your skills, experience, and photo.' },
  { title: 'Stay Updated', description: 'Real-time notifications keep you informed about new messages and application updates.' },
  { title: 'Find Jobs on Map', description: 'Use the interactive map to discover nearby job opportunities in your area.' },
];

const employerSteps: TourStep[] = [
  { title: 'Welcome to Your Dashboard! 🎉', description: 'Manage all your hiring activities from this central dashboard.' },
  { title: 'Post Jobs', description: 'Click "Post New Job" in the sidebar to create job listings with location-based targeting.' },
  { title: 'Review Applicants', description: 'View and manage all applications from the Job Postings section. Filter, shortlist, and schedule interviews.' },
  { title: 'Assign Tasks', description: 'Use the Task Manager to assign assessments or tasks to candidates.' },
  { title: 'Track Analytics', description: 'Monitor job performance, application trends, and profile views in the Analytics section.' },
];

export const OnboardingTour = ({ userId, type }: OnboardingTourProps) => {
  const storageKey = `onboarding-complete-${userId}`;
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const steps = type === 'candidate' ? candidateSteps : employerSteps;

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay so dashboard renders first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-[60] animate-fade-in" onClick={handleComplete} />

      {/* Tour Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90vw] max-w-sm animate-scale-in">
        <Card className="shadow-2xl border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={handleComplete}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{step.description}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-4">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleComplete} className="text-muted-foreground">
                Skip tour
              </Button>
              <Button size="sm" onClick={handleNext} className="gap-1">
                {currentStep < steps.length - 1 ? (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
