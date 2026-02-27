

## SEO Upgrade Plan — Google 2025/2026 Algorithm Alignment

### Current Gaps Identified

1. **Missing Core Web Vitals signals** — No `<link rel="preconnect">`, no font preloading, no `fetchpriority` on LCP image
2. **Incomplete JSON-LD** — JobPosting missing `validThrough`, `jobLocation.address` as `PostalAddress`, `applicantLocationRequirements`, `directApply`; Organization missing `logo`, `url`, `sameAs`; No `BreadcrumbList` on any page
3. **No `<meta name="theme-color">` for mobile** — hurts PWA SEO signal
4. **Sitemap missing `<lastmod>` on static pages**, no `<sitemapindex>` for scalability, missing candidate URLs
5. **`og-meta` edge function** — JobPosting JSON-LD incomplete (same gaps), no `BreadcrumbList`, no `validThrough`
6. **`robots.txt`** leaks internal Supabase URL, missing `Disallow` for admin/dashboard/auth routes
7. **`index.html`** — Missing `<meta name="google-site-verification">`, missing `<link rel="preconnect">` for Google Maps/Fonts, missing `theme-color`
8. **BrowseJobs page** — No `ItemList` JSON-LD for job listing aggregation
9. **No `hreflang` tags** despite 8 language translations (i18n)
10. **No breadcrumb component** on detail pages — Google shows breadcrumbs in search results via `BreadcrumbList` schema
11. **SEOHead doesn't support `og:image:width/height`** — needed for rich previews
12. **Missing `speakable` schema** for Google Assistant integration

---

### Implementation Plan

#### Task 1: Upgrade `index.html` — Core Web Vitals + Meta
- Add `<meta name="theme-color" content="#2563eb">`
- Add `<link rel="preconnect" href="https://maps.googleapis.com">` and `dns-prefetch`
- Add `fetchpriority="high"` concept note (SPA limitation)
- Remove `<meta name="keywords">` (Google ignores it since 2009)
- Add `<meta name="google-site-verification">` placeholder

#### Task 2: Upgrade `SEOHead.tsx`
- Add `og:image:width`, `og:image:height`, `og:locale` support
- Add `hreflang` alternate links for all 8 languages
- Add `article:published_time` and `article:modified_time` for article ogType
- Support `breadcrumbJsonLd` as separate prop for `BreadcrumbList` schema

#### Task 3: Upgrade `robots.txt`
- Remove raw Supabase URL (keep only `hireforjob.com/sitemap.xml`)
- Add `Disallow` for `/admin`, `/candidate-dashboard`, `/employer-dashboard`, `/candidate-settings`, `/employer-settings`, `/profile-setup`, `/messages`, `/auth/callback`, `/select-role`, `/video-call`
- Add `Crawl-delay: 1` for generic bots

#### Task 4: Upgrade JobDetail JSON-LD (client-side)
- Add `validThrough` (30 days from `created_at` or actual expiry)
- Structure `jobLocation` as proper `PostalAddress` with `addressLocality`, `addressRegion`, `addressCountry`
- Add `directApply: true`
- Add `applicantLocationRequirements` when location data exists
- Add `identifier` with employer name + job ID
- Add `BreadcrumbList` JSON-LD (Home > Jobs > Country > City > Job Title)

#### Task 5: Upgrade EmployerDetail JSON-LD
- Add `logo`, `url`, `address`, `numberOfEmployees`
- Add `BreadcrumbList` (Home > Companies > Company Name)

#### Task 6: Upgrade BrowseJobs page
- Add `ItemList` JSON-LD schema for job listing aggregation
- Add breadcrumb schema (Home > Browse Jobs)

#### Task 7: Upgrade `og-meta` edge function
- Mirror all JSON-LD improvements from Tasks 4-5
- Add `validThrough`, proper `PostalAddress`, `directApply`
- Fetch `salary_min`, `salary_max`, `salary_currency` for proper `baseSalary`
- Add `datePosted` from actual `created_at` instead of `new Date()`

#### Task 8: Upgrade sitemap edge function
- Add candidate profile URLs (public profiles)
- Add `<lastmod>` to static pages
- Add proper XML namespace for images if employer has logo
- Cap at 50,000 URLs per sitemap, add `<sitemapindex>` wrapper if needed

#### Task 9: Create `BreadcrumbNav` UI component
- Visible breadcrumb navigation on JobDetail, EmployerDetail, CandidateDetail, BrowseJobs
- Renders as accessible `<nav aria-label="Breadcrumb">` with `<ol>` markup
- Matches the `BreadcrumbList` JSON-LD for consistency

### Files to Create/Modify
- **Edit**: `index.html`
- **Edit**: `src/components/SEOHead.tsx`
- **Edit**: `public/robots.txt`
- **Edit**: `src/pages/JobDetail.tsx` (JSON-LD + breadcrumb)
- **Edit**: `src/pages/EmployerDetail.tsx` (JSON-LD + breadcrumb)
- **Edit**: `src/pages/BrowseJobs.tsx` (JSON-LD + breadcrumb)
- **Edit**: `supabase/functions/og-meta/index.ts`
- **Edit**: `supabase/functions/sitemap/index.ts`
- **Create**: `src/components/BreadcrumbNav.tsx`

