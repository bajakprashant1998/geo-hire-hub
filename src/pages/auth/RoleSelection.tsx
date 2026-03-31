import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users } from 'lucide-react'; // Example icons
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';

const RoleSelection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleRoleSelect = async (role: 'candidate' | 'employer') => {
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ user_type: role })
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success(`Role set as ${role === 'candidate' ? 'Job Seeker' : 'Employer'}`);

            // Redirect to profile setup to complete remaining details
            navigate('/profile-setup');
        } catch (error: any) {
            console.error('Error updating role:', error);
            toast.error('Failed to set role. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
            <SEOHead title="Select Your Role – Hire For Job" description="Choose whether you're a candidate or employer on Hire For Job." noindex />
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Welcome! Who are you?</CardTitle>
                    <CardDescription>Select your role to get started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        className="w-full h-auto p-6 flex items-center justify-start gap-4 hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={() => handleRoleSelect('candidate')}
                        disabled={loading}
                    >
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-lg">I am a Job Seeker</h3>
                            <p className="text-sm text-muted-foreground">I want to find jobs and opportunities.</p>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full h-auto p-6 flex items-center justify-start gap-4 hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={() => handleRoleSelect('employer')}
                        disabled={loading}
                    >
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-lg">I am an Employer</h3>
                            <p className="text-sm text-muted-foreground">I want to post jobs and hire talent.</p>
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default RoleSelection;
