import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText, Sparkles, Copy, Download, Loader2, RefreshCw,
  Calendar, DollarSign, User, Briefcase, Clock, CheckCircle2,
  FileSignature, Building2, ChevronRight, Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface OfferLetterGeneratorProps {
  employerId: string;
  companyName: string;
}

const TEMPLATES = [
  { id: 'standard', label: 'Standard Offer', description: 'Professional full-time offer letter', icon: FileText, color: 'bg-primary/10 text-primary' },
  { id: 'internship', label: 'Internship', description: 'Internship/training offer', icon: Clock, color: 'bg-amber-500/10 text-amber-600' },
  { id: 'contract', label: 'Contract', description: 'Fixed-term contract offer', icon: FileSignature, color: 'bg-emerald-500/10 text-emerald-600' },
  { id: 'executive', label: 'Executive', description: 'Senior/executive level offer', icon: Building2, color: 'bg-violet-500/10 text-violet-600' },
];

interface LetterHistory {
  candidateName: string;
  jobTitle: string;
  template: string;
  generatedAt: Date;
  letter: string;
}

export const OfferLetterGenerator = ({ employerId, companyName }: OfferLetterGeneratorProps) => {
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [salary, setSalary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [template, setTemplate] = useState('standard');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [history, setHistory] = useState<LetterHistory[]>([]);

  const selectedTemplate = TEMPLATES.find(t => t.id === template)!;

  const formProgress = useMemo(() => {
    const fields = [candidateName, jobTitle, salary];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [candidateName, jobTitle, salary]);

  const isFormValid = candidateName && jobTitle && salary;

  const handleGenerate = async () => {
    if (!isFormValid) {
      toast.error('Please fill in all required fields');
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
      const letter = data?.description || data?.text || 'Failed to generate letter';
      setGeneratedLetter(letter);
      setHistory(prev => [{
        candidateName,
        jobTitle,
        template,
        generatedAt: new Date(),
        letter,
      }, ...prev].slice(0, 10));
      setActiveTab('preview');
      toast.success('Offer letter generated successfully!');
    } catch (err: any) {
      console.error('Error generating offer letter:', err);
      toast.error('Failed to generate offer letter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-letter-${candidateName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded successfully!');
  };

  const loadFromHistory = (item: LetterHistory) => {
    setCandidateName(item.candidateName);
    setJobTitle(item.jobTitle);
    setTemplate(item.template);
    setGeneratedLetter(item.letter);
    setActiveTab('preview');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Offer Letter Generator</h2>
            <p className="text-sm text-muted-foreground">Create professional offer letters with AI in seconds</p>
          </div>
        </div>
        {history.length > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="w-3 h-3" />
            {history.length} generated
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Template', value: selectedTemplate.label, icon: selectedTemplate.icon, iconColor: selectedTemplate.color },
          { label: 'Candidate', value: candidateName || '—', icon: User, iconColor: 'bg-blue-500/10 text-blue-600' },
          { label: 'Position', value: jobTitle || '—', icon: Briefcase, iconColor: 'bg-orange-500/10 text-orange-600' },
          { label: 'Package', value: salary || '—', icon: DollarSign, iconColor: 'bg-green-500/10 text-green-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-lg ${stat.iconColor} flex items-center justify-center`}>
                <stat.icon className="w-3 h-3" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="compose" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-3.5 h-3.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-xs sm:text-sm" disabled={!generatedLetter}>
            <FileText className="w-3.5 h-3.5" /> Preview
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm" disabled={history.length === 0}>
            <Clock className="w-3.5 h-3.5" /> History
            {history.length > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-4 mt-0">
          {/* Template Selection */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-muted-foreground" />
                Choose Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = template === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTemplate(t.id)}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                          : 'border-border/40 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                      <div className={`w-9 h-9 rounded-xl ${t.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Offer Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${formProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{formProgress}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Candidate Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Job Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    Salary / Package <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. ₹12,00,000/year"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  Additional Notes
                  <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific benefits, probation period, special clauses, etc."
                  rows={3}
                  className="resize-none"
                />
                {additionalNotes && (
                  <p className="text-xs text-muted-foreground text-right">{additionalNotes.length} characters</p>
                )}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !isFormValid}
                className="w-full gap-2 h-12 rounded-xl text-sm font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating offer letter...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Offer Letter
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>

              {!isFormValid && (
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  Fill in all required fields to generate
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-0">
          <AnimatePresence mode="wait">
            {generatedLetter && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold">Generated Offer Letter</CardTitle>
                        <Badge variant="secondary" className="text-[10px]">{selectedTemplate.label}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 rounded-lg h-8 text-xs">
                          <Copy className="w-3 h-3" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 rounded-lg h-8 text-xs">
                          <Download className="w-3 h-3" /> Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 rounded-lg h-8 text-xs">
                          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Regenerate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Letter metadata strip */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { label: candidateName, icon: User },
                        { label: jobTitle, icon: Briefcase },
                        { label: salary, icon: DollarSign },
                        ...(startDate ? [{ label: new Date(startDate).toLocaleDateString(), icon: Calendar }] : []),
                      ].map((tag, i) => (
                        <Badge key={i} variant="outline" className="gap-1 text-xs font-normal py-1 px-2.5">
                          <tag.icon className="w-3 h-3" />
                          {tag.label}
                        </Badge>
                      ))}
                    </div>

                    <div className="bg-muted/30 rounded-xl p-5 sm:p-6 max-h-[600px] overflow-y-auto whitespace-pre-wrap text-foreground text-sm leading-relaxed border border-border/30 font-mono">
                      {generatedLetter}
                    </div>

                    {/* Quick actions footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        {generatedLetter.split(/\s+/).length} words · {generatedLetter.length} characters
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('compose')}
                        className="text-xs gap-1"
                      >
                        Back to Editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-0">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Letters ({history.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Clock className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No letters generated yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, idx) => {
                    const tmpl = TEMPLATES.find(t => t.id === item.template);
                    const Icon = tmpl?.icon || FileText;
                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => loadFromHistory(item)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className={`w-9 h-9 rounded-lg ${tmpl?.color || 'bg-muted'} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.candidateName}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.jobTitle} · {tmpl?.label}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground">
                            {item.generatedAt.toLocaleDateString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
