import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const EmployerSettings = () => {
    const navigate = useNavigate();
    const { user, profile, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || profile?.user_type !== 'employer') {
        navigate('/login');
        return null;
    }

    return (
        <EmailVerificationGuard fallbackMessage="Please verify your email to access settings.">
            <div className="min-h-screen bg-secondary py-8 px-4">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/employer-dashboard')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Account Settings</h1>
                                <p className="text-muted-foreground">Manage your account security and preferences</p>
                            </div>
                        </div>
                    </div>

                    <Card className="shadow-google">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Security Settings
                            </CardTitle>
                            <CardDescription>
                                Update your password and secure your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SecuritySettings />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </EmailVerificationGuard>
    );
};

export default EmployerSettings;
