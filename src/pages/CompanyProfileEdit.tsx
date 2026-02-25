import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { CompanyProfileSection } from '@/components/employer/CompanyProfileSection';

const CompanyProfileEdit = () => {
  const navigate = useNavigate();

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to edit your company profile.">
      <div className="min-h-screen bg-secondary py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => navigate('/employer-dashboard')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to dashboard</TooltipContent>
            </Tooltip>
            <h1 className="text-xl font-bold">Edit Company Profile</h1>
          </div>

          <CompanyProfileSection
            onViewPublicProfile={() => navigate('/employer-dashboard')}
          />
        </div>
      </div>
    </EmailVerificationGuard>
  );
};

export default CompanyProfileEdit;
