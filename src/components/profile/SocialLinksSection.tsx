import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Linkedin, Twitter, Github, Globe, Instagram, Youtube } from 'lucide-react';

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
  instagram?: string;
  youtube?: string;
}

interface SocialLinksSectionProps {
  links: SocialLinks;
  onChange: (links: SocialLinks) => void;
  showGithub?: boolean;
}

export const SocialLinksSection = ({ links, onChange, showGithub = true }: SocialLinksSectionProps) => {
  const updateLink = (key: keyof SocialLinks, value: string) => {
    onChange({ ...links, [key]: value });
  };

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="w-5 h-5 text-primary" />
          Social Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              LinkedIn
            </Label>
            <Input
              value={links.linkedin || ''}
              onChange={(e) => updateLink('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
              Twitter / X
            </Label>
            <Input
              value={links.twitter || ''}
              onChange={(e) => updateLink('twitter', e.target.value)}
              placeholder="https://twitter.com/username"
            />
          </div>
          {showGithub && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </Label>
              <Input
                value={links.github || ''}
                onChange={(e) => updateLink('github', e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-google-blue" />
              Personal Website
            </Label>
            <Input
              value={links.website || ''}
              onChange={(e) => updateLink('website', e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-[#E4405F]" />
              Instagram
            </Label>
            <Input
              value={links.instagram || ''}
              onChange={(e) => updateLink('instagram', e.target.value)}
              placeholder="https://instagram.com/username"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-[#FF0000]" />
              YouTube
            </Label>
            <Input
              value={links.youtube || ''}
              onChange={(e) => updateLink('youtube', e.target.value)}
              placeholder="https://youtube.com/@channel"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
