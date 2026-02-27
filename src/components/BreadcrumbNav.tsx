import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbNav = ({ items }: BreadcrumbNavProps) => (
  <nav aria-label="Breadcrumb" className="mb-4">
    <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
      <li className="inline-flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
        <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1" itemProp="item">
          <Home className="w-3.5 h-3.5" />
          <span itemProp="name">Home</span>
        </Link>
        <meta itemProp="position" content="1" />
      </li>
      {items.map((item, i) => (
        <li key={i} className="inline-flex items-center gap-1" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground transition-colors" itemProp="item">
              <span itemProp="name">{item.label}</span>
            </Link>
          ) : (
            <span className="text-foreground font-medium" itemProp="name">{item.label}</span>
          )}
          <meta itemProp="position" content={String(i + 2)} />
        </li>
      ))}
    </ol>
  </nav>
);

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const allItems = [{ label: 'Home', href: '/' }, ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: item.href ? `https://www.hireforjob.com${item.href}` : undefined,
    })),
  };
}
