import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Crown, Zap, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number | null;
  max_active_jobs: number;
  features: string[];
  sort_order: number;
}

const Plans = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plansData, error } = await supabase
          .from('employer_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;
        setPlans((plansData || []).map(p => ({
          ...p,
          features: (p.features as string[]) || [],
        })));

        // Get current subscription if user is employer
        if (profile?.user_type === 'employer') {
          const { data: empData } = await supabase
            .from('employers')
            .select('id')
            .eq('profile_id', profile.id)
            .maybeSingle();

          if (empData) {
            const { data: subData } = await supabase
              .from('employer_subscriptions')
              .select('plan_id')
              .eq('employer_id', empData.id)
              .eq('status', 'active')
              .maybeSingle();

            if (subData) {
              setCurrentPlanId(subData.plan_id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [profile]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile?.user_type !== 'employer') {
      toast.error('Only employers can subscribe to plans');
      return;
    }

    if (plan.id === currentPlanId) {
      toast.info('You are already on this plan');
      return;
    }

    if (plan.price_monthly === 0) {
      toast.info('You are on the free plan by default');
      return;
    }

    // For paid plans, show coming soon message (integrate Stripe later)
    toast.info('Payment integration coming soon! Contact us for enterprise plans.');
  };

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free':
        return <Zap className="w-8 h-8" />;
      case 'professional':
        return <Crown className="w-8 h-8" />;
      default:
        return <Building2 className="w-8 h-8" />;
    }
  };

  const getPlanColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free':
        return 'bg-muted text-foreground';
      case 'professional':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-warning text-warning-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary py-12 px-4">
      <SEOHead title="Pricing Plans | HireForJob" description="Choose the right hiring plan for your business. Compare features and pricing to find the best fit." canonicalUrl="https://hireforjob1.lovable.app/plans" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Choose Your Plan</h1>
            <p className="text-muted-foreground">Unlock more features to grow your hiring</p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const price = billingCycle === 'yearly' && plan.price_yearly
              ? plan.price_yearly / 12
              : plan.price_monthly;

            return (
              <Card
                key={plan.id}
                className={`shadow-google-lg relative overflow-hidden ${
                  plan.name === 'Professional' ? 'border-primary border-2' : ''
                }`}
              >
                {plan.name === 'Professional' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-medium">
                    POPULAR
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${getPlanColor(plan.name)}`}
                  >
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center space-y-6">
                  {/* Price */}
                  <div>
                    <span className="text-4xl font-bold">
                      ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                    {billingCycle === 'yearly' && plan.price_yearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed ${plan.price_yearly}/year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.name === 'Professional' ? 'default' : 'outline'}
                    disabled={isCurrentPlan}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.price_monthly === 0 ? 'Get Started' : 'Upgrade Now'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Contact */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Need a custom plan for your enterprise?{' '}
            <a href="mailto:support@hireforjob.com" className="text-primary hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Plans;
