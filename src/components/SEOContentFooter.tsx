import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Building2, TrendingUp } from 'lucide-react';

export const SEOContentFooter = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Hire For Job – Find Jobs Near Me on the Map
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          <strong>Hire For Job</strong> is the easiest way to find <strong>jobs near me</strong>. 
          Browse <strong>job listings near me</strong> on an interactive map and discover <strong>jobs hiring near me</strong> in real time. 
          Whether you're looking for full-time, part-time, contract, or freelance work, 
          Hire For Job connects you with verified employers in your area. 
          Search by location, industry, salary range, and job type to find the perfect opportunity.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/jobs-near-me" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Jobs Near Me</span>
          </Link>
          <Link to="/browse-jobs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Job Listings Near Me</span>
          </Link>
          <Link to="/jobs-near-me" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Jobs Hiring Near Me</span>
          </Link>
          <Link to="/signup" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Hire For Job</span>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Hire For Job. Find jobs near me, browse job listings near me, and apply to jobs hiring near me.
        </p>
      </div>
    </footer>
  );
};
