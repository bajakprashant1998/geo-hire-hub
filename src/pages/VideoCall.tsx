import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Video, Calendar, Clock, MapPin, ArrowLeft, ExternalLink, Mic, Camera,
  CheckCircle2, User, Briefcase, Circle, Square, FileText, Loader2, Sparkles, 
  ClipboardCopy, Download, AlertTriangle, MonitorUp, MonitorOff
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';

interface InterviewDetails {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  interview_type: string;
  meeting_link: string | null;
  location: string | null;
  notes: string | null;
  employer_notes: string | null;
  status: string;
  candidate_name: string;
  candidate_avatar: string | null;
  job_title: string;
  company_name: string;
}

interface AISummary {
  overallImpression: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  followUpQuestions: string[];
  keyTakeaways: string;
}

const VideoCall = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingNotes, setRecordingNotes] = useState('');

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // AI Summary
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('lobby');

  useEffect(() => {
    if (interviewId) fetchInterview();
  }, [interviewId]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchInterview = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id, scheduled_date, scheduled_time, interview_type, meeting_link, location, notes, employer_notes, status,
          candidates!inner(profile_id, job_title),
          jobs!inner(title),
          employers!inner(company_name)
        `)
        .eq('id', interviewId)
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', (data as any).candidates.profile_id)
        .single();

      setInterview({
        id: data.id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        interview_type: data.interview_type,
        meeting_link: data.meeting_link,
        location: data.location,
        notes: data.notes,
        employer_notes: data.employer_notes,
        status: data.status,
        candidate_name: profile?.full_name || 'Candidate',
        candidate_avatar: profile?.avatar_url || null,
        job_title: (data as any).jobs.title,
        company_name: (data as any).employers.company_name,
      });
    } catch (error: any) {
      console.error('Error fetching interview:', error);
      toast.error('Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (interview?.meeting_link) {
      window.open(interview.meeting_link, '_blank');
    } else {
      toast.error('No meeting link available');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success(`Notes saved — ${formatTime(recordingTime)} recorded`);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      toast.info('Recording started — take notes as you go');
    }
  };

  const saveNotes = async () => {
    if (!interview || !recordingNotes.trim()) return;
    const { error } = await supabase
      .from('interviews')
      .update({ employer_notes: recordingNotes })
      .eq('id', interview.id);
    if (error) {
      toast.error('Failed to save notes');
    } else {
      toast.success('Interview notes saved');
    }
  };

  const generateAISummary = async () => {
    if (!recordingNotes.trim() && !interview?.employer_notes) {
      toast.error('Please add interview notes first');
      return;
    }
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-interview-summary', {
        body: {
          notes: recordingNotes || interview?.employer_notes || '',
          candidateName: interview?.candidate_name,
          jobTitle: interview?.job_title,
          companyName: interview?.company_name,
        },
      });
      if (error) throw error;
      setAiSummary(data);
      setActiveTab('summary');
      toast.success('AI summary generated');
    } catch (e: any) {
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const recommendationColors: Record<string, string> = {
    strong_hire: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    hire: 'bg-primary/10 text-primary border-primary/20',
    maybe: 'bg-warning/10 text-warning-foreground border-warning/20',
    no_hire: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Interview Not Found</h2>
            <p className="text-muted-foreground mb-6">This interview doesn't exist or you don't have access.</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = format(new Date(interview.scheduled_date), 'EEEE, MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background p-4">
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted/50 rounded-xl">
            <TabsTrigger value="lobby" className="flex-1 rounded-lg text-sm">Lobby</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 rounded-lg text-sm">Notes & Recording</TabsTrigger>
            <TabsTrigger value="summary" className="flex-1 rounded-lg text-sm">AI Summary</TabsTrigger>
          </TabsList>

          {/* LOBBY TAB */}
          <TabsContent value="lobby">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Interview Lobby</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Google Meet Video Interview</p>
                <Badge variant="outline" className="mx-auto mt-2">
                  {interview.status === 'scheduled' ? 'Upcoming' : interview.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Participant Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={interview.candidate_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{interview.candidate_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {interview.job_title} at {interview.company_name}
                    </p>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">{interview.scheduled_time}</p>
                    </div>
                  </div>
                </div>

                {interview.location && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                    <MapPin className="w-4 h-4 text-primary" />
                    <p className="text-sm">{interview.location}</p>
                  </div>
                )}

                {interview.notes && (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{interview.notes}</p>
                  </div>
                )}

                {/* Pre-call Checklist */}
                {interview.interview_type === 'video' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pre-call Checklist</p>
                    <div className="space-y-1.5">
                      {[
                        { icon: CheckCircle2, label: 'Stable internet connection' },
                        { icon: Camera, label: 'Camera enabled' },
                        { icon: Mic, label: 'Microphone enabled' },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon className="w-4 h-4 text-emerald-500" />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Screen Sharing Controls */}
                {interview.interview_type === 'video' && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isScreenSharing ? (
                          <MonitorUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <MonitorOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Screen Sharing</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isScreenSharing ? 'Your screen is being shared' : 'Share your screen during the call'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={isScreenSharing ? 'destructive' : 'outline'}
                        size="sm"
                        className="rounded-xl gap-1.5 text-xs"
                        onClick={async () => {
                          if (isScreenSharing) {
                            screenStream?.getTracks().forEach(t => t.stop());
                            setScreenStream(null);
                            setIsScreenSharing(false);
                            toast.info('Screen sharing stopped');
                          } else {
                            try {
                              const stream = await navigator.mediaDevices.getDisplayMedia({
                                video: true,
                                audio: false,
                              });
                              setScreenStream(stream);
                              setIsScreenSharing(true);
                              toast.success('Screen sharing started');
                              stream.getVideoTracks()[0].addEventListener('ended', () => {
                                setScreenStream(null);
                                setIsScreenSharing(false);
                                toast.info('Screen sharing stopped');
                              });
                            } catch {
                              toast.error('Screen sharing was cancelled or not supported');
                            }
                          }
                        }}
                      >
                        {isScreenSharing ? (
                          <><MonitorOff className="w-3.5 h-3.5" /> Stop</>
                        ) : (
                          <><MonitorUp className="w-3.5 h-3.5" /> Share Screen</>
                        )}
                      </Button>
                    </div>
                    {isScreenSharing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <motion.div
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-emerald-500"
                        />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Screen is being shared — visible to others in the call
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Join Button */}
                {interview.interview_type === 'video' && interview.meeting_link && (
                  <Button size="lg" className="w-full text-lg py-6" onClick={handleJoinMeeting}>
                    <Video className="w-5 h-5 mr-2" />
                    Join Google Meet
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {interview.interview_type === 'video' && !interview.meeting_link && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Google Meet link has not been added yet. The employer will share it shortly.
                    </p>
                  </div>
                )}

                {interview.interview_type !== 'video' && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      This is an {interview.interview_type} interview
                      {interview.location && ` at ${interview.location}`}.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES & RECORDING TAB */}
          <TabsContent value="notes">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  Interview Notes & Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recording Controls */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                  <Button
                    variant={isRecording ? 'destructive' : 'default'}
                    onClick={toggleRecording}
                    className="gap-2 rounded-xl"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-4 h-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-destructive" /> Start Note-Taking
                      </>
                    )}
                  </Button>
                  {isRecording && (
                    <motion.div
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-sm font-mono font-semibold">{formatTime(recordingTime)}</span>
                    </motion.div>
                  )}
                </div>

                <Textarea
                  value={recordingNotes}
                  onChange={(e) => setRecordingNotes(e.target.value)}
                  placeholder="Type your interview notes here... Include key observations, responses, and impressions."
                  className="min-h-[250px] rounded-xl bg-muted/20 border-border/40"
                />

                <div className="flex items-center gap-3">
                  <Button onClick={saveNotes} disabled={!recordingNotes.trim()} className="rounded-xl gap-2">
                    <FileText className="w-4 h-4" /> Save Notes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={generateAISummary}
                    disabled={summaryLoading || (!recordingNotes.trim() && !interview.employer_notes)}
                    className="rounded-xl gap-2"
                  >
                    {summaryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate AI Summary
                  </Button>
                </div>

                {interview.employer_notes && recordingNotes !== interview.employer_notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Previously saved notes</p>
                    <p className="text-sm">{interview.employer_notes}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => setRecordingNotes(interview.employer_notes || '')}
                    >
                      Load saved notes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI SUMMARY TAB */}
          <TabsContent value="summary">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Interview Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiSummary ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="font-medium mb-2">No summary yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add interview notes and click "Generate AI Summary" to get started
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('notes')} className="rounded-xl">
                      Go to Notes
                    </Button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    {/* Recommendation */}
                    <div className="text-center">
                      <Badge className={cn("text-sm px-4 py-1", recommendationColors[aiSummary.recommendation] || 'bg-muted')}>
                        {aiSummary.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {/* Key Takeaways */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-sm font-semibold mb-1">Key Takeaways</p>
                      <p className="text-sm text-muted-foreground">{aiSummary.keyTakeaways}</p>
                    </div>

                    {/* Overall Impression */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Overall Impression</p>
                      <p className="text-sm text-muted-foreground">{aiSummary.overallImpression}</p>
                    </div>

                    {/* Strengths */}
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Strengths
                      </p>
                      <ul className="space-y-1">
                        {aiSummary.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Concerns */}
                    {aiSummary.concerns.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning-foreground" /> Concerns
                        </p>
                        <ul className="space-y-1">
                          {aiSummary.concerns.map((c, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-warning-foreground mt-1">•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up Questions */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Suggested Follow-Up Questions</p>
                      <ul className="space-y-1">
                        {aiSummary.followUpQuestions.map((q, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">{i + 1}.</span> {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(aiSummary, null, 2));
                        toast.success('Summary copied');
                      }}>
                        <ClipboardCopy className="w-3.5 h-3.5" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => {
                        const blob = new Blob([
                          `Interview Summary — ${interview.candidate_name}\n` +
                          `Position: ${interview.job_title}\n` +
                          `Date: ${formattedDate}\n\n` +
                          `Recommendation: ${aiSummary.recommendation}\n\n` +
                          `Key Takeaways: ${aiSummary.keyTakeaways}\n\n` +
                          `Overall: ${aiSummary.overallImpression}\n\n` +
                          `Strengths:\n${aiSummary.strengths.map(s => `• ${s}`).join('\n')}\n\n` +
                          (aiSummary.concerns.length > 0 ? `Concerns:\n${aiSummary.concerns.map(c => `• ${c}`).join('\n')}\n\n` : '') +
                          `Follow-up Questions:\n${aiSummary.followUpQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}`
                        ], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `interview-summary-${interview.candidate_name.replace(/\s+/g, '-')}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VideoCall;
