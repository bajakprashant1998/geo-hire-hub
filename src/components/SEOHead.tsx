import { useEffect } from 'react';

const SUPPORTED_LOCALES = ['en', 'hi', 'es', 'fr', 'ar', 'pt', 'zh', 'ja'];
const BASE_URL = 'https://www.hireforjob.com';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: 'website' | 'article' | 'profile';
  jsonLd?: Record<string, any>;
  breadcrumbJsonLd?: Record<string, any>;
  /** Additional JSON-LD blocks (FAQ, HowTo, Speakable, etc.) */
  extraJsonLd?: Record<string, any>[];
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  /** AEO: CSS selectors for Speakable content */
  speakableSelectors?: string[];
  /** GEO: keywords for AI engines */
  geoKeywords?: string[];
}

export const SEOHead = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogImageWidth,
  ogImageHeight,
  ogType = 'website',
  jsonLd,
  breadcrumbJsonLd,
  extraJsonLd,
  noindex = false,
  publishedTime,
  modifiedTime,
  speakableSelectors,
  geoKeywords,
}: SEOHeadProps) => {
  useEffect(() => {
    // Title
    document.title = title.length > 60 ? title.slice(0, 57) + '...' : title;

    // Meta description
    const metaDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;
    setMeta('description', metaDesc);

    // Robots
    if (noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      removeMeta('robots');
    }

    // Open Graph
    setMeta('og:title', title, 'property');
    setMeta('og:description', metaDesc, 'property');
    setMeta('og:type', ogType, 'property');
    setMeta('og:site_name', 'HireForJob', 'property');
    setMeta('og:locale', 'en_US', 'property');
    if (ogImage) {
      setMeta('og:image', ogImage, 'property');
      if (ogImageWidth) setMeta('og:image:width', String(ogImageWidth), 'property');
      if (ogImageHeight) setMeta('og:image:height', String(ogImageHeight), 'property');
    }
    if (canonicalUrl) setMeta('og:url', canonicalUrl, 'property');

    // Article timestamps
    if (ogType === 'article') {
      if (publishedTime) setMeta('article:published_time', publishedTime, 'property');
      if (modifiedTime) setMeta('article:modified_time', modifiedTime, 'property');
    }

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', metaDesc);
    if (ogImage) setMeta('twitter:image', ogImage);

    // AEO: Speakable meta hint for voice assistants
    if (speakableSelectors?.length) {
      setMeta('speakable', speakableSelectors.join(','));
    }

    // GEO: AI engine keywords
    if (geoKeywords?.length) {
      setMeta('keywords', geoKeywords.join(', '));
    }

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalUrl) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    } else if (link) {
      link.remove();
    }

    // Hreflang tags
    document.querySelectorAll('link[data-seo-hreflang]').forEach(el => el.remove());
    if (canonicalUrl) {
      const path = canonicalUrl.replace(BASE_URL, '');
      for (const locale of SUPPORTED_LOCALES) {
        const hreflang = document.createElement('link');
        hreflang.rel = 'alternate';
        hreflang.hreflang = locale;
        hreflang.href = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}lang=${locale}`;
        hreflang.setAttribute('data-seo-hreflang', 'true');
        document.head.appendChild(hreflang);
      }
      // x-default
      const xDefault = document.createElement('link');
      xDefault.rel = 'alternate';
      xDefault.hreflang = 'x-default';
      xDefault.href = canonicalUrl;
      xDefault.setAttribute('data-seo-hreflang', 'true');
      document.head.appendChild(xDefault);
    }

    // JSON-LD (main)
    const existingLd = document.querySelector('script[data-seo-jsonld]');
    if (existingLd) existingLd.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    // JSON-LD (breadcrumb)
    const existingBreadcrumbLd = document.querySelector('script[data-seo-breadcrumb]');
    if (existingBreadcrumbLd) existingBreadcrumbLd.remove();
    if (breadcrumbJsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-breadcrumb', 'true');
      script.textContent = JSON.stringify(breadcrumbJsonLd);
      document.head.appendChild(script);
    }

    // Extra JSON-LD blocks (FAQ, HowTo, Speakable, etc.)
    document.querySelectorAll('script[data-seo-extra-ld]').forEach(el => el.remove());
    if (extraJsonLd?.length) {
      extraJsonLd.forEach((ld, i) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-extra-ld', String(i));
        script.textContent = JSON.stringify(ld);
        document.head.appendChild(script);
      });
    }

    // Speakable JSON-LD (AEO)
    document.querySelectorAll('script[data-seo-speakable]').forEach(el => el.remove());
    if (speakableSelectors?.length && canonicalUrl) {
      const speakableJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': title,
        'url': canonicalUrl,
        'speakable': {
          '@type': 'SpeakableSpecification',
          'cssSelector': speakableSelectors,
        },
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-speakable', 'true');
      script.textContent = JSON.stringify(speakableJsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelectorAll('script[data-seo-jsonld], script[data-seo-breadcrumb], script[data-seo-extra-ld], script[data-seo-speakable]').forEach(el => el.remove());
      document.querySelectorAll('link[data-seo-hreflang]').forEach(el => el.remove());
    };
  }, [title, description, canonicalUrl, ogImage, ogImageWidth, ogImageHeight, ogType, jsonLd, breadcrumbJsonLd, extraJsonLd, noindex, publishedTime, modifiedTime, speakableSelectors, geoKeywords]);

  return null;
};

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeMeta(name: string) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.remove();
}
