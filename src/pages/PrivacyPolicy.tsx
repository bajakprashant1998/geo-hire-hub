import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Privacy Policy – Hire For Job" description="Learn how Hire For Job protects your privacy and handles your personal data on our jobs near me platform." canonicalUrl="https://www.hireforjob.com/privacy" />
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">We collect information you provide directly:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Account Information:</strong> Name, email address, password, and user type (candidate or employer).</li>
            <li><strong>Profile Information:</strong> Job title, skills, experience, company details, and profile photos.</li>
            <li><strong>Location Data:</strong> Geographic coordinates to enable map-based discovery (with your consent).</li>
            <li><strong>Communications:</strong> Messages sent through our platform.</li>
            <li><strong>Application Data:</strong> Job applications, cover letters, and resumes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>To provide and improve our job matching and discovery services.</li>
            <li>To display your profile on the map (candidates can control visibility).</li>
            <li>To facilitate communication between candidates and employers.</li>
            <li>To send notifications about application status changes and new opportunities.</li>
            <li>To maintain platform security and prevent fraud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We may share information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Other Users:</strong> Your profile information is visible to employers (for candidates) or candidates (for employers) based on your visibility settings.</li>
            <li><strong>Service Providers:</strong> Third-party services that help us operate the Platform.</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including encryption, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Access:</strong> You can access your personal data through your profile settings.</li>
            <li><strong>Correction:</strong> You can update your information at any time.</li>
            <li><strong>Deletion:</strong> You can request account deletion through Security Settings.</li>
            <li><strong>Visibility:</strong> Candidates can toggle map visibility on/off.</li>
            <li><strong>Data Export:</strong> You can export your profile as a PDF.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Cookies & Analytics</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies for authentication and session management. We may use analytics to understand how users interact with the Platform to improve our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your data as long as your account is active. Messages are automatically cleaned up after 60 days. Upon account deletion, your data is permanently removed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related inquiries, contact us at <a href="mailto:privacy@hireforjob.com" className="text-primary hover:underline">privacy@hireforjob.com</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
