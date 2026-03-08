import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Quote, MessageSquareQuote } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string;
  company_name: string;
  avatar_url: string | null;
  quote: string;
  rating: number;
}

interface TestimonialsSectionProps {
  className?: string;
  compact?: boolean;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3.5 h-3.5",
          i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
        )}
      />
    ))}
  </div>
);

const TestimonialCard = ({ t, index }: { t: Testimonial; index: number }) => {
  const initials = t.author_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card className="h-full border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-6 flex flex-col h-full">
          <Quote className="w-8 h-8 text-primary/15 mb-3 shrink-0" />

          <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">
            "{t.quote}"
          </p>

          <div className="flex items-center gap-3 pt-4 border-t border-border/50">
            <Avatar className="w-10 h-10 border-2 border-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{t.author_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t.author_role}, {t.company_name}
              </p>
            </div>
            <StarRating rating={t.rating} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const TestimonialsSection = ({ className, compact = false }: TestimonialsSectionProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('employer_testimonials')
        .select('id, author_name, author_role, company_name, avatar_url, quote, rating')
        .eq('is_featured', true)
        .eq('is_approved', true)
        .order('sort_order')
        .limit(compact ? 3 : 6);

      if (data) setTestimonials(data);
      setLoading(false);
    };
    fetch();
  }, [compact]);

  if (loading || testimonials.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn("mt-20", className)}
    >
      <div className="text-center mb-10">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageSquareQuote className="w-6 h-6 text-primary" />
        </div>
        <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs">Social Proof</Badge>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Trusted by Employers Everywhere
        </h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          See what hiring teams say about finding talent on our platform
        </p>
      </div>

      <div className={cn(
        "grid gap-5",
        compact ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"
      )}>
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.id} t={t} index={i} />
        ))}
      </div>
    </motion.section>
  );
};
