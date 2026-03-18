import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
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
  Save,
  Headphones,
  Wand2,
  CheckCircle2,
  Info,
  Clock,
  Users,
  Lightbulb,
  Share2,
  VolumeX,
  SkipBack,
  SkipForward,
  AudioWaveform
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface AudioResumeCardProps {
  candidate: any;
  onUpdate: () => void;
}

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Authoritative and business-like', icon: '💼', color: 'from-blue-500/20 to-blue-600/10' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable', icon: '😊', color: 'from-amber-500/20 to-amber-600/10' },
  { value: 'confident', label: 'Confident', description: 'Bold and assertive', icon: '💪', color: 'from-purple-500/20 to-purple-600/10' },
  { value: 'calm', label: 'Calm', description: 'Relaxed and clear', icon: '🧘', color: 'from-teal-500/20 to-teal-600/10' },
  { value: 'energetic', label: 'Energetic', description: 'Dynamic and enthusiastic', icon: '⚡', color: 'from-orange-500/20 to-orange-600/10' },
];

const TIPS = [
  { icon: Clock, text: 'Keep it under 90 seconds for maximum impact' },
  { icon: Users, text: 'Mention specific skills that match your target roles' },
  { icon: Lightbulb, text: 'Start with a hook that grabs attention' },
];

const GENERATION_STAGES = [
  { label: 'Processing text', duration: 20 },
  { label: 'Synthesizing voice', duration: 50 },
  { label: 'Optimizing audio', duration: 25 },
  { label: 'Finalizing', duration: 5 },
];

// Waveform visualization component
const WaveformVisualizer = ({ isActive, barCount = 20 }: { isActive: boolean; barCount?: number }) => {
  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-primary rounded-full"
          animate={isActive ? {
            height: [4, Math.random() * 24 + 8, 4],
          } : { height: 4 }}
          transition={{
            duration: 0.5,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// Enhanced Audio Player
const AudioPlayer = ({ 
  audioUrl, 
  tone, 
  createdAt,
  onDelete, 
  onDownload, 
  deleting 
}: { 
  audioUrl: string; 
  tone?: string;
  createdAt?: string;
  onDelete: () => void; 
  onDownload: () => void; 
  deleting: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);

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

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const shareAudio = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Audio Resume',
          text: 'Check out my audio resume!',
          url: audioUrl,
        });
      } catch (err) {
        navigator.clipboard.writeText(audioUrl);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(audioUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Your Audio Resume</h3>
              {createdAt && (
                <p className="text-xs text-muted-foreground">
                  Created {new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {selectedTone && (
            <Badge variant="secondary" className="gap-1.5">
              <span>{selectedTone.icon}</span>
              <span>{selectedTone.label}</span>
            </Badge>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />

      {/* Waveform */}
      <div className="px-4 py-3">
        <WaveformVisualizer isActive={playing} barCount={30} />
      </div>

      {/* Controls */}
      <div className="p-4 pt-0 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <Slider 
            value={[currentTime]} 
            max={duration || 100} 
            step={0.1} 
            onValueChange={(v) => { 
              if (audioRef.current) { 
                audioRef.current.currentTime = v[0]; 
                setCurrentTime(v[0]); 
              } 
            }} 
            className="cursor-pointer" 
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full"
            onClick={() => skip(-10)}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="default" 
            size="icon" 
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={togglePlayback}
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full"
            onClick={() => skip(10)}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-32">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider 
              value={isMuted ? [0] : volume} 
              max={100} 
              step={1} 
              onValueChange={(v) => { 
                setVolume(v); 
                setIsMuted(false);
                if (audioRef.current) audioRef.current.volume = v[0] / 100; 
              }} 
              className="cursor-pointer" 
            />
          </div>
          
          <div className="flex gap-1.5 justify-end">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shareAudio}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={onDelete} 
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Voice Recorder Component
const VoiceRecorder = ({ candidate, user, onUpdate }: { candidate: any; user: any; onUpdate: () => void }) => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_DURATION = 180; // 3 minutes

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  useEffect(() => {
    if (elapsed >= MAX_DURATION && recording) {
      stopRecording();
      toast.info('Maximum recording duration reached (3 minutes)');
    }
  }, [elapsed, recording]);

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

  const progressPercent = (elapsed / MAX_DURATION) * 100;

  return (
    <div className="space-y-6">
      {/* Tips section */}
      <div className="grid gap-2">
        {TIPS.map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
          >
            <tip.icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">{tip.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-6 py-8">
        <AnimatePresence mode="wait">
          {!recording && !recordedUrl && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <button
                onClick={startRecording}
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                <Mic className="w-10 h-10 relative z-10" />
              </button>
              <div className="text-center">
                <p className="font-medium">Tap to Start Recording</p>
                <p className="text-sm text-muted-foreground">Max 3 minutes</p>
              </div>
            </motion.div>
          )}

          {recording && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 w-full max-w-xs"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-destructive/30 animate-pulse scale-125" />
                <button
                  onClick={stopRecording}
                  className="relative w-24 h-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
                >
                  <Square className="w-8 h-8" />
                </button>
              </div>
              
              <WaveformVisualizer isActive={true} barCount={25} />
              
              <div className="w-full space-y-2">
                <Progress value={progressPercent} className="h-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-destructive font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    Recording
                  </span>
                  <span className="font-mono">{formatElapsed(elapsed)} / {formatElapsed(MAX_DURATION)}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">Tap stop when you're done</p>
            </motion.div>
          )}

          {recordedUrl && !recording && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-4"
            >
              <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium">Recording Complete!</span>
                  <Badge variant="outline" className="ml-auto">{formatElapsed(elapsed)}</Badge>
                </div>
                <audio src={recordedUrl} controls className="w-full rounded-lg" />
              </div>
              
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
                <Button variant="outline" onClick={discardRecording} className="gap-2 h-10">
                  <Trash2 className="w-4 h-4" />
                  Discard
                </Button>
                <Button variant="outline" onClick={startRecording} className="gap-2 h-10">
                  <RefreshCw className="w-4 h-4" />
                  Re-record
                </Button>
                <Button onClick={saveRecording} disabled={saving} className="gap-2 h-10">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// AI Generation Component
const AIGenerator = ({ 
  candidate, 
  user, 
  text, 
  setText, 
  tone, 
  setTone,
  onUpdate,
  setAudioUrl 
}: { 
  candidate: any; 
  user: any; 
  text: string;
  setText: (t: string) => void;
  tone: string;
  setTone: (t: string) => void;
  onUpdate: () => void;
  setAudioUrl: (url: string | null) => void;
}) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  const generateAudioResume = async () => {
    if (!text.trim() || !user) { toast.error('Please enter your introduction text'); return; }
    if (text.length > 2000) { toast.error('Introduction must be less than 2000 characters'); return; }

    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);

    // Simulate progress stages
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        const stage = GENERATION_STAGES[currentStage];
        const stageEnd = GENERATION_STAGES.slice(0, currentStage + 1).reduce((a, s) => a + s.duration, 0);
        if (prev >= stageEnd && currentStage < GENERATION_STAGES.length - 1) {
          setCurrentStage(c => c + 1);
        }
        return prev + 0.8;
      });
    }, 100);

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
      if (!response.ok) { 
        const error = await response.json(); 
        throw new Error(error.error || 'Failed to generate audio'); 
      }

      const audioBlob = await response.blob();
      const filePath = `${user.id}/audio-resume.mp3`;

      if (candidate?.audio_resume_url) {
        await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from('audio-resumes')
        .upload(filePath, audioBlob, { upsert: true, contentType: 'audio/mpeg' });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from('candidates').update({
        audio_resume_url: filePath, 
        audio_resume_tone: tone, 
        audio_resume_text: text.trim(), 
        audio_resume_created_at: new Date().toISOString(),
      }).eq('id', candidate.id);
      if (updateError) throw updateError;

      const { data } = supabase.storage.from('audio-resumes').getPublicUrl(filePath);
      setAudioUrl(data.publicUrl);
      setProgress(100);
      toast.success('Audio resume generated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error generating audio resume:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio resume');
    } finally {
      clearInterval(progressInterval);
      setGenerating(false);
      setProgress(0);
      setCurrentStage(0);
    }
  };

  const charProgress = (text.length / 2000) * 100;

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div className="space-y-3">
        <Label htmlFor="intro-text" className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Your Introduction Script
          </span>
        </Label>
        <div className="relative">
          <Textarea
            id="intro-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hi, I'm [Your Name], a [Your Title] with [X] years of experience in [Your Field]. I specialize in [Key Skills] and have successfully [Key Achievement]. I'm passionate about [What Drives You] and looking for opportunities where I can [Career Goal]..."
            rows={6}
            maxLength={2000}
            className="resize-none pr-16 pb-8"
            disabled={generating}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Progress value={charProgress} className="w-16 h-1.5" />
            <span className={`text-xs font-mono ${text.length > 1800 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {text.length}/2000
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
          Tip: Include your name, title, years of experience, key skills, and what makes you unique.
        </p>
      </div>

      {/* Tone Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <AudioWaveform className="w-4 h-4 text-muted-foreground" />
          Voice Tone
        </Label>
        <RadioGroup 
          value={tone} 
          onValueChange={setTone} 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2"
          disabled={generating}
        >
          {toneOptions.map((option) => (
            <div key={option.value}>
              <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
              <Label
                htmlFor={option.value}
                className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all 
                  hover:border-primary/50 
                  peer-data-[state=checked]:border-primary 
                  peer-data-[state=checked]:bg-gradient-to-br ${option.color}
                  peer-disabled:opacity-50 peer-disabled:cursor-not-allowed`}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">{option.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Generate Button */}
      <AnimatePresence mode="wait">
        {generating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wand2 className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Generating your audio resume...</p>
                <p className="text-xs text-muted-foreground">
                  {GENERATION_STAGES[currentStage]?.label || 'Processing...'}
                </p>
              </div>
              <span className="text-sm font-mono">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {GENERATION_STAGES.map((stage, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-1 text-xs ${i <= currentStage ? 'text-primary' : 'text-muted-foreground/50'}`}
                >
                  {i < currentStage ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : i === currentStage ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border" />
                  )}
                  <span className="hidden sm:inline">{stage.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button 
              onClick={generateAudioResume} 
              disabled={!text.trim()} 
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              <Sparkles className="w-5 h-5" />
              Generate Audio Resume
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Component
export const AudioResumeCard = ({ candidate, onUpdate }: AudioResumeCardProps) => {
  const { user } = useAuth();
  const [text, setText] = useState(candidate?.audio_resume_text || '');
  const [tone, setTone] = useState(candidate?.audio_resume_tone || 'professional');
  const [deleting, setDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('record');

  useEffect(() => {
    if (candidate?.audio_resume_url) loadAudioUrl();
  }, [candidate?.audio_resume_url]);

  const loadAudioUrl = async () => {
    if (!candidate?.audio_resume_url) return;
    const { data } = supabase.storage.from('audio-resumes').getPublicUrl(candidate.audio_resume_url);
    setAudioUrl(data.publicUrl);
  };

  const handleDelete = async () => {
    if (!candidate?.audio_resume_url) return;
    setDeleting(true);
    try {
      await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);
      const { error } = await supabase.from('candidates').update({
        audio_resume_url: null, 
        audio_resume_tone: null, 
        audio_resume_text: null, 
        audio_resume_created_at: null,
      }).eq('id', candidate.id);
      if (error) throw error;
      setAudioUrl(null); 
      setText('');
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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 sm:p-6 text-primary-foreground"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/20 backdrop-blur shrink-0">
              <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold">Audio Resume</h2>
              <p className="text-primary-foreground/80 mt-1 text-sm sm:text-base">
                Stand out with your voice. Create a personal introduction that employers can listen to.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5 bg-white/20 text-white border-0 shrink-0 self-start">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered
          </Badge>
        </div>

        {/* Stats */}
        <div className="relative mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur text-center">
            <div className="text-xl sm:text-2xl font-bold">{audioUrl ? '1' : '0'}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/70">Audio Created</div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur text-center">
            <div className="text-xl sm:text-2xl font-bold">3x</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/70">More Engagement</div>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur text-center">
            <div className="text-xl sm:text-2xl font-bold">90s</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/70">Ideal Length</div>
          </div>
        </div>
      </motion.div>

      {/* Current Audio */}
      {audioUrl && (
        <AudioPlayer
          audioUrl={audioUrl}
          tone={candidate?.audio_resume_tone}
          createdAt={candidate?.audio_resume_created_at}
          onDelete={handleDelete}
          onDownload={downloadAudio}
          deleting={deleting}
        />
      )}

      {/* Creation Options */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-12 sm:h-14 rounded-t-xl rounded-b-none bg-muted/50 p-1">
              <TabsTrigger 
                value="record" 
                className="gap-1.5 sm:gap-2 h-10 sm:h-12 rounded-lg text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow"
              >
                <Mic className="w-4 h-4" />
                <span className="font-medium">Record</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai-generate" 
                className="gap-1.5 sm:gap-2 h-10 sm:h-12 rounded-lg text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow"
              >
                <Wand2 className="w-4 h-4" />
                <span className="font-medium">AI Generate</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-3 sm:p-6">
              <TabsContent value="record" className="mt-0">
                <VoiceRecorder candidate={candidate} user={user} onUpdate={onUpdate} />
              </TabsContent>

              <TabsContent value="ai-generate" className="mt-0">
                <AIGenerator 
                  candidate={candidate}
                  user={user}
                  text={text}
                  setText={setText}
                  tone={tone}
                  setTone={setTone}
                  onUpdate={onUpdate}
                  setAudioUrl={setAudioUrl}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
