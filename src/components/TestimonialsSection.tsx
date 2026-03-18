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
      className="min-w-0"
    >
      <Card className="h-full border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col h-full">
          <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-primary/15 mb-2 sm:mb-3 shrink-0" />

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 mb-4 sm:mb-5 break-words">
            "{t.quote}"
          </p>

          <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border/50 min-w-0">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{t.author_name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {t.author_role}, {t.company_name}
              </p>
            </div>
            <div className="shrink-0">
              <StarRating rating={t.rating} />
            </div>
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
      className={cn("mt-12 sm:mt-20 overflow-hidden", className)}
    >
      <div className="text-center mb-6 sm:mb-10 px-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <MessageSquareQuote className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <Badge variant="secondary" className="mb-2 sm:mb-3 px-3 py-1 text-xs">Social Proof</Badge>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Trusted by Employers Everywhere
        </h2>
        <p className="text-muted-foreground mt-1.5 sm:mt-2 max-w-lg mx-auto text-xs sm:text-sm">
          See what hiring teams say about finding talent on our platform
        </p>
      </div>

      <div className={cn(
        "grid gap-3 sm:gap-5",
        compact ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.id} t={t} index={i} />
        ))}
      </div>
    </motion.section>
  );
};
