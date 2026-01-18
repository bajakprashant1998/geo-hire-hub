import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Plus, Trash2, Mail, Smartphone, MapPin, Briefcase, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobAlert {
  id: string;
  name: string;
  skills: string[];
  location: string | null;
  category: string | null;
  is_email_enabled: boolean;
  is_push_enabled: boolean;
  is_active: boolean;
}

interface JobAlertsManagerProps {
  candidateId: string;
}

export const JobAlertsManager = ({ candidateId }: JobAlertsManagerProps) => {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [candidateId]);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    setAlerts(data || []);
    setLoading(false);
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const resetForm = () => {
    setName('');
    setSkills([]);
    setSkillInput('');
    setLocation('');
    setCategory('');
    setEmailEnabled(true);
    setPushEnabled(false);
  };

  const createAlert = async () => {
    if (!name.trim()) {
      toast.error('Please enter an alert name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('job_alerts')
        .insert({
          candidate_id: candidateId,
          name: name.trim(),
          skills,
          location: location.trim() || null,
          category: category.trim() || null,
          is_email_enabled: emailEnabled,
          is_push_enabled: pushEnabled,
        });

      if (error) throw error;

      toast.success('Job alert created');
      setDialogOpen(false);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('job_alerts')
      .update({ is_active: isActive })
      .eq('id', id);

    if (!error) {
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_active: isActive } : a));
      toast.success(isActive ? 'Alert activated' : 'Alert paused');
    }
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from('job_alerts')
      .delete()
      .eq('id', id);

    if (!error) {
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success('Alert deleted');
    }
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-google">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Job Alerts
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Job Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Alert Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., React Developer Jobs"
                />
              </div>

              <div className="space-y-2">
                <Label>Skills to match</Label>
                <div className="flex gap-2">
                  <Input 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill..."
                  />
                  <Button type="button" onClick={addSkill} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {skill}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeSkill(skill)} 
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    Category
                  </Label>
                  <Input 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Technology"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Notification preferences</Label>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>Email notifications</span>
                  </div>
                  <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span>Push notifications</span>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={createAlert} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No job alerts yet</p>
            <p className="text-sm">Create an alert to get notified about matching jobs</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className="p-4 bg-secondary/50 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{alert.name}</h4>
                    <Badge variant={alert.is_active ? "default" : "secondary"}>
                      {alert.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {alert.skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                    {alert.location && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {alert.location}
                      </Badge>
                    )}
                    {alert.category && (
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {alert.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {alert.is_email_enabled && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </span>
                    )}
                    {alert.is_push_enabled && (
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Push
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={alert.is_active} 
                    onCheckedChange={(checked) => toggleAlert(alert.id, checked)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
