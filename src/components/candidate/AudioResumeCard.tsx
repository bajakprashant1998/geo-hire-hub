import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  Play, 
  Pause, 
  Loader2, 
  Trash2, 
  Download, 
  RefreshCw,
  Volume2,
  Sparkles,
  Square,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AudioResumeCardProps {
  candidate: any;
  onUpdate: () => void;
}

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Authoritative and business-like', icon: '💼' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable', icon: '😊' },
  { value: 'confident', label: 'Confident', description: 'Bold and assertive', icon: '💪' },
  { value: 'calm', label: 'Calm', description: 'Relaxed and clear', icon: '🧘' },
  { value: 'energetic', label: 'Energetic', description: 'Dynamic and enthusiastic', icon: '⚡' },
];

// Audio player sub-component
const AudioPlayer = ({ 
  audioUrl, 
  tone, 
  onDelete, 
  onDownload, 
  deleting 
}: { 
  audioUrl: string; 
  tone?: string; 
  onDelete: () => void; 
  onDownload: () => void; 
  deleting: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);

  const selectedTone = toneOptions.find(t => t.value === tone);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      
      <div className="flex items-center gap-4">
        <Button variant="default" size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={togglePlayback}>
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        
        <div className="flex-1 space-y-1">
          <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={(v) => { if (audioRef.current) { audioRef.current.currentTime = v[0]; setCurrentTime(v[0]); } }} className="cursor-pointer" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-28">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider value={volume} max={100} step={1} onValueChange={(v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = v[0] / 100; }} className="cursor-pointer" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedTone && (
            <>
              <span className="text-sm text-muted-foreground">Tone:</span>
              <Badge variant="outline">{selectedTone.icon} {selectedTone.label}</Badge>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="w-4 h-4 mr-1" />Download
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Voice recorder sub-component
const VoiceRecorder = ({ candidate, user, onUpdate }: { candidate: any; user: any; onUpdate: () => void }) => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      setRecording(true);
      setElapsed(0);
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
  };

  const saveRecording = async () => {
    if (!recordedBlob || !user) return;
    setSaving(true);
    try {
      const filePath = `${user.id}/audio-resume-recorded.webm`;

      if (candidate?.audio_resume_url) {
        await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('audio-resumes')
        .upload(filePath, recordedBlob, { upsert: true, contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          audio_resume_url: filePath,
          audio_resume_tone: 'recorded',
          audio_resume_text: 'Voice recorded by candidate',
          audio_resume_created_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      toast.success('Voice recording saved successfully!');
      discardRecording();
      onUpdate();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
    } finally {
      setSaving(false);
    }
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4 py-6">
        {!recording && !recordedUrl && (
          <>
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-all hover:scale-105 active:scale-95"
            >
              <Mic className="w-8 h-8" />
            </button>
            <p className="text-sm text-muted-foreground">Tap to start recording your introduction</p>
          </>
        )}

        {recording && (
          <>
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-destructive/20 animate-pulse absolute inset-0" />
              <button
                onClick={stopRecording}
                className="relative w-20 h-20 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-all"
              >
                <Square className="w-7 h-7" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Recording {formatElapsed(elapsed)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Tap stop when you're done</p>
          </>
        )}

        {recordedUrl && !recording && (
          <div className="w-full space-y-4">
            <div className="p-4 bg-muted/50 rounded-xl space-y-3">
              <p className="text-sm font-medium text-foreground">Preview your recording</p>
              <audio src={recordedUrl} controls className="w-full" />
              <p className="text-xs text-muted-foreground">Duration: {formatElapsed(elapsed)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={discardRecording}>
                <Trash2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button variant="outline" className="flex-1" onClick={startRecording}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-record
              </Button>
              <Button className="flex-1" onClick={saveRecording} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Record a brief professional introduction. Employers will be able to listen to this on your profile.
      </p>
    </div>
  );
};

export const AudioResumeCard = ({ candidate, onUpdate }: AudioResumeCardProps) => {
  const { user } = useAuth();
  const [text, setText] = useState(candidate?.audio_resume_text || '');
  const [tone, setTone] = useState(candidate?.audio_resume_tone || 'professional');
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (candidate?.audio_resume_url) loadAudioUrl();
  }, [candidate?.audio_resume_url]);

  const loadAudioUrl = async () => {
    if (!candidate?.audio_resume_url) return;
    const { data } = supabase.storage.from('audio-resumes').getPublicUrl(candidate.audio_resume_url);
    setAudioUrl(data.publicUrl);
  };

  const generateAudioResume = async () => {
    if (!text.trim() || !user) { toast.error('Please enter your introduction text'); return; }
    if (text.length > 2000) { toast.error('Introduction must be less than 2000 characters'); return; }

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio-resume`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.trim(), tone }),
        }
      );
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to generate audio'); }

      const audioBlob = await response.blob();
      const filePath = `${user.id}/audio-resume.mp3`;

      if (candidate?.audio_resume_url) await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);

      const { error: uploadError } = await supabase.storage.from('audio-resumes').upload(filePath, audioBlob, { upsert: true, contentType: 'audio/mpeg' });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from('candidates').update({
        audio_resume_url: filePath, audio_resume_tone: tone, audio_resume_text: text.trim(), audio_resume_created_at: new Date().toISOString(),
      }).eq('id', candidate.id);
      if (updateError) throw updateError;

      const { data } = supabase.storage.from('audio-resumes').getPublicUrl(filePath);
      setAudioUrl(data.publicUrl);
      toast.success('Audio resume generated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error generating audio resume:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio resume');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate?.audio_resume_url) return;
    setDeleting(true);
    try {
      await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);
      const { error } = await supabase.from('candidates').update({
        audio_resume_url: null, audio_resume_tone: null, audio_resume_text: null, audio_resume_created_at: null,
      }).eq('id', candidate.id);
      if (error) throw error;
      setAudioUrl(null); setText('');
      toast.success('Audio resume deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting audio resume:', error);
      toast.error('Failed to delete audio resume');
    } finally {
      setDeleting(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'audio-resume.mp3';
    a.click();
  };

  return (
    <Card className="shadow-google overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Audio Resume
          <Badge variant="secondary" className="ml-auto gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Audio Player */}
        {audioUrl && (
          <AudioPlayer
            audioUrl={audioUrl}
            tone={candidate?.audio_resume_tone}
            onDelete={handleDelete}
            onDownload={downloadAudio}
            deleting={deleting}
          />
        )}

        {/* Tabs: Record or AI Generate */}
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record" className="gap-2">
              <Mic className="w-4 h-4" />
              Record Voice
            </TabsTrigger>
            <TabsTrigger value="ai-generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="mt-4">
            <VoiceRecorder candidate={candidate} user={user} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="ai-generate" className="mt-4 space-y-6">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="intro-text" className="flex items-center justify-between">
                <span>Your Introduction</span>
                <span className="text-xs text-muted-foreground">{text.length}/2000</span>
              </Label>
              <Textarea
                id="intro-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Hi, I'm [Your Name], a [Your Title] with [X] years of experience in [Your Field]..."
                rows={5}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Write a brief professional introduction. This will be converted to speech.
              </p>
            </div>

            {/* Tone Selection */}
            <div className="space-y-3">
              <Label>Voice Tone</Label>
              <RadioGroup value={tone} onValueChange={setTone} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {toneOptions.map((option) => (
                  <div key={option.value} className="relative">
                    <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <span className="text-2xl mb-1">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button onClick={generateAudioResume} disabled={generating || !text.trim()} className="w-full" size="lg">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Audio...</>
              ) : audioUrl ? (
                <><RefreshCw className="w-4 h-4 mr-2" />Regenerate Audio Resume</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate Audio Resume</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
