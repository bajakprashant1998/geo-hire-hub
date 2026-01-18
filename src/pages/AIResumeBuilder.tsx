import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Sparkles, Download, RefreshCw, Loader2, FileText, Wand2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const styles = [
  { id: 'professional', name: 'Professional', desc: 'Clean and corporate' },
  { id: 'modern', name: 'Modern', desc: 'Sleek and contemporary' },
  { id: 'creative', name: 'Creative', desc: 'Bold and unique' },
  { id: 'simple', name: 'Simple', desc: 'Minimal and elegant' },
];

const AIResumeBuilder = () => {
  const { user, profile } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [targetRole, setTargetRole] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  const [resumeScore, setResumeScore] = useState(0);

  const generateResume = async () => {
    if (!profile) return;
    
    setGenerating(true);
    try {
      // Fetch candidate data
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!candidate) {
        toast.error('Please complete your profile first');
        return;
      }

      // Generate resume content (simulated for now)
      const content = {
        name: profile.full_name,
        title: candidate.job_title,
        summary: candidate.bio || `Experienced ${candidate.job_title} with ${candidate.experience_years || 0} years of experience.`,
        skills: candidate.skills || [],
        experience: candidate.experience_years,
        education: candidate.education || [],
      };

      setResumeContent(content);
      setResumeScore(75);
      toast.success('Resume generated!');
    } catch (error) {
      toast.error('Failed to generate resume');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/candidate-dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold">AI Resume Builder</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="space-y-6">
            <Card className="shadow-google">
              <CardHeader><CardTitle className="text-lg">Resume Style</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle}>
                  {styles.map(style => (
                    <div key={style.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                      <RadioGroupItem value={style.id} id={style.id} />
                      <Label htmlFor={style.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{style.name}</span>
                        <p className="text-xs text-muted-foreground">{style.desc}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="shadow-google">
              <CardHeader><CardTitle className="text-lg">Optimize For</CardTitle></CardHeader>
              <CardContent>
                <Input 
                  placeholder="e.g., Senior Developer" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">AI will tailor your resume for this role</p>
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={generateResume} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Generate Resume
            </Button>
          </div>

          {/* Preview */}
          <div className="md:col-span-2">
            <Card className="shadow-google-lg min-h-[600px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Resume Preview
                </CardTitle>
                {resumeContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateResume}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                    </Button>
                    <Button size="sm">
                      <Download className="w-4 h-4 mr-1" /> Export PDF
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {resumeContent ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <span>Resume Score</span>
                      <div className="flex items-center gap-2">
                        <Progress value={resumeScore} className="w-24 h-2" />
                        <Badge>{resumeScore}%</Badge>
                      </div>
                    </div>
                    
                    <div className="p-6 border rounded-lg space-y-4">
                      <h2 className="text-2xl font-bold">{resumeContent.name}</h2>
                      <p className="text-lg text-primary">{resumeContent.title}</p>
                      <p className="text-muted-foreground">{resumeContent.summary}</p>
                      
                      {resumeContent.skills?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeContent.skills.map((skill: string, i: number) => (
                              <Badge key={i} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                    <p>Click "Generate Resume" to create your AI-powered resume</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIResumeBuilder;
