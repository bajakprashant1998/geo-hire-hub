import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Upload, FileSpreadsheet, CheckCircle, Loader2, Download, RefreshCw,
  ArrowRight, XCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(current.trim()); current = ''; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim()); current = ''; rows.push(row); row = [];
        if (ch === '\r') i++;
      } else current += ch;
    }
  }
  if (current || row.length) { row.push(current.trim()); rows.push(row); }
  return rows;
}

interface JobRow {
  title: string;
  description: string;
  job_type: string;
  salary_range: string;
  job_address: string;
  requirements: string;
  work_mode: string;
  valid: boolean;
  error?: string;
}

interface BulkJobImportProps {
  employerId: string;
}

const JOB_FIELDS = ['title', 'description', 'job_type', 'salary_range', 'job_address', 'requirements', 'work_mode'];
const REQUIRED = ['title', 'description'];

export function BulkJobImport({ employerId }: BulkJobImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<JobRow[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ inserted: 0, errors: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csvRows = parseCSV(ev.target?.result as string);
      if (csvRows.length < 2) { toast.error('File needs header + data rows'); return; }
      const hdrs = csvRows[0].map(h => h.toLowerCase().trim());
      setHeaders(hdrs);

      const autoMap: Record<string, string> = {};
      JOB_FIELDS.forEach(field => {
        const match = hdrs.findIndex(h =>
          h === field || h.replace(/[\s_-]/g, '') === field.replace(/_/g, '') ||
          (field === 'title' && (h.includes('title') || h.includes('position'))) ||
          (field === 'description' && h.includes('description')) ||
          (field === 'job_type' && (h.includes('type') || h.includes('employment'))) ||
          (field === 'salary_range' && (h.includes('salary') || h.includes('compensation'))) ||
          (field === 'job_address' && (h.includes('address') || h.includes('location'))) ||
          (field === 'requirements' && h.includes('require')) ||
          (field === 'work_mode' && (h.includes('work') && h.includes('mode') || h.includes('remote')))
        );
        if (match >= 0) autoMap[field] = hdrs[match];
      });
      setFieldMap(autoMap);
      setStep('map');
    };
    reader.readAsText(f);
  };

  const processMapping = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csvRows = parseCSV(ev.target?.result as string);
      const hdrs = csvRows[0].map(h => h.toLowerCase().trim());

      const mapped: JobRow[] = csvRows.slice(1).map(row => {
        const getVal = (field: string) => {
          const col = fieldMap[field];
          if (!col) return '';
          const idx = hdrs.indexOf(col);
          return idx >= 0 ? (row[idx] || '').trim() : '';
        };

        const jr: JobRow = {
          title: getVal('title'),
          description: getVal('description'),
          job_type: getVal('job_type') || 'full-time',
          salary_range: getVal('salary_range'),
          job_address: getVal('job_address'),
          requirements: getVal('requirements'),
          work_mode: getVal('work_mode') || 'onsite',
          valid: true,
        };

        if (!jr.title) { jr.valid = false; jr.error = 'Missing title'; }
        else if (!jr.description || jr.description.length < 10) { jr.valid = false; jr.error = 'Description too short'; }

        return jr;
      }).filter(r => r.title);

      setRows(mapped);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    const validRows = rows.filter(r => r.valid);
    let inserted = 0, errors = 0;

    const batchSize = 10;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const jobRecords = batch.map(row => ({
        employer_id: employerId,
        title: row.title,
        description: row.description,
        job_type: row.job_type,
        salary_range: row.salary_range || null,
        job_address: row.job_address || null,
        requirements: row.requirements || null,
        work_mode: row.work_mode || 'onsite',
        status: 'open' as const,
        is_active: false, // Draft mode — employer activates manually
        latitude: 0,
        longitude: 0,
      }));

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobRecords)
        .select('id');

      if (error) {
        console.error('Batch insert error:', error);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
      }

      setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setResults({ inserted, errors });
    setStep('done');
    toast.success(`Imported ${inserted} jobs as inactive drafts`);
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Bulk Job Import</h2>
        <Badge variant="outline" className="text-xs">CSV</Badge>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-dashed border-2 border-border/60 bg-muted/20">
              <CardContent className="p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Upload Job Listings CSV</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Columns: title, description, job_type, salary_range, location, requirements, work_mode
                </p>
                <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Jobs will be imported as <strong>inactive</strong> — activate them individually after review.
                </p>
                <div className="flex justify-center gap-3">
                  <label>
                    <Input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <Button asChild><span><Upload className="h-4 w-4 mr-2" />Choose CSV</span></Button>
                  </label>
                  <Button variant="outline" onClick={() => {
                    const csv = 'title,description,job_type,salary_range,job_address,requirements,work_mode\nSoftware Engineer,"Build amazing products with our team. We are looking for passionate developers.",full-time,$80k-$120k,"New York, US","3+ years React experience",hybrid';
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'jobs_template.csv'; a.click();
                  }}>
                    <Download className="h-4 w-4 mr-2" />Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Map CSV Columns</CardTitle>
                <CardDescription>Match your CSV columns to job fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {JOB_FIELDS.map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <Label className="w-36 text-sm capitalize">
                      {field.replace(/_/g, ' ')}
                      {REQUIRED.includes(field) && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select value={fieldMap[field] || ''} onValueChange={v => setFieldMap(prev => ({ ...prev, [field]: v }))}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {fieldMap[field] && <CheckCircle className="h-4 w-4 text-success" />}
                  </div>
                ))}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
                  <Button onClick={processMapping} disabled={!REQUIRED.every(f => fieldMap[f])}>
                    Preview <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />{validCount} valid</Badge>
              {invalidCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{invalidCount} invalid</Badge>}
            </div>

            <Card>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i} className={row.valid ? '' : 'bg-destructive/5'}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          {row.valid
                            ? <CheckCircle className="h-4 w-4 text-success" />
                            : <span className="text-xs text-destructive">{row.error}</span>
                          }
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-48 truncate">{row.title}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{row.job_type}</Badge></TableCell>
                        <TableCell className="text-sm">{row.salary_range || '—'}</TableCell>
                        <TableCell className="text-sm max-w-32 truncate">{row.job_address || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.work_mode}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport} disabled={validCount === 0} className="gap-2">
                <Upload className="h-4 w-4" />Import {validCount} Jobs
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'importing' && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="font-medium">Importing jobs...</p>
            <Progress value={progress} className="max-w-sm mx-auto" />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-xl font-bold">Import Complete</h3>
            <p className="text-sm text-muted-foreground">Jobs created as inactive — review and activate them from your Job Postings tab.</p>
            <div className="flex justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{results.inserted}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setFile(null); }}>
              <RefreshCw className="h-4 w-4 mr-2" />Import More
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
