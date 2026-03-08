import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Check, Crown, Zap, Building2, X, HelpCircle, Shield, Headphones,
  Users, Briefcase, Star, ArrowRight, Sparkles, Gift
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Comparison features built dynamically from plans — see ComparisonTable below

const faqs = [
  { q: 'Can I switch plans at any time?', a: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features. Downgrade takes effect at the end of your billing cycle.' },
  { q: 'Is there a free trial for paid plans?', a: 'We offer a 14-day free trial for the Professional plan so you can explore all features risk-free. No credit card required to start.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, debit cards, and UPI payments. Enterprise customers can also pay via bank transfer.' },
  { q: 'What happens when my job slots are full?', a: 'You can deactivate existing jobs to free up slots, or upgrade your plan for more capacity. Your existing jobs remain active even if you hit the limit.' },
  { q: 'Do you offer refunds?', a: "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team for a full refund." },
];

const trustBadges = [
  { icon: Shield, label: 'SSL Secured', value: '256-bit' },
  { icon: Users, label: 'Employers', value: '10K+' },
  { icon: Briefcase, label: 'Jobs Posted', value: '50K+' },
  { icon: Star, label: 'Rating', value: '4.8★' },
];

const PLAN_THEMES: Record<string, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  buttonVariant: 'outline' | 'default' | 'secondary';
  featureCheck: string;
  featureCheckBg: string;
  ring: string;
}> = {
  free: {
    gradient: 'from-muted/50 to-muted/20',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    accentBorder: 'border-border',
    buttonVariant: 'outline',
    featureCheck: 'text-muted-foreground',
    featureCheckBg: 'bg-muted',
    ring: '',
  },
  professional: {
    gradient: 'from-primary/10 to-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    accentBorder: 'border-primary',
    buttonVariant: 'default',
    featureCheck: 'text-primary',
    featureCheckBg: 'bg-primary/10',
    ring: 'ring-2 ring-primary/20',
  },
  enterprise: {
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    accentBorder: 'border-amber-500/40',
    buttonVariant: 'secondary',
    featureCheck: 'text-amber-600',
    featureCheckBg: 'bg-amber-500/10',
    ring: '',
  },
};

const getPlanTheme = (name: string) => {
  const key = name.toLowerCase();
  return PLAN_THEMES[key] || PLAN_THEMES.free;
};

// --- Sub-components ---

const BillingToggle = ({ billingCycle, onChange }: { billingCycle: 'monthly' | 'yearly'; onChange: (v: 'monthly' | 'yearly') => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, duration: 0.4 }}
    className="flex items-center justify-center mt-8"
  >
    <div className="inline-flex items-center bg-muted/80 backdrop-blur-sm rounded-full p-1.5 gap-1 border border-border/50">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
          billingCycle === 'monthly'
            ? 'bg-background text-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
          billingCycle === 'yearly'
            ? 'bg-background text-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Yearly
        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          -17%
        </span>
      </button>
    </div>
  </motion.div>
);

const PlanCard = ({
  plan,
  index,
  billingCycle,
  isCurrentPlan,
  isRecommended,
  onSelect,
}: {
  plan: Plan;
  index: number;
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan: boolean;
  isRecommended: boolean;
  onSelect: (plan: Plan) => void;
}) => {
  const isPro = plan.name.toLowerCase() === 'professional';
  const isFree = plan.name.toLowerCase() === 'free';
  const theme = getPlanTheme(plan.name);
  const price = billingCycle === 'yearly' && plan.price_yearly
    ? plan.price_yearly / 12
    : plan.price_monthly;
  const monthlyPrice = plan.price_monthly;
  const showSavings = billingCycle === 'yearly' && plan.price_yearly && !isFree;
  const savings = showSavings ? (monthlyPrice * 12) - (plan.price_yearly || 0) : 0;

  const getPlanIcon = () => {
    switch (plan.name.toLowerCase()) {
      case 'free': return <Zap className="w-7 h-7" />;
      case 'professional': return <Crown className="w-7 h-7" />;
      default: return <Building2 className="w-7 h-7" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
      className="relative"
    >
      {isPro && !isRecommended && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"
        >
          <Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 border-0">
            <Sparkles className="w-3.5 h-3.5" />
            Most Popular
          </Badge>
        </motion.div>
      )}
      {isRecommended && !isCurrentPlan && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10"
        >
          <Badge className="bg-emerald-600 text-white shadow-lg px-4 py-1.5 text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 border-0">
            <Star className="w-3.5 h-3.5" />
            Recommended for You
          </Badge>
        </motion.div>
      )}

      <Card className={cn(
        "relative overflow-hidden h-full flex flex-col transition-all duration-300 group",
        isRecommended && !isCurrentPlan
          ? 'border-emerald-500 border-2 shadow-lg ring-2 ring-emerald-500/20 hover:shadow-xl'
          : isPro
            ? `border-primary border-2 shadow-lg ${theme.ring} hover:shadow-xl`
            : 'border-border hover:border-primary/30 hover:shadow-lg'
      )}>
        {/* Gradient header accent */}
        <div className={cn("h-1.5 w-full bg-gradient-to-r", theme.gradient)} />

        <CardHeader className="text-center pb-2 pt-8">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={cn("w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center", theme.iconBg, theme.iconColor)}
          >
            {getPlanIcon()}
          </motion.div>
          <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
          <CardDescription className="text-sm mt-1.5 leading-relaxed">{plan.description}</CardDescription>
        </CardHeader>

        <CardContent className="text-center flex-1 flex flex-col px-6">
          {/* Price */}
          <div className="py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${billingCycle}-${plan.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="flex items-baseline justify-center gap-1"
              >
                {!isFree && <span className="text-lg text-muted-foreground font-medium">$</span>}
                <span className="text-5xl font-extrabold text-foreground tabular-nums tracking-tight">
                  {isFree ? 'Free' : price.toFixed(price % 1 === 0 ? 0 : 2)}
                </span>
                {!isFree && <span className="text-muted-foreground text-sm font-medium">/mo</span>}
              </motion.div>
            </AnimatePresence>

            {billingCycle === 'yearly' && plan.price_yearly ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 space-y-1"
              >
                <p className="text-xs text-muted-foreground">
                  Billed ${plan.price_yearly}/year
                </p>
                {savings > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Gift className="w-3 h-3" />
                    Save ${savings}/year
                  </p>
                )}
              </motion.div>
            ) : !isFree ? (
              <p className="text-xs text-muted-foreground mt-2">Billed monthly</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No credit card required</p>
            )}
          </div>

          {/* Job slots indicator */}
          <div className="bg-muted/50 rounded-xl p-3 mb-4 border border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Active Job Slots</span>
              <span className="text-xs font-bold text-foreground">{plan.max_active_jobs === -1 ? '∞' : plan.max_active_jobs}</span>
            </div>
            <Progress
              value={plan.max_active_jobs === -1 ? 100 : Math.min((plan.max_active_jobs / 20) * 100, 100)}
              className="h-1.5"
            />
          </div>

          <Separator className="mb-4" />

          {/* Features */}
          <ul className="space-y-3 text-left flex-1">
            {plan.features.map((feature, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i + 0.3 }}
                className="flex items-start gap-2.5"
              >
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", theme.featureCheckBg)}>
                  <Check className={cn("w-3 h-3", theme.featureCheck)} />
                </div>
                <span className="text-sm text-muted-foreground leading-snug">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="pt-4 pb-8 px-6">
          <Button
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-sm transition-all duration-300",
              isPro && !isCurrentPlan && 'shadow-md hover:shadow-lg hover:scale-[1.02]',
              isCurrentPlan && 'opacity-60'
            )}
            variant={theme.buttonVariant}
            disabled={isCurrentPlan}
            onClick={() => onSelect(plan)}
          >
            {isCurrentPlan ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Current Plan
              </span>
            ) : isFree ? (
              'Get Started Free'
            ) : (
              <span className="flex items-center gap-1">
                Upgrade Now <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </Button>
          {isPro && !isCurrentPlan && (
            <p className="text-[11px] text-muted-foreground text-center w-full mt-2">
              14-day free trial · Cancel anytime
            </p>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const TrustBar = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.6 }}
    className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14"
  >
    {trustBadges.map(({ icon: Icon, label, value }) => (
      <div key={label} className="flex items-center gap-3 bg-muted/40 rounded-xl p-4 border border-border/50">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    ))}
  </motion.div>
);

const ComparisonTable = ({ plans }: { plans: Plan[] }) => {
  // Build comparison rows dynamically from DB plans
  const freePlan = plans.find(p => p.name.toLowerCase() === 'free');
  const proPlan = plans.find(p => p.name.toLowerCase() === 'professional');
  const entPlan = plans.find(p => p.name.toLowerCase() === 'enterprise');

  const hasFeature = (plan: Plan | undefined, keyword: string): boolean => {
    if (!plan?.features) return false;
    return (plan.features as string[]).some((f: string) =>
      f.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const comparisonRows: { label: string; values: (string | boolean)[]; tooltip: string }[] = [
    {
      label: 'Active Job Listings',
      values: [
        String(freePlan?.max_active_jobs ?? 0),
        String(proPlan?.max_active_jobs ?? 0),
        String(entPlan?.max_active_jobs ?? 0),
      ],
      tooltip: 'Number of jobs you can have active simultaneously',
    },
    {
      label: 'Applicant Tracking',
      values: [
        hasFeature(freePlan, 'applicant') ? 'Basic' : 'Basic',
        hasFeature(proPlan, 'analytics') ? 'Advanced' : 'Basic',
        hasFeature(entPlan, 'suite') ? 'Full Suite' : 'Advanced',
      ],
      tooltip: 'Tools to manage and track applicants through your hiring pipeline',
    },
    {
      label: 'Analytics Dashboard',
      values: [
        hasFeature(freePlan, 'analytics'),
        hasFeature(proPlan, 'analytics'),
        hasFeature(entPlan, 'analytics'),
      ],
      tooltip: 'Detailed insights on job performance and applicant metrics',
    },
    {
      label: 'Priority Support',
      values: [
        hasFeature(freePlan, 'priority') || hasFeature(freePlan, 'dedicated'),
        hasFeature(proPlan, 'priority') || hasFeature(proPlan, 'dedicated'),
        hasFeature(entPlan, 'priority') || hasFeature(entPlan, 'dedicated'),
      ],
      tooltip: '24/7 dedicated support with faster response times',
    },
    {
      label: 'Featured Listings',
      values: [
        hasFeature(freePlan, 'featured'),
        hasFeature(proPlan, 'featured'),
        hasFeature(entPlan, 'featured'),
      ],
      tooltip: 'Your jobs appear at the top of search results',
    },
    {
      label: 'Custom Branding',
      values: [
        hasFeature(freePlan, 'branding'),
        hasFeature(proPlan, 'branding'),
        hasFeature(entPlan, 'branding'),
      ],
      tooltip: 'White-label your job listings with company branding',
    },
    {
      label: 'Priority Listing',
      values: [
        hasFeature(freePlan, 'priority listing'),
        hasFeature(proPlan, 'priority listing'),
        hasFeature(entPlan, 'priority listing') || hasFeature(entPlan, 'featured listing'),
      ],
      tooltip: 'Jobs appear higher in candidate search results',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-20"
    >
      <div className="text-center mb-10">
        <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs">Detailed Comparison</Badge>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Compare Plans Side by Side</h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Every feature, every plan — see exactly what you get</p>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground min-w-[220px]">Feature</th>
                  <th className="text-center p-4 w-[140px]">
                    <div className="font-semibold text-muted-foreground">{freePlan?.name || 'Free'}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">${freePlan?.price_monthly ?? 0}/mo</div>
                  </th>
                  <th className="text-center p-4 w-[140px] bg-primary/5">
                    <div className="font-semibold text-primary flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {proPlan?.name || 'Pro'}
                    </div>
                    <div className="text-xs text-primary/70 mt-0.5">${proPlan?.price_monthly ?? 0}/mo</div>
                  </th>
                  <th className="text-center p-4 w-[140px]">
                    <div className="font-semibold text-foreground">{entPlan?.name || 'Enterprise'}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">${entPlan?.price_monthly ?? 0}/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-muted-foreground font-medium">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1.5 cursor-help">
                          {row.label}
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px]">
                          <p className="text-xs">{row.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className={cn("text-center p-4", vi === 1 && 'bg-primary/5')}>
                        {typeof val === 'boolean' ? (
                          val ? (
                            <div className="w-6 h-6 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                              <Check className="w-3.5 h-3.5 text-success" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mx-auto">
                              <X className="w-3.5 h-3.5 text-muted-foreground/40" />
                            </div>
                          )
                        ) : (
                          <span className={cn(
                            "text-sm font-semibold",
                            vi === 1 ? 'text-primary' : 'text-foreground'
                          )}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      </Card>
    </motion.div>
  );
};

const FAQSection = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="mt-20 max-w-3xl mx-auto"
  >
    <div className="text-center mb-10">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <HelpCircle className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
      <p className="text-muted-foreground mt-2">Everything you need to know about our plans</p>
    </div>

    <Accordion type="single" collapsible className="space-y-3">
      {faqs.map((faq, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-5 data-[state=open]:bg-muted/30 data-[state=open]:shadow-sm transition-all">
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
);

const CTASection = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="mt-20 mb-20"
  >
    <Card className="bg-gradient-to-br from-primary/5 via-primary/8 to-primary/5 border-primary/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.1),transparent_50%)]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,hsl(var(--primary)/0.06),transparent_70%)]" />
      <CardContent className="p-8 sm:p-14 text-center relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Headphones className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Need a custom plan?</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          Get tailored pricing for large teams with dedicated support, custom integrations, and volume discounts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="rounded-xl gap-2 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all" asChild>
            <a href="mailto:sales@hireforjob.com?subject=Enterprise%20Plan%20Inquiry">
              <Headphones className="w-4 h-4" />
              Contact Sales
            </a>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl hover:scale-[1.02] transition-all" asChild>
            <a href="mailto:support@hireforjob.com">Email Us</a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Typically responds within 2 hours during business hours
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

// --- Main component ---

const Plans = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [maxActiveJobs, setMaxActiveJobs] = useState(0);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
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
            const [subResult, activeResult] = await Promise.all([
              supabase
                .from('employer_subscriptions')
                .select('plan_id, current_period_end, employer_plans(name, max_active_jobs)')
                .eq('employer_id', empData.id)
                .eq('status', 'active')
                .maybeSingle(),
              supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('employer_id', empData.id)
                .eq('is_active', true)
                .eq('status', 'open'),
            ]);

            setActiveJobCount(activeResult.count || 0);

            if (subResult.data) {
              setCurrentPlanId(subResult.data.plan_id);
              const ep = subResult.data.employer_plans as any;
              if (ep) {
                setCurrentPlanName(ep.name);
                setMaxActiveJobs(ep.max_active_jobs);
              }
              setPeriodEnd(subResult.data.current_period_end);
            } else {
              // Default free plan
              setCurrentPlanName('Free');
              setMaxActiveJobs(1);
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
    if (!user) { navigate('/login'); return; }
    if (profile?.user_type !== 'employer') { toast.error('Only employers can subscribe to plans'); return; }
    if (plan.id === currentPlanId) { toast.info('You are already on this plan'); return; }
    if (plan.price_monthly === 0) { toast.info('You are on the free plan by default'); return; }
    toast.info('Payment integration coming soon! Contact us for enterprise plans.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading plans...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Hiring Plans & Pricing – Hire For Job" description="Choose the right plan to hire for job positions. Post jobs near me, reach candidates, and grow your team with Hire For Job." canonicalUrl="https://www.hireforjob.com/plans" />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/8 pt-8 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
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
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-xs font-medium tracking-wide uppercase gap-1.5">
              <Zap className="w-3 h-3" />
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4 leading-[1.1]">
              Find the perfect plan
              <span className="block text-primary">for your hiring needs</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises. Cancel anytime.
            </p>
          </motion.div>

          <BillingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-10">
        {/* Current Plan Usage Banner for Employers */}
        {currentPlanName && profile?.user_type === 'employer' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Card className={cn(
              "border overflow-hidden",
              currentPlanName === 'Free' ? 'border-amber-500/30' : 'border-primary/20'
            )}>
              <div className={cn(
                "h-1 w-full",
                currentPlanName === 'Free'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-primary to-primary/60'
              )} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                  {/* Plan info */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      currentPlanName === 'Free' ? 'bg-amber-500/10' : 'bg-primary/10'
                    )}>
                      {currentPlanName === 'Free' ? (
                        <Zap className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Crown className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Your Plan</span>
                        <Badge variant={currentPlanName === 'Free' ? 'secondary' : 'default'} className="text-xs">
                          {currentPlanName}
                        </Badge>
                      </div>
                      {periodEnd && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Renews {new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Job Slots Used</span>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        activeJobCount >= maxActiveJobs ? 'text-destructive' : 'text-foreground'
                      )}>
                        {activeJobCount} <span className="text-muted-foreground font-normal">of {maxActiveJobs}</span>
                      </span>
                    </div>
                    <Progress
                      value={maxActiveJobs > 0 ? Math.min((activeJobCount / maxActiveJobs) * 100, 100) : 0}
                      className={cn("h-2 rounded-full", activeJobCount >= maxActiveJobs && '[&>div]:bg-destructive')}
                    />
                    {activeJobCount >= maxActiveJobs ? (
                      <p className="text-xs text-destructive mt-1.5 font-medium">
                        All slots used — upgrade to post more jobs
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {maxActiveJobs - activeJobCount} slot{maxActiveJobs - activeJobCount !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No plans available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              We're having trouble loading our plans right now. Please try again in a moment.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="gap-2 rounded-xl">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                billingCycle={billingCycle}
                isCurrentPlan={plan.id === currentPlanId}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}

        <TrustBar />
        <ComparisonTable plans={plans} />
        <FAQSection />
        <CTASection />
      </div>
    </div>
  );
};

export default Plans;
