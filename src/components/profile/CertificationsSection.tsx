import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, X } from 'lucide-react';

interface CertificationsSectionProps {
  certifications: string[];
  onChange: (certifications: string[]) => void;
}

export const CertificationsSection = ({ certifications, onChange }: CertificationsSectionProps) => {
  const [input, setInput] = useState('');

  const addCertification = () => {
    if (input.trim() && !certifications.includes(input.trim())) {
      onChange([...certifications, input.trim()]);
      setInput('');
    }
  };

  const removeCertification = (cert: string) => {
    onChange(certifications.filter((c) => c !== cert));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCertification();
    }
  };

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5 text-primary" />
          Certifications & Licenses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., AWS Solutions Architect, PMP"
          />
          <Button type="button" variant="secondary" onClick={addCertification}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-3 py-1.5 text-sm flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                {cert}
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {certifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add your professional certifications, licenses, or credentials
          </p>
        )}
      </CardContent>
    </Card>
  );
};
