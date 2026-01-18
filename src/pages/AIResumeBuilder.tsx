import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Sparkles, Download, RefreshCw, Loader2, FileText, Wand2, 
  Save, CheckCircle2, Lightbulb, GraduationCap, Briefcase, Star,
  FileDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const styles = [
  { id: 'professional', name: 'Professional', desc: 'Clean and corporate', color: 'bg-blue-500' },
  { id: 'modern', name: 'Modern', desc: 'Sleek and contemporary', color: 'bg-purple-500' },
  { id: 'creative', name: 'Creative', desc: 'Bold and unique', color: 'bg-pink-500' },
  { id: 'simple', name: 'Simple', desc: 'Minimal and elegant', color: 'bg-gray-500' },
];

interface ResumeContent {
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications: string[];
  tips: string[];
  score: number;
}

const AIResumeBuilder = () => {
  const { user, profile } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [targetRole, setTargetRole] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const resumeRef = useRef<HTMLDivElement>(null);

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
        setGenerating(false);
        return;
      }

      setCandidateData(candidate);

      // Call AI edge function
      const response = await supabase.functions.invoke('generate-resume', {
        body: {
          candidateData: {
            name: profile.full_name,
            title: candidate.job_title,
            skills: candidate.skills || [],
            experience_years: candidate.experience_years || 0,
            education: candidate.education || [],
            bio: candidate.bio,
          },
          style: selectedStyle,
          targetRole: targetRole || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      const resume = response.data?.resume;
      if (resume) {
        setResumeContent(resume);
        toast.success('Resume generated with AI!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate resume');
    } finally {
      setGenerating(false);
    }
  };

  const saveResume = async () => {
    if (!profile || !resumeContent || !candidateData) return;

    setSaving(true);
    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!candidate) {
        toast.error('Candidate profile not found');
        return;
      }

      const resumeName = targetRole 
        ? `${targetRole} Resume` 
        : `${selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Resume`;

      const { error } = await supabase
        .from('candidate_resumes')
        .insert({
          candidate_id: candidate.id,
          name: resumeName,
          style: selectedStyle,
          content: resumeContent as any,
          resume_score: resumeContent.score || 0,
          is_default: false,
        });

      if (error) throw error;
      toast.success('Resume saved to your profile!');
    } catch (error: any) {
      toast.error('Failed to save resume');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = () => {
    if (!resumeContent || !profile) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Styling based on selected style
    const styleColors: Record<string, { primary: [number, number, number], secondary: [number, number, number] }> = {
      professional: { primary: [0, 82, 155], secondary: [51, 51, 51] },
      modern: { primary: [124, 58, 237], secondary: [71, 85, 105] },
      creative: { primary: [219, 39, 119], secondary: [107, 114, 128] },
      simple: { primary: [17, 24, 39], secondary: [75, 85, 99] },
    };

    const colors = styleColors[selectedStyle] || styleColors.professional;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(...colors.primary);
    doc.text(profile.full_name || 'Your Name', margin, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setTextColor(...colors.secondary);
    doc.text(candidateData?.job_title || targetRole || 'Professional', margin, yPos);
    yPos += 15;

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.text('PROFESSIONAL SUMMARY', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    const summaryLines = doc.splitTextToSize(resumeContent.summary, pageWidth - (margin * 2));
    doc.text(summaryLines, margin, yPos);
    yPos += (summaryLines.length * 5) + 10;

    // Skills
    if (resumeContent.skills) {
      doc.setFontSize(12);
      doc.setTextColor(...colors.primary);
      doc.text('SKILLS', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      
      if (resumeContent.skills.technical?.length > 0) {
        doc.text(`Technical: ${resumeContent.skills.technical.join(', ')}`, margin, yPos);
        yPos += 6;
      }
      if (resumeContent.skills.soft?.length > 0) {
        doc.text(`Soft Skills: ${resumeContent.skills.soft.join(', ')}`, margin, yPos);
        yPos += 6;
      }
      yPos += 8;
    }

    // Experience
    if (resumeContent.experience?.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(...colors.primary);
      doc.text('EXPERIENCE', margin, yPos);
      yPos += 7;

      resumeContent.experience.forEach(exp => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);
        doc.text(exp.title, margin, yPos);
        yPos += 5;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${exp.company} | ${exp.duration}`, margin, yPos);
        yPos += 6;

        exp.highlights?.forEach(highlight => {
          const lines = doc.splitTextToSize(`• ${highlight}`, pageWidth - (margin * 2));
          doc.setTextColor(51, 51, 51);
          doc.text(lines, margin, yPos);
          yPos += (lines.length * 5);
        });
        yPos += 5;
      });
    }

    // Education
    if (resumeContent.education?.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(...colors.primary);
      doc.text('EDUCATION', margin, yPos);
      yPos += 7;

      resumeContent.education.forEach(edu => {
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text(`${edu.degree} - ${edu.institution} (${edu.year})`, margin, yPos);
        yPos += 6;
      });
    }

    // Save PDF
    const fileName = targetRole 
      ? `${profile.full_name}_${targetRole.replace(/\s+/g, '_')}_Resume.pdf`
      : `${profile.full_name}_Resume.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded!');
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="space-y-6">
            <Card className="shadow-google">
              <CardHeader><CardTitle className="text-lg">Resume Style</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle}>
                  {styles.map(style => (
                    <div key={style.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                      <RadioGroupItem value={style.id} id={style.id} />
                      <div className={`w-3 h-3 rounded-full ${style.color}`} />
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
              <CardHeader><CardTitle className="text-lg">Optimize For Role</CardTitle></CardHeader>
              <CardContent>
                <Input 
                  placeholder="e.g., Senior Developer, UX Designer" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  AI will tailor content for this specific position
                </p>
              </CardContent>
            </Card>

            <Button 
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90" 
              size="lg" 
              onClick={generateResume} 
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5 mr-2" />
              )}
              {generating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="shadow-google-lg min-h-[700px]">
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Resume Preview
                </CardTitle>
                {resumeContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateResume} disabled={generating}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm" onClick={saveResume} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" onClick={exportToPDF} className="bg-red-600 hover:bg-red-700">
                      <FileDown className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {resumeContent ? (
                  <div ref={resumeRef} className="space-y-6">
                    {/* Score Card */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Star className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Resume Score</p>
                          <p className="text-xs text-muted-foreground">ATS Compatibility</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={resumeContent.score} className="w-32 h-3" />
                        <Badge variant={resumeContent.score >= 80 ? 'default' : resumeContent.score >= 60 ? 'secondary' : 'outline'}>
                          {resumeContent.score}%
                        </Badge>
                      </div>
                    </div>

                    {/* Tips */}
                    {resumeContent.tips?.length > 0 && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <span className="font-medium text-amber-800 dark:text-amber-200">Improvement Tips</span>
                        </div>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                          {resumeContent.tips.map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resume Content */}
                    <div className="p-6 border-2 rounded-xl space-y-6 bg-white dark:bg-card">
                      {/* Header */}
                      <div className="text-center pb-4 border-b">
                        <h2 className="text-2xl font-bold text-foreground">{profile?.full_name}</h2>
                        <p className="text-lg text-primary">{candidateData?.job_title || targetRole}</p>
                      </div>

                      {/* Summary */}
                      <div>
                        <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Professional Summary
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">{resumeContent.summary}</p>
                      </div>

                      <Separator />

                      {/* Skills */}
                      {resumeContent.skills && (
                        <div>
                          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Skills
                          </h3>
                          {resumeContent.skills.technical?.length > 0 && (
                            <div className="mb-2">
                              <span className="text-sm font-medium">Technical:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {resumeContent.skills.technical.map((skill, i) => (
                                  <Badge key={i} variant="secondary">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {resumeContent.skills.soft?.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">Soft Skills:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {resumeContent.skills.soft.map((skill, i) => (
                                  <Badge key={i} variant="outline">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Experience */}
                      {resumeContent.experience?.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Experience
                          </h3>
                          <div className="space-y-4">
                            {resumeContent.experience.map((exp, i) => (
                              <div key={i} className="pl-4 border-l-2 border-primary/30">
                                <p className="font-medium">{exp.title}</p>
                                <p className="text-sm text-muted-foreground">{exp.company} • {exp.duration}</p>
                                <ul className="mt-2 text-sm space-y-1">
                                  {exp.highlights?.map((h, j) => (
                                    <li key={j} className="text-muted-foreground">• {h}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Education */}
                      {resumeContent.education?.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" /> Education
                          </h3>
                          <div className="space-y-2">
                            {resumeContent.education.map((edu, i) => (
                              <div key={i}>
                                <p className="font-medium">{edu.degree}</p>
                                <p className="text-sm text-muted-foreground">{edu.institution} • {edu.year}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                    <div className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full mb-6">
                      <Sparkles className="w-16 h-16 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Create Your AI Resume</h3>
                    <p className="text-center max-w-md">
                      Click "Generate with AI" to create a professional, ATS-optimized resume based on your profile
                    </p>
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
