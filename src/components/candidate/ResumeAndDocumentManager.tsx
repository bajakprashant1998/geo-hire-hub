import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Upload, FileText, Trash2, Loader2, Download, Eye, EyeOff, Lock, Users, Sparkles, 
  AlertCircle, CheckCircle, FolderOpen, Plus, RefreshCw, Star, Clock, HardDrive,
  FileCheck, Shield, ChevronRight, Wand2, ExternalLink, Info, File, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ResumeAndDocumentManagerProps {
  candidate: any;
  onUpdate: () => void;
}

interface DocumentFile {
  name: string;
  url: string;
  size: number;
  created_at: string;
  isPrimary: boolean;
}

interface AIResume {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  style?: string;
}

const MAX_FILE_SIZE_MB = 25;
const MAX_TOTAL_STORAGE_MB = 100;
const BYTES_PER_MB = 1024 * 1024;

const VISIBILITY_OPTIONS = [
  { 
    value: 'private', 
    label: 'Private', 
    icon: EyeOff, 
    description: 'Only you can see your full resume',
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  },
  { 
    value: 'approved_employers', 
    label: 'Verified Employers', 
    icon: Shield, 
    description: 'Only verified employers can view',
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  { 
    value: 'all_employers', 
    label: 'All Employers', 
    icon: Users, 
    description: 'Any logged-in employer can view',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  },
];

export const ResumeAndDocumentManager = ({ candidate, onUpdate }: ResumeAndDocumentManagerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [aiResumes, setAiResumes] = useState<AIResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [visibility, setVisibility] = useState(candidate?.resume_visibility || 'approved_employers');
  const [activeTab, setActiveTab] = useState('documents');
  const [dragOver, setDragOver] = useState(false);

  const totalStorageUsed = documents.reduce((acc, doc) => acc + doc.size, 0);
  const storagePercentage = Math.min(100, Math.round((totalStorageUsed / (MAX_TOTAL_STORAGE_MB * BYTES_PER_MB)) * 100));
  const isStorageFull = totalStorageUsed >= MAX_TOTAL_STORAGE_MB * BYTES_PER_MB;

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchDocuments(), fetchAIResumes()]);
    setLoading(false);
  };

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.storage.from('resumes').list(`${user.id}/`);
      if (error) throw error;

      if (data) {
        const files = data.filter(file => file.name !== '.emptyFolderPlaceholder');
        const mappedFiles = await Promise.all(
          files.map(async (file) => {
            const filePath = `${user.id}/${file.name}`;
            return {
              name: file.name,
              url: filePath,
              size: file.metadata?.size || 0,
              created_at: file.created_at,
              isPrimary: candidate?.resume_url === filePath,
            };
          })
        );
        mappedFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDocuments(mappedFiles);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const fetchAIResumes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('candidate_resumes')
        .select('id, name, created_at, updated_at, style')
        .eq('candidate_id', candidate.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setAiResumes(data || []);
    } catch (error) {
      console.error('Error fetching AI resumes:', error);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file || !user) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'doc', 'docx'];
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    if (totalStorageUsed + file.size > MAX_TOTAL_STORAGE_MB * BYTES_PER_MB) {
      toast.error(`Storage limit reached. You can only store up to ${MAX_TOTAL_STORAGE_MB}MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
    }, 200);

    try {
      const ext = file.name.split('.').pop();
      const uniqueName = `doc_${Math.random().toString(36).substring(7)}_${Date.now()}.${ext}`;
      const filePath = `${user.id}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      if (!candidate?.resume_url) {
        await setPrimaryResume(filePath, file.name);
      } else {
        toast.success('Document uploaded successfully!');
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [user, candidate, totalStorageUsed]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async (filePath: string) => {
    if (!user) return;
    const isPrimary = candidate?.resume_url === filePath;

    setDeleting(filePath);
    try {
      const { error } = await supabase.storage.from('resumes').remove([filePath]);
      if (error) throw error;

      if (isPrimary) {
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ resume_url: null, resume_filename: null, resume_uploaded_at: null })
          .eq('id', candidate.id);
        if (updateError) throw updateError;
        onUpdate();
      }

      toast.success('Document deleted');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const setPrimaryResume = async (filePath: string, filename: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ resume_url: filePath, resume_filename: filename, resume_uploaded_at: new Date().toISOString() })
        .eq('id', candidate.id);

      if (error) throw error;
      toast.success('Primary resume updated');
      onUpdate();
      await fetchDocuments();
    } catch (error) {
      console.error('Error setting primary resume:', error);
      toast.error('Failed to set primary resume');
    }
  };

  const downloadDocument = async (filePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage.from('resumes').download(filePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleVisibilityChange = async (value: string) => {
    setVisibility(value);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ resume_visibility: value })
        .eq('id', candidate.id);

      if (error) throw error;
      toast.success('Privacy settings updated');
      onUpdate();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const primaryDocument = documents.find(d => d.isPrimary);
  const otherDocuments = documents.filter(d => !d.isPrimary);

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-4 sm:p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 border border-primary/20 shrink-0">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-foreground truncate">Resume & Documents</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Manage your career documents</p>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/ai-resume-builder')}
                className="gap-2 w-full sm:w-auto shrink-0"
              >
                <Wand2 className="w-4 h-4" />
                AI Resume Builder
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge variant="outline" className="bg-background/50 gap-1 sm:gap-1.5 py-1 text-[10px] sm:text-xs">
                <FileCheck className="w-3 h-3" />
                {documents.length} docs
              </Badge>
              <Badge variant="outline" className="bg-background/50 gap-1 sm:gap-1.5 py-1 text-[10px] sm:text-xs">
                <Sparkles className="w-3 h-3" />
                {aiResumes.length} AI
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1 sm:gap-1.5 py-1 text-[10px] sm:text-xs",
                  storagePercentage > 80 
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30" 
                    : "bg-background/50"
                )}
              >
                <HardDrive className="w-3 h-3" />
                {formatFileSize(totalStorageUsed)} / {MAX_TOTAL_STORAGE_MB}MB
              </Badge>
            </div>
          </div>
        </div>

        {/* Storage Progress */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                Storage Usage
              </span>
              <span className={cn(
                "text-sm font-semibold",
                storagePercentage > 80 ? "text-rose-600" : "text-muted-foreground"
              )}>
                {storagePercentage}%
              </span>
            </div>
            <Progress 
              value={storagePercentage} 
              className={cn("h-2", storagePercentage > 80 && "[&>div]:bg-rose-500")} 
            />
            {isStorageFull && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" /> Storage full. Delete files to upload more.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-11">
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="ai-resumes" className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Resumes
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5">
              <Lock className="w-4 h-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4 space-y-4">
            {/* Upload Zone */}
            <Card className={cn(
              "border-2 border-dashed transition-all",
              dragOver ? "border-primary bg-primary/5" : "border-border/50",
              isStorageFull && "opacity-50 pointer-events-none"
            )}>
              <CardContent className="p-0">
                <label
                  className="block cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="p-8 text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="p-3 rounded-full bg-primary/10 mb-4"
                        >
                          <Upload className="w-8 h-8 text-primary" />
                        </motion.div>
                        <p className="font-medium text-foreground mb-2">Uploading document...</p>
                        <Progress value={uploadProgress} className="w-48 h-2" />
                        <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "inline-flex p-4 rounded-2xl mb-4 transition-colors",
                          dragOver ? "bg-primary/15" : "bg-muted/50"
                        )}>
                          <Upload className={cn(
                            "w-8 h-8",
                            dragOver ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <p className="font-medium text-foreground mb-1">
                          {dragOver ? "Drop your file here" : "Click or drag to upload"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF, DOC, or DOCX (max {MAX_FILE_SIZE_MB}MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileInputChange}
                    disabled={uploading || isStorageFull}
                  />
                </label>
              </CardContent>
            </Card>

            {/* Primary Resume */}
            {primaryDocument && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary">
                      <Star className="w-4 h-4" />
                      Primary Resume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          {getFileIcon(primaryDocument.name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                            {candidate.resume_filename || primaryDocument.name.split('_').pop()}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{formatFileSize(primaryDocument.size)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(primaryDocument.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => downloadDocument(primaryDocument.url, candidate.resume_filename || primaryDocument.name)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(primaryDocument.url)}
                              disabled={deleting === primaryDocument.url}
                              className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
                            >
                              {deleting === primaryDocument.url ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Other Documents */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : otherDocuments.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Other Documents ({otherDocuments.length})
                </h3>
                {otherDocuments.map((doc, i) => {
                  const displayName = doc.name.split('_').pop() || doc.name;
                  return (
                    <motion.div
                      key={doc.url}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                                {getFileIcon(doc.name)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground truncate max-w-[180px] sm:max-w-[280px]">
                                  {displayName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{formatFileSize(doc.size)}</span>
                                  <span>•</span>
                                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => setPrimaryResume(doc.url, displayName)}
                              >
                                <Star className="w-3.5 h-3.5" />
                                Set Primary
                              </Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => downloadDocument(doc.url, displayName)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(doc.url)}
                                    disabled={deleting === doc.url}
                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                  >
                                    {deleting === doc.url ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : !primaryDocument ? (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-4">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Documents Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Upload your resume or other career documents to share with employers.
                </p>
              </div>
            ) : null}
          </TabsContent>

          {/* AI Resumes Tab */}
          <TabsContent value="ai-resumes" className="mt-4 space-y-4">
            {/* Create New CTA */}
            <Card className="border-dashed border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-violet-500/10">
                    <Wand2 className="w-6 h-6 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Create with AI</h3>
                    <p className="text-sm text-muted-foreground">
                      Build a professional resume in minutes with our AI-powered builder
                    </p>
                  </div>
                  <Button onClick={() => navigate('/ai-resume-builder')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Resume List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : aiResumes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {aiResumes.map((resume, i) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-all h-full">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {resume.name || "AI Resume"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              <span>Updated {new Date(resume.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {resume.style && (
                          <Badge variant="secondary" className="w-fit mb-4 text-xs capitalize">
                            {resume.style} template
                          </Badge>
                        )}

                        <div className="mt-auto flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => navigate('/ai-resume-builder')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Editor
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 mb-4">
                  <Sparkles className="w-10 h-10 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No AI Resumes Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  Use our AI Resume Builder to create professional resumes tailored to your target roles.
                </p>
                <Button onClick={() => navigate('/ai-resume-builder')} className="gap-2">
                  <Wand2 className="w-4 h-4" />
                  Get Started
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Resume Visibility
                </CardTitle>
                <CardDescription>
                  Control who can view your primary resume. Your photo, name, and job title are always visible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={visibility} onValueChange={handleVisibilityChange} className="space-y-3">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-all",
                        visibility === option.value 
                          ? option.color
                          : "bg-card hover:bg-muted/50 border-border/50"
                      )}
                      onClick={() => handleVisibilityChange(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <option.icon className="w-4 h-4" />
                          <span className="font-medium">{option.label}</span>
                          {option.value === 'approved_employers' && (
                            <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </Label>
                      {visibility === option.value && (
                        <CheckCircle className="w-5 h-5 shrink-0" />
                      )}
                    </motion.div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Privacy Tips */}
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Info className="w-4 h-4" />
                  Privacy Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Your contact details are never shared publicly
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    Only employers you apply to can see your full profile
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    You can change visibility settings anytime
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
