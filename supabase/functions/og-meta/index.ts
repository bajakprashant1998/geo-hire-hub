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
  <meta property="og:site_name" content="${SITE_NAME}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(meta.title)}" />
  <meta name="twitter:description" content="${escHtml(meta.description)}" />
  <meta name="twitter:image" content="${escHtml(meta.image)}" />

  ${meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>` : ''}

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
      // Try slug first, then UUID
      let query = supabase
        .from('jobs')
        .select('title, description, job_type, salary_range, job_address, slug, employers!inner(company_name, profiles!inner(avatar_url))')
        .eq('slug', slug)
        .maybeSingle();

      let { data: job } = await query;

      if (!job) {
        // Try UUID
        const { data: jobById } = await supabase
          .from('jobs')
          .select('title, description, job_type, salary_range, job_address, slug, employers!inner(company_name, profiles!inner(avatar_url))')
          .eq('id', slug)
          .maybeSingle();
        job = jobById;
      }

      if (job) {
        const emp = job.employers as any;
        meta.title = `${job.title} at ${emp.company_name} | ${SITE_NAME}`;
        meta.description = `Apply for ${job.title} at ${emp.company_name}. ${job.job_type || 'Full-time'}${job.salary_range ? ` | ${job.salary_range}` : ''}${job.job_address ? ` | ${job.job_address}` : ''}`.slice(0, 160);
        meta.ogType = 'article';
        meta.image = emp.profiles?.avatar_url || DEFAULT_IMAGE;
        meta.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description || '',
          hiringOrganization: { '@type': 'Organization', name: emp.company_name },
          employmentType: job.job_type?.toUpperCase().replace(/\s+/g, '_') || 'FULL_TIME',
          datePosted: new Date().toISOString(),
        };
      }
    }

    // /companies/... pages
    if (segments[0] === 'companies' && segments.length >= 2) {
      const slug = segments[segments.length - 1];
      const { data: emp } = await supabase
        .from('employers')
        .select('company_name, description, industry, slug, profiles!inner(avatar_url)')
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
        };
      }
    }

    // /candidates/... pages
    if (segments[0] === 'candidates' && segments.length >= 2) {
      const slug = segments[segments.length - 1];
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (profile) {
        const { data: cand } = await supabase
          .from('candidates')
          .select('job_title, experience_years, bio')
          .eq('profile_id', (await supabase.from('profiles').select('id').eq('slug', slug).single()).data?.id)
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
