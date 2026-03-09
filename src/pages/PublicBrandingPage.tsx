import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2, MapPin, Globe, Users, Briefcase, ArrowLeft,
  Image, Video, Quote, Type, Play,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SECTION_ICONS: Record<string, React.ElementType> = {
  text: Type,
  hero_image: Image,
  video: Video,
  testimonial: Quote,
  team: Users,
  gallery: Image,
};

const PublicBrandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: employer, isLoading: empLoading } = useQuery({
    queryKey: ['employer-branding', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, slug, industry, description, team_size, website_url, work_environment, office_photo_url, location_country, location_state, location_city, company_values, culture_description, work_culture_type, profiles(full_name, avatar_url)')
        .eq('slug', slug!)
        .eq('verification_status', 'approved')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: sections, isLoading: secLoading } = useQuery({
    queryKey: ['branding-sections-public', employer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_branding_sections')
        .select('*')
        .eq('employer_id', employer!.id)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!employer?.id,
  });

  const loading = empLoading || secLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Company Not Found</h1>
          <p className="text-muted-foreground mb-4">This company page doesn't exist or isn't public.</p>
          <Button asChild variant="outline"><Link to="/browse-jobs">Browse Jobs</Link></Button>
        </div>
      </div>
    );
  }

  const location = [employer.location_city, employer.location_state, employer.location_country].filter(Boolean).join(', ');

  const renderSection = (section: any, index: number) => {
    const Icon = SECTION_ICONS[section.section_type] || Type;

    return (
      <motion.div
        key={section.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        {section.section_type === 'hero_image' && section.media_url ? (
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src={section.media_url}
              alt={section.title || 'Company hero'}
              className="w-full h-64 sm:h-80 object-cover"
              loading="lazy"
            />
            {section.title && (
              <div className="p-6 bg-card">
                <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                {section.content && <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{section.content}</p>}
              </div>
            )}
          </div>
        ) : section.section_type === 'video' && section.media_url ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted relative">
                {section.media_url.includes('youtube') || section.media_url.includes('youtu.be') ? (
                  <iframe
                    src={section.media_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    loading="lazy"
                    title={section.title || 'Company video'}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <a href={section.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Play className="w-10 h-10" />
                      <span>Watch Video</span>
                    </a>
                  </div>
                )}
              </div>
              {section.title && (
                <div className="p-5">
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  {section.content && <p className="text-muted-foreground text-sm mt-1">{section.content}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        ) : section.section_type === 'testimonial' ? (
          <Card className="border-l-4 border-l-primary/40">
            <CardContent className="p-6">
              <Quote className="w-8 h-8 text-primary/20 mb-3" />
              <blockquote className="text-foreground italic text-lg leading-relaxed">
                "{section.content}"
              </blockquote>
              {section.title && (
                <p className="mt-4 text-sm font-semibold text-muted-foreground">— {section.title}</p>
              )}
            </CardContent>
          </Card>
        ) : section.section_type === 'gallery' && section.media_url ? (
          <div>
            {section.title && <h3 className="text-lg font-semibold text-foreground mb-3">{section.title}</h3>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {section.media_url.split(',').map((url: string, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-square">
                  <img src={url.trim()} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            {section.content && <p className="text-muted-foreground text-sm mt-3">{section.content}</p>}
          </div>
        ) : (
          <div>
            {section.title && <h3 className="text-lg font-semibold text-foreground mb-2">{section.title}</h3>}
            {section.content && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${employer.company_name} — Culture & Careers | Hire for Job`}
        description={employer.description?.slice(0, 155) || `Learn about working at ${employer.company_name}. Discover their culture, values, and open positions.`}
        canonicalUrl={`https://www.hireforjob.com/companies/${slug}/culture`}
      />

      {/* Hero header */}
      <div className="border-b bg-gradient-to-br from-primary/[0.04] via-background to-accent/30">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="flex items-start gap-5">
            {employer.office_photo_url ? (
              <img src={employer.office_photo_url} alt={employer.company_name} className="w-16 h-16 rounded-2xl object-cover border shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{employer.company_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {employer.industry && (
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {employer.industry}</span>
                )}
                {location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                )}
                {employer.team_size && (
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {employer.team_size}</span>
                )}
                {employer.website_url && (
                  <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
              </div>
              {employer.description && (
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed line-clamp-3">{employer.description}</p>
              )}
            </div>
          </div>

          {/* Culture highlights */}
          <div className="flex flex-wrap gap-2 mt-5">
            {employer.work_culture_type && <Badge variant="secondary">{employer.work_culture_type}</Badge>}
            {employer.work_environment && <Badge variant="outline">{employer.work_environment}</Badge>}
            {(employer.company_values as string[] | null)?.slice(0, 5).map((v: string) => (
              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Branding sections */}
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Culture description */}
        {employer.culture_description && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold text-foreground mb-3">Our Culture</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{employer.culture_description}</p>
          </motion.div>
        )}

        {/* Dynamic sections */}
        {sections && sections.length > 0 ? (
          sections.map((section, i) => renderSection(section, i))
        ) : !employer.culture_description ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">This company hasn't published a culture page yet.</p>
          </div>
        ) : null}

        {/* CTA */}
        <div className="text-center pt-4 pb-8">
          <Button asChild size="lg" className="rounded-xl gap-2">
            <Link to={`/companies/${slug}`}>
              <Briefcase className="w-4 h-4" /> View Open Positions
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicBrandingPage;
