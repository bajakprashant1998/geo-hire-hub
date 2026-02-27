import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://www.hireforjob.com';
const SITE_NAME = 'HireForJob';
const DEFAULT_IMAGE = `${BASE_URL}/logo.png`;

interface PageMeta {
  title: string;
  description: string;
  ogType: string;
  image: string;
  url: string;
  jsonLd?: Record<string, unknown>;
  breadcrumbJsonLd?: Record<string, unknown>;
}

function buildBreadcrumbJsonLd(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

function buildHtml(meta: PageMeta): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(meta.title)}</title>
  <meta name="description" content="${escHtml(meta.description)}" />
  <link rel="canonical" href="${escHtml(meta.url)}" />

  <meta property="og:type" content="${meta.ogType}" />
  <meta property="og:title" content="${escHtml(meta.title)}" />
  <meta property="og:description" content="${escHtml(meta.description)}" />
  <meta property="og:url" content="${escHtml(meta.url)}" />
  <meta property="og:image" content="${escHtml(meta.image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(meta.title)}" />
  <meta name="twitter:description" content="${escHtml(meta.description)}" />
  <meta name="twitter:image" content="${escHtml(meta.image)}" />

  ${meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>` : ''}
  ${meta.breadcrumbJsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.breadcrumbJsonLd)}</script>` : ''}

  <meta http-equiv="refresh" content="0;url=${escHtml(meta.url)}" />
</head>
<body>
  <h1>${escHtml(meta.title)}</h1>
  <p>${escHtml(meta.description)}</p>
  <a href="${escHtml(meta.url)}">Visit page</a>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let meta: PageMeta = {
    title: `${SITE_NAME} - Find Jobs & Talent Near You`,
    description: 'Discover jobs and talent on an interactive map. Connect with employers and candidates in your area.',
    ogType: 'website',
    image: DEFAULT_IMAGE,
    url: `${BASE_URL}${path}`,
  };

  try {
    const segments = path.split('/').filter(Boolean);

    // /jobs/... pages
    if (segments[0] === 'jobs' && segments.length >= 2) {
      const slug = segments[segments.length - 1];
      let { data: job } = await supabase
        .from('jobs')
        .select('id, title, description, job_type, salary_range, job_address, slug, created_at, location_country, location_state, location_city, employers!inner(company_name, website_url, profiles!inner(avatar_url))')
        .eq('slug', slug)
        .maybeSingle();

      if (!job) {
        const { data: jobById } = await supabase
          .from('jobs')
          .select('id, title, description, job_type, salary_range, job_address, slug, created_at, location_country, location_state, location_city, employers!inner(company_name, website_url, profiles!inner(avatar_url))')
          .eq('id', slug)
          .maybeSingle();
        job = jobById;
      }

      if (job) {
        const emp = job.employers as any;
        const created = new Date(job.created_at);
        const validThrough = new Date(created);
        validThrough.setDate(validThrough.getDate() + 30);

        const addressParts = job.job_address?.split(',').map((s: string) => s.trim()) || [];

        meta.title = `${job.title} at ${emp.company_name} | ${SITE_NAME}`;
        meta.description = `Apply for ${job.title} at ${emp.company_name}. ${job.job_type || 'Full-time'}${job.salary_range ? ` | ${job.salary_range}` : ''}${job.job_address ? ` | ${job.job_address}` : ''}`.slice(0, 160);
        meta.ogType = 'article';
        meta.image = emp.profiles?.avatar_url || DEFAULT_IMAGE;
        meta.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description || '',
          identifier: { '@type': 'PropertyValue', name: emp.company_name, value: job.id },
          hiringOrganization: {
            '@type': 'Organization',
            name: emp.company_name,
            ...(emp.profiles?.avatar_url && { logo: emp.profiles.avatar_url }),
            ...(emp.website_url && { sameAs: emp.website_url }),
          },
          employmentType: job.job_type?.toUpperCase().replace(/\s+/g, '_') || 'FULL_TIME',
          datePosted: created.toISOString(),
          validThrough: validThrough.toISOString(),
          directApply: true,
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...(addressParts.length >= 1 && { addressLocality: addressParts[0] }),
              ...(addressParts.length >= 2 && { addressRegion: addressParts[1] }),
              ...(addressParts.length >= 3 && { addressCountry: addressParts[2] }),
              ...(job.job_address && { streetAddress: job.job_address }),
            },
          },
          ...(job.salary_range && {
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: 'INR',
              value: { '@type': 'QuantitativeValue', value: job.salary_range, unitText: 'MONTH' },
            },
          }),
        };
        meta.breadcrumbJsonLd = buildBreadcrumbJsonLd([
          { name: 'Home', url: BASE_URL },
          { name: 'Jobs', url: `${BASE_URL}/browse-jobs` },
          { name: job.title },
        ]);
      }
    }

    // /companies/... pages
    if (segments[0] === 'companies' && segments.length >= 2) {
      const slug = segments[segments.length - 1];
      const { data: emp } = await supabase
        .from('employers')
        .select('company_name, description, industry, slug, team_size, website_url, location_city, location_state, location_country, profiles!inner(avatar_url)')
        .eq('slug', slug)
        .maybeSingle();

      if (emp) {
        const profile = emp.profiles as any;
        meta.title = `${emp.company_name}${emp.industry ? ` - ${emp.industry}` : ''} | ${SITE_NAME}`;
        meta.description = `${emp.company_name}${emp.industry ? `, ${emp.industry}` : ''}. View company profile and open positions on ${SITE_NAME}.`.slice(0, 160);
        meta.ogType = 'profile';
        meta.image = profile?.avatar_url || DEFAULT_IMAGE;
        meta.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: emp.company_name,
          description: emp.description || '',
          ...(emp.website_url && { url: emp.website_url }),
          ...(profile?.avatar_url && { logo: profile.avatar_url }),
          ...(emp.team_size && { numberOfEmployees: { '@type': 'QuantitativeValue', value: emp.team_size } }),
          ...(emp.location_city && {
            address: {
              '@type': 'PostalAddress',
              addressLocality: emp.location_city,
              ...(emp.location_state && { addressRegion: emp.location_state }),
              ...(emp.location_country && { addressCountry: emp.location_country }),
            },
          }),
        };
        meta.breadcrumbJsonLd = buildBreadcrumbJsonLd([
          { name: 'Home', url: BASE_URL },
          { name: 'Companies', url: `${BASE_URL}/browse-jobs` },
          { name: emp.company_name },
        ]);
      }
    }

    // /candidates/... pages
    if (segments[0] === 'candidates' && segments.length >= 2) {
      const slug = segments[segments.length - 1];
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (profile) {
        const { data: cand } = await supabase
          .from('candidates')
          .select('job_title, experience_years, bio')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (cand) {
          meta.title = `${profile.full_name} - ${cand.job_title} | ${SITE_NAME}`;
          meta.description = `${profile.full_name}, ${cand.job_title}${cand.experience_years ? ` with ${cand.experience_years}+ years experience` : ''}. View profile on ${SITE_NAME}.`.slice(0, 160);
          meta.ogType = 'profile';
          meta.image = profile.avatar_url || DEFAULT_IMAGE;
        }
      }
    }

    // Static pages
    const staticMeta: Record<string, Partial<PageMeta>> = {
      '/login': { title: `Login | ${SITE_NAME}`, description: 'Sign in to find jobs and connect with employers near you.' },
      '/signup': { title: `Sign Up | ${SITE_NAME}`, description: 'Create your account to find jobs or hire talent on HireForJob.' },
      '/browse-jobs': { title: `Browse Jobs | ${SITE_NAME}`, description: 'Browse all open job listings. Filter by type, location, and keywords.' },
      '/plans': { title: `Pricing Plans | ${SITE_NAME}`, description: 'Choose the right hiring plan for your business.' },
      '/terms': { title: `Terms of Service | ${SITE_NAME}`, description: 'Read HireForJob terms of service.' },
      '/privacy': { title: `Privacy Policy | ${SITE_NAME}`, description: 'Learn how HireForJob protects your privacy.' },
    };

    if (staticMeta[path]) {
      meta = { ...meta, ...staticMeta[path] };
    }
  } catch (e) {
    console.error('Error fetching meta:', e);
  }

  const html = buildHtml(meta);

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
});
