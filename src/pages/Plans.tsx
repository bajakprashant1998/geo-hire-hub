import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Crown, Zap, Building2, X, HelpCircle, Shield, Headphones, BarChart3, Users, Briefcase, Star, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const comparisonFeatures = [
  { label: 'Active Job Listings', free: '1', pro: '10', enterprise: 'Unlimited' },
  { label: 'Applicant Tracking', free: 'Basic', pro: 'Advanced', enterprise: 'Full Suite' },
  { label: 'AI Job Matching', free: false, pro: true, enterprise: true },
  { label: 'Analytics Dashboard', free: false, pro: true, enterprise: true },
  { label: 'Priority Support', free: false, pro: true, enterprise: true },
  { label: 'Custom Branding', free: false, pro: false, enterprise: true },
  { label: 'API Access', free: false, pro: false, enterprise: true },
  { label: 'Dedicated Account Manager', free: false, pro: false, enterprise: true },
];

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features. Downgrade takes effect at the end of your billing cycle.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'We offer a 14-day free trial for the Professional plan so you can explore all features risk-free. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, debit cards, and UPI payments. Enterprise customers can also pay via bank transfer.',
  },
  {
    q: 'What happens when my job slots are full?',
    a: 'You can deactivate existing jobs to free up slots, or upgrade your plan for more capacity. Your existing jobs remain active even if you hit the limit.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, contact our support team for a full refund.',
  },
];

const trustBadges = [
  { icon: Shield, label: 'SSL Secured' },
  { icon: Users, label: '10K+ Employers' },
  { icon: Briefcase, label: '50K+ Jobs Posted' },
  { icon: Star, label: '4.8★ Rating' },
];

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

            if (subData) setCurrentPlanId(subData.plan_id);
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
    if (!user) { navigate('/login'); return; }
    if (profile?.user_type !== 'employer') { toast.error('Only employers can subscribe to plans'); return; }
    if (plan.id === currentPlanId) { toast.info('You are already on this plan'); return; }
    if (plan.price_monthly === 0) { toast.info('You are on the free plan by default'); return; }
    toast.info('Payment integration coming soon! Contact us for enterprise plans.');
  };

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return <Zap className="w-7 h-7" />;
      case 'professional': return <Crown className="w-7 h-7" />;
      default: return <Building2 className="w-7 h-7" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Pricing Plans | HireForJob" description="Choose the right hiring plan for your business. Compare features and pricing to find the best fit." canonicalUrl="https://www.hireforjob.com/plans" />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 pt-8 pb-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
              Find the perfect plan for your hiring needs
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center mt-8"
          >
            <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                  billingCycle === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Yearly
                <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full">
                  SAVE 17%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const isPro = plan.name.toLowerCase() === 'professional';
            const isFree = plan.name.toLowerCase() === 'free';
            const price = billingCycle === 'yearly' && plan.price_yearly
              ? plan.price_yearly / 12
              : plan.price_monthly;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
              >
                <Card className={cn(
                  "relative overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-lg",
                  isPro
                    ? 'border-primary border-2 shadow-md ring-1 ring-primary/10'
                    : 'border-border hover:border-primary/30'
                )}>
                  {isPro && (
                    <div className="bg-primary text-primary-foreground text-center py-2 text-xs font-semibold tracking-wider uppercase">
                      ⭐ Most Popular
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                      isFree ? 'bg-muted text-muted-foreground' :
                      isPro ? 'bg-primary/10 text-primary' :
                      'bg-warning/10 text-warning'
                    )}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center flex-1 flex flex-col">
                    {/* Price */}
                    <div className="py-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-extrabold text-foreground tabular-nums">
                          ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                      {billingCycle === 'yearly' && plan.price_yearly ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Billed ${plan.price_yearly}/year
                        </p>
                      ) : null}
                    </div>

                    <Separator className="my-4" />

                    {/* Features */}
                    <ul className="space-y-3 text-left flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isPro ? 'bg-primary/10' : 'bg-success/10'
                          )}>
                            <Check className={cn("w-3 h-3", isPro ? 'text-primary' : 'text-success')} />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4 pb-8 px-6">
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl font-semibold text-sm transition-all",
                        isPro && !isCurrentPlan && 'shadow-md hover:shadow-lg'
                      )}
                      variant={isPro ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isCurrentPlan ? 'Current Plan' :
                       isFree ? 'Get Started Free' :
                       <>Upgrade Now <ArrowRight className="w-4 h-4 ml-1" /></>
                      }
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-12 py-6"
        >
          {trustBadges.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-muted-foreground">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Compare Plans</h2>
            <p className="text-muted-foreground mt-2">See what's included in each plan</p>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-foreground min-w-[200px]">Feature</th>
                    <th className="text-center p-4 font-semibold text-foreground w-[140px]">Free</th>
                    <th className="text-center p-4 font-semibold text-primary w-[140px]">Professional</th>
                    <th className="text-center p-4 font-semibold text-foreground w-[140px]">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feat, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground font-medium">{feat.label}</td>
                      {(['free', 'pro', 'enterprise'] as const).map(tier => {
                        const val = feat[tier];
                        return (
                          <td key={tier} className="text-center p-4">
                            {typeof val === 'boolean' ? (
                              val ? (
                                <Check className="w-5 h-5 text-success mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                              )
                            ) : (
                              <span className={cn(
                                "text-sm font-medium",
                                tier === 'pro' ? 'text-primary' : 'text-foreground'
                              )}>
                                {val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2">Everything you need to know about our plans</p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-5 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 mb-16"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.08),transparent_50%)]" />
            <CardContent className="p-8 sm:p-12 text-center relative">
              <Headphones className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Need a custom plan?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get tailored pricing for large teams with dedicated support, custom integrations, and volume discounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="rounded-xl gap-2 shadow-md">
                  <Headphones className="w-4 h-4" />
                  Contact Sales
                </Button>
                <Button size="lg" variant="outline" className="rounded-xl" asChild>
                  <a href="mailto:support@hireforjob.com">Email Us</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Plans;
