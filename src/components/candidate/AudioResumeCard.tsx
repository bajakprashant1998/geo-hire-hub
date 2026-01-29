import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Mic, 
  Play, 
  Pause, 
  Loader2, 
  Trash2, 
  Download, 
  RefreshCw,
  Volume2,
  Sparkles
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

export const AudioResumeCard = ({ candidate, onUpdate }: AudioResumeCardProps) => {
  const { user } = useAuth();
  const [text, setText] = useState(candidate?.audio_resume_text || '');
  const [tone, setTone] = useState(candidate?.audio_resume_tone || 'professional');
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing audio URL
  useEffect(() => {
    if (candidate?.audio_resume_url) {
      loadAudioUrl();
    }
  }, [candidate?.audio_resume_url]);

  const loadAudioUrl = async () => {
    if (!candidate?.audio_resume_url) return;
    
    const { data } = supabase.storage
      .from('audio-resumes')
      .getPublicUrl(candidate.audio_resume_url);
    
    setAudioUrl(data.publicUrl);
  };

  const generateAudioResume = async () => {
    if (!text.trim() || !user) {
      toast.error('Please enter your introduction text');
      return;
    }

    if (text.length > 2000) {
      toast.error('Introduction must be less than 2000 characters');
      return;
    }

    setGenerating(true);
    try {
      // Call the edge function
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

      // Delete old file if exists
      if (candidate?.audio_resume_url) {
        await supabase.storage.from('audio-resumes').remove([candidate.audio_resume_url]);
      }

      // Upload new audio
      const { error: uploadError } = await supabase.storage
        .from('audio-resumes')
        .upload(filePath, audioBlob, { 
          upsert: true,
          contentType: 'audio/mpeg'
        });

      if (uploadError) throw uploadError;

      // Update candidate record
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          audio_resume_url: filePath,
          audio_resume_tone: tone,
          audio_resume_text: text.trim(),
          audio_resume_created_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      if (updateError) throw updateError;

      // Get public URL for playback
      const { data } = supabase.storage
        .from('audio-resumes')
        .getPublicUrl(filePath);
      
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

      const { error } = await supabase
        .from('candidates')
        .update({
          audio_resume_url: null,
          audio_resume_tone: null,
          audio_resume_text: null,
          audio_resume_created_at: null,
        })
        .eq('id', candidate.id);

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

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'audio-resume.mp3';
    a.click();
  };

  const selectedTone = toneOptions.find(t => t.value === tone);

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
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />
            
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg"
                onClick={togglePlayback}
              >
                {playing ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              
              <div className="flex-1 space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-28">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={volume}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tone:</span>
                <Badge variant="outline">{selectedTone?.icon} {selectedTone?.label}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadAudio}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

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
            placeholder="Hi, I'm [Your Name], a [Your Title] with [X] years of experience in [Your Field]. I specialize in [Key Skills] and have worked with companies like [Notable Companies]. I'm passionate about [Your Passion] and looking for opportunities to [Your Goal]..."
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
          <RadioGroup 
            value={tone} 
            onValueChange={setTone}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {toneOptions.map((option) => (
              <div key={option.value} className="relative">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className="flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <span className="text-2xl mb-1">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {option.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={generateAudioResume} 
          disabled={generating || !text.trim()}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Audio...
            </>
          ) : audioUrl ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Audio Resume
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Audio Resume
            </>
          )}
        </Button>

        {!audioUrl && (
          <p className="text-xs text-center text-muted-foreground">
            Your audio introduction will be visible to employers viewing your profile
          </p>
        )}
      </CardContent>
    </Card>
  );
};
