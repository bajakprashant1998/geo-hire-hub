import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Terms of Service – Hire For Job" description="Read the terms of service for Hire For Job, the platform for finding jobs near me and hiring talent." canonicalUrl="https://www.hireforjob.com/terms" />
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using HireForJob ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            HireForJob is a location-based job search and recruitment platform that connects job seekers with employers. The Platform provides features including job posting, candidate discovery, messaging, and application management.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You must provide accurate and complete information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must be at least 18 years old to create an account.</li>
            <li>One person may not maintain more than one account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Post false, misleading, or fraudulent job listings or profile information.</li>
            <li>Harass, abuse, or threaten other users.</li>
            <li>Use the Platform for any illegal or unauthorized purpose.</li>
            <li>Attempt to gain unauthorized access to any part of the Platform.</li>
            <li>Scrape, crawl, or use automated means to access the Platform without permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Job Postings</h2>
          <p className="text-muted-foreground leading-relaxed">
            Employers are responsible for the accuracy of their job postings. HireForJob reserves the right to remove any job posting that violates these terms or applicable laws. Government job postings require verified government email domains.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Privacy & Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your use of the Platform is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. By using the Platform, you consent to the collection and use of information as described therein.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Platform and its original content, features, and functionality are owned by HireForJob and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            HireForJob shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Platform. We do not guarantee employment outcomes or the accuracy of information provided by other users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may terminate or suspend your account at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about these Terms, please contact us at <a href="mailto:support@hireforjob.com" className="text-primary hover:underline">support@hireforjob.com</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;
