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

  // Static pages
  const staticPages = ['/', '/login', '/signup', '/terms', '/privacy', '/plans', '/browse-jobs'];

  // Fetch jobs with slugs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('slug, location_country, location_state, location_city, updated_at')
    .eq('status', 'open')
    .eq('is_active', true)
    .not('slug', 'is', null);

  // Fetch approved employers
  const { data: employers } = await supabase
    .from('employers')
    .select('slug, location_country, location_state, location_city, updated_at')
    .eq('verification_status', 'approved')
    .not('slug', 'is', null);

  const buildPath = (prefix: string, row: any) => {
    const parts = [prefix];
    if (row.location_country) parts.push(encodeURIComponent(row.location_country.toLowerCase().replace(/\s+/g, '-')));
    if (row.location_state) parts.push(encodeURIComponent(row.location_state.toLowerCase().replace(/\s+/g, '-')));
    if (row.location_city) parts.push(encodeURIComponent(row.location_city.toLowerCase().replace(/\s+/g, '-')));
    parts.push(row.slug);
    return parts.join('/');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static pages
  for (const page of staticPages) {
    xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.5'}</priority>
  </url>`;
  }

  // Jobs
  for (const job of jobs || []) {
    xml += `
  <url>
    <loc>${baseUrl}${buildPath('/jobs', job)}</loc>
    <lastmod>${job.updated_at ? new Date(job.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // Companies
  for (const emp of employers || []) {
    xml += `
  <url>
    <loc>${baseUrl}${buildPath('/companies', emp)}</loc>
    <lastmod>${emp.updated_at ? new Date(emp.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
  });
});
