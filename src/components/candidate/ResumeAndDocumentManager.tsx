import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, Trash2, Loader2, Download, Eye, EyeOff, Lock, Users, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

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
}

const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_STORAGE_MB = 50;
const BYTES_PER_MB = 1024 * 1024;

export const ResumeAndDocumentManager = ({ candidate, onUpdate }: ResumeAndDocumentManagerProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [aiResumes, setAiResumes] = useState<AIResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [visibility, setVisibility] = useState(candidate?.resume_visibility || 'approved_employers');

    const totalStorageUsed = documents.reduce((acc, doc) => acc + doc.size, 0);
    const storagePercentage = Math.min(100, Math.round((totalStorageUsed / (MAX_TOTAL_STORAGE_MB * BYTES_PER_MB)) * 100));

    useEffect(() => {
        if (user) {
            fetchData();
        }
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
                // Filter out hidden folders like .emptyFolderPlaceholder
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

                // Sort by created_at descending
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
                .select('id, name, created_at, updated_at')
                .eq('candidate_id', candidate.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setAiResumes(data || []);
        } catch (error) {
            console.error('Error fetching AI resumes:', error);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
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
        try {
            const fileExt = file.name.split('.').pop();
            // Generate a unique filename to prevent accidental overrides of non-primary documents
            const uniqueName = `doc_${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${uniqueName}`;

            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // If they have no primary resume yet, set this as primary automatically
            if (!candidate?.resume_url) {
                await setPrimaryResume(filePath, file.name);
            } else {
                toast.success('Document uploaded successfully');
                await fetchDocuments();
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

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
                    .update({
                        resume_url: null,
                        resume_filename: null,
                        resume_uploaded_at: null,
                    })
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
                .update({
                    resume_url: filePath,
                    resume_filename: filename,
                    resume_uploaded_at: new Date().toISOString(),
                })
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
            const { data, error } = await supabase.storage
                .from('resumes')
                .download(filePath);

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

    const isStorageFull = totalStorageUsed >= MAX_TOTAL_STORAGE_MB * BYTES_PER_MB;

    return (
        <div className="space-y-6">
            {/* Uploaded Documents */}
            <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <FileText className="w-5 h-5 text-primary" />
                                My Documents
                            </CardTitle>
                            <CardDescription>
                                Upload and manage your resumes, cover letters, and portfolios.
                            </CardDescription>
                        </div>

                        <div className="w-full sm:w-64 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <span className="font-medium text-foreground">{formatFileSize(totalStorageUsed)}</span> used
                                </span>
                                <span className="text-muted-foreground">{MAX_TOTAL_STORAGE_MB} MB max</span>
                            </div>
                            <Progress value={storagePercentage} className={`h-2 ${storagePercentage > 90 ? 'bg-destructive/20 *:[&>div]:bg-destructive' : ''}`} />
                            {isStorageFull && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Storage full. Delete files to upload more.
                                </p>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Upload Dropzone */}
                    <div>
                        <label className={`block ${isStorageFull ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors bg-secondary/50 hover:bg-secondary">
                                {uploading ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                        <p className="font-medium">Uploading document...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                        <p className="font-medium mb-1 text-foreground">Click to upload a new document</p>
                                        <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX (max {MAX_FILE_SIZE_MB}MB)</p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={handleUpload}
                                disabled={uploading || isStorageFull}
                            />
                        </label>
                    </div>

                    {/* Document List */}
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : documents.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Uploaded Files</h3>
                            {documents.map((doc) => {
                                // Try to extract original name. if it has prefix `doc_abc123_1234.pdf`, we just show the name, but our unique format adds prefix. We can just show doc.name though it has unique id. 
                                // Actually to keep it simple, we just show doc.name. If they uploaded "resume.pdf", earlier logic uploaded as "resume.pdf". New logic uses unique name. Let's just display the filename stored in db if it's primary, or just the file name.
                                const originalName = doc.isPrimary && candidate.resume_filename ? candidate.resume_filename : doc.name.split('_').pop() || doc.name;

                                return (
                                    <div key={doc.url} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${doc.isPrimary ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-secondary/50'}`}>
                                        <div className="flex items-start sm:items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.isPrimary ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]" title={originalName}>
                                                        {originalName}
                                                    </p>
                                                    {doc.isPrimary && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground uppercase tracking-wider">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                                    <span>{formatFileSize(doc.size)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!doc.isPrimary && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() => setPrimaryResume(doc.url, originalName)}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    Set Primary
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDocument(doc.url, originalName)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc.url)}
                                                disabled={deleting === doc.url}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                {deleting === doc.url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                            <p>No documents uploaded yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Resumes */}
            <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="w-5 h-5 text-primary" />
                        AI-Generated Resumes
                    </CardTitle>
                    <CardDescription>
                        Resumes created using the HireForJob AI Resume Builder.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : aiResumes.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {aiResumes.map((resume) => (
                                <div key={resume.id} className="p-4 rounded-xl border bg-card hover:bg-secondary/50 transition-colors flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-foreground truncate" title={resume.name || "AI Resume"}>
                                                {resume.name || "AI Resume"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(resume.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-8"
                                            onClick={() => navigate('/ai-resume-builder')}
                                        >
                                            View / Edit
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border border-dashed rounded-xl flex flex-col items-center justify-center gap-3">
                            <p className="text-muted-foreground">You haven't generated any AI resumes yet.</p>
                            <Button onClick={() => navigate('/ai-resume-builder')} variant="outline" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Go to AI Resume Builder
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Lock className="w-5 h-5 text-primary" />
                        Primary Resume Privacy
                    </CardTitle>
                    <CardDescription>
                        Control who can see the document you set as "Primary". By default, only your Photo, Name, and Job Title are visible to everyone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <RadioGroup value={visibility} onValueChange={handleVisibilityChange} className="grid sm:grid-cols-3 gap-4">
                        <div className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === 'private' ? 'bg-primary/5 border-primary/50' : 'bg-card hover:bg-secondary/50'}`} onClick={() => handleVisibilityChange('private')}>
                            <RadioGroupItem value="private" id="private" className="mt-1" />
                            <Label htmlFor="private" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">Private</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Only you can see your full resume
                                </p>
                            </Label>
                        </div>

                        <div className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === 'approved_employers' ? 'bg-primary/5 border-primary/50' : 'bg-card hover:bg-secondary/50'}`} onClick={() => handleVisibilityChange('approved_employers')}>
                            <RadioGroupItem value="approved_employers" id="approved" className="mt-1" />
                            <Label htmlFor="approved" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium leading-tight">Approved Employers Only</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Only verified employers can view your resume
                                </p>
                            </Label>
                        </div>

                        <div className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === 'all_employers' ? 'bg-primary/5 border-primary/50' : 'bg-card hover:bg-secondary/50'}`} onClick={() => handleVisibilityChange('all_employers')}>
                            <RadioGroupItem value="all_employers" id="all" className="mt-1" />
                            <Label htmlFor="all" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                    <Eye className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium leading-tight">All Employers</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Any logged-in employer can view your resume
                                </p>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
    );
};
