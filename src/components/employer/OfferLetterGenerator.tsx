import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Sparkles, Copy, Download, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OfferLetterGeneratorProps {
  employerId: string;
  companyName: string;
}

const TEMPLATES = [
  { id: 'standard', label: 'Standard Offer', description: 'Professional full-time offer letter' },
  { id: 'internship', label: 'Internship', description: 'Internship/training offer' },
  { id: 'contract', label: 'Contract', description: 'Fixed-term contract offer' },
  { id: 'executive', label: 'Executive', description: 'Senior/executive level offer' },
];

export const OfferLetterGenerator = ({ employerId, companyName }: OfferLetterGeneratorProps) => {
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [salary, setSalary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [template, setTemplate] = useState('standard');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!candidateName || !jobTitle || !salary) {
      toast.error('Please fill in candidate name, job title, and salary');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', {
        body: {
          prompt: `Generate a professional offer letter for the following:
Company: ${companyName}
Candidate: ${candidateName}
Position: ${jobTitle}
Salary/Package: ${salary}
Start Date: ${startDate || 'To be determined'}
Template Style: ${template}
Additional Notes: ${additionalNotes || 'None'}

Create a complete, professional offer letter with proper formatting. Include sections for:
- Welcome and congratulations
- Position details and responsibilities overview
- Compensation and benefits
- Start date and onboarding details
- Terms and conditions
- Acceptance deadline
- Signature lines

Make it warm yet professional. Use proper business letter format.`,
        },
      });

      if (error) throw error;
      setGeneratedLetter(data?.description || data?.text || 'Failed to generate letter');
      toast.success('Offer letter generated!');
    } catch (err: any) {
      console.error('Error generating offer letter:', err);
      toast.error('Failed to generate offer letter');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-letter-${candidateName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">AI Offer Letter Generator</h2>
          <p className="text-sm text-muted-foreground">Create professional offer letters in seconds</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Letter Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      template === t.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/40 hover:border-border'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Candidate Name *</Label>
              <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Software Engineer" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Salary/Package *</Label>
                <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="₹12,00,000/year" />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any specific benefits, probation period, etc."
                rows={3}
              />
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2 rounded-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Offer Letter'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Preview</CardTitle>
              {generatedLetter && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 rounded-lg">
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 rounded-lg">
                    <Download className="w-3 h-3" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 rounded-lg">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedLetter ? (
              <div className="prose prose-sm max-w-none bg-muted/30 rounded-xl p-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap text-foreground text-sm leading-relaxed">
                {generatedLetter}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Fill in the details and generate your offer letter</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
