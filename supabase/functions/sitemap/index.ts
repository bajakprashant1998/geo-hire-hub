import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const baseUrl = 'https://www.hireforjob.com';
  const today = new Date().toISOString().split('T')[0];

  // Static pages with priorities
  const staticPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/jobs-near-me', changefreq: 'daily', priority: '0.95' },
    { path: '/browse-jobs', changefreq: 'daily', priority: '0.9' },
    { path: '/plans', changefreq: 'monthly', priority: '0.5' },
    { path: '/login', changefreq: 'monthly', priority: '0.3' },
    { path: '/signup', changefreq: 'monthly', priority: '0.3' },
    { path: '/terms', changefreq: 'yearly', priority: '0.2' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  ];

  // Fetch jobs with slugs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('slug, location_country, location_state, location_city, updated_at')
    .eq('status', 'open')
    .eq('is_active', true)
    .not('slug', 'is', null)
    .limit(50000);

  // Fetch approved employers
  const { data: employers } = await supabase
    .from('employers')
    .select('slug, location_country, location_state, location_city, updated_at')
    .eq('verification_status', 'approved')
    .not('slug', 'is', null)
    .limit(10000);

  // Fetch public candidate profiles
  const { data: candidates } = await supabase
    .from('profiles')
    .select('slug, updated_at')
    .eq('is_visible_on_map', true)
    .not('slug', 'is', null)
    .limit(10000);

  const buildPath = (prefix: string, row: any) => {
    const parts = [prefix];
    if (row.location_country) parts.push(encodeURIComponent(row.location_country.toLowerCase().replace(/\s+/g, '-')));
    if (row.location_state) parts.push(encodeURIComponent(row.location_state.toLowerCase().replace(/\s+/g, '-')));
    if (row.location_city) parts.push(encodeURIComponent(row.location_city.toLowerCase().replace(/\s+/g, '-')));
    parts.push(row.slug);
    return parts.join('/');
  };

  const getLastmod = (row: any) =>
    row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : today;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static pages
  for (const page of staticPages) {
    xml += `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  // Jobs
  for (const job of jobs || []) {
    xml += `
  <url>
    <loc>${baseUrl}${buildPath('/jobs', job)}</loc>
    <lastmod>${getLastmod(job)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // Companies
  for (const emp of employers || []) {
    xml += `
  <url>
    <loc>${baseUrl}${buildPath('/companies', emp)}</loc>
    <lastmod>${getLastmod(emp)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }

  // Candidates
  for (const cand of candidates || []) {
    xml += `
  <url>
    <loc>${baseUrl}/candidates/${cand.slug}</loc>
    <lastmod>${getLastmod(cand)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
  });
});
