import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Star, MessageSquarePlus, ThumbsUp, User, TrendingUp, Heart, Briefcase, Users, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Review {
  id: string;
  overall_rating: number;
  culture_rating: number | null;
  salary_rating: number | null;
  growth_rating: number | null;
  worklife_rating: number | null;
  management_rating: number | null;
  title: string;
  pros: string | null;
  cons: string | null;
  relationship: string;
  is_anonymous: boolean;
  helpful_count: number;
  created_at: string;
  reviewer_name?: string;
}

interface RatingSummary {
  review_count: number;
  avg_overall: number;
  avg_culture: number;
  avg_salary: number;
  avg_growth: number;
  avg_worklife: number;
  avg_management: number;
}

const StarRating = ({ rating, onRate, size = 'md', readonly = false }: {
  rating: number; onRate?: (r: number) => void; size?: 'sm' | 'md' | 'lg'; readonly?: boolean;
}) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'} ${!readonly ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => !readonly && onRate?.(i)}
        />
      ))}
    </div>
  );
};

const RatingBar = ({ label, value, icon: Icon }: { label: string; value: number | null; icon: any }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          className="h-full bg-amber-400 rounded-full"
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value}</span>
    </div>
  );
};

export const CompanyReviews = ({ employerId, companyName }: { employerId: string; companyName: string }) => {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '', pros: '', cons: '', relationship: 'candidate',
    overall_rating: 0, culture_rating: 0, salary_rating: 0,
    growth_rating: 0, worklife_rating: 0, management_rating: 0,
    is_anonymous: true,
  });

  useEffect(() => {
    fetchReviews();
  }, [employerId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data: reviewsData } = await supabase
        .from('company_reviews')
        .select('*')
        .eq('employer_id', employerId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);

      // Calculate summary locally
      if (reviewsData && reviewsData.length > 0) {
        const avg = (arr: (number | null)[]) => {
          const valid = arr.filter((v): v is number => v !== null);
          return valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : 0;
        };
        setSummary({
          review_count: reviewsData.length,
          avg_overall: avg(reviewsData.map(r => r.overall_rating)),
          avg_culture: avg(reviewsData.map(r => r.culture_rating)),
          avg_salary: avg(reviewsData.map(r => r.salary_rating)),
          avg_growth: avg(reviewsData.map(r => r.growth_rating)),
          avg_worklife: avg(reviewsData.map(r => r.worklife_rating)),
          avg_management: avg(reviewsData.map(r => r.management_rating)),
        });
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile) { toast.error('Please log in to submit a review'); return; }
    if (formData.overall_rating === 0) { toast.error('Please provide an overall rating'); return; }
    if (!formData.title.trim()) { toast.error('Please add a review title'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('company_reviews').insert({
        employer_id: employerId,
        reviewer_id: profile.id,
        title: formData.title.trim(),
        pros: formData.pros.trim() || null,
        cons: formData.cons.trim() || null,
        relationship: formData.relationship,
        overall_rating: formData.overall_rating,
        culture_rating: formData.culture_rating || null,
        salary_rating: formData.salary_rating || null,
        growth_rating: formData.growth_rating || null,
        worklife_rating: formData.worklife_rating || null,
        management_rating: formData.management_rating || null,
        is_anonymous: formData.is_anonymous,
      });

      if (error) {
        if (error.code === '23505') toast.error('You have already reviewed this company');
        else throw error;
        return;
      }

      toast.success('Review submitted! It will appear after admin approval.');
      setShowForm(false);
      setFormData({ title: '', pros: '', cons: '', relationship: 'candidate', overall_rating: 0, culture_rating: 0, salary_rating: 0, growth_rating: 0, worklife_rating: 0, management_rating: 0, is_anonymous: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const relationshipLabels: Record<string, string> = {
    employee: 'Current Employee', former_employee: 'Former Employee',
    interviewee: 'Interviewed', candidate: 'Applied',
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="shadow-google">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Reviews & Ratings
              </CardTitle>
              <CardDescription>
                {summary ? `${summary.review_count} review${summary.review_count !== 1 ? 's' : ''}` : 'No reviews yet'}
              </CardDescription>
            </div>
            {profile && (
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl">
                    <MessageSquarePlus className="w-4 h-4" />
                    Write Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review {companyName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                      <Label>Overall Rating *</Label>
                      <StarRating rating={formData.overall_rating} onRate={r => setFormData(f => ({ ...f, overall_rating: r }))} size="lg" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'culture_rating', label: 'Culture' },
                        { key: 'salary_rating', label: 'Salary' },
                        { key: 'growth_rating', label: 'Growth' },
                        { key: 'worklife_rating', label: 'Work-Life' },
                        { key: 'management_rating', label: 'Management' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <StarRating
                            rating={(formData as any)[key]}
                            onRate={r => setFormData(f => ({ ...f, [key]: r }))}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Your Relationship</Label>
                      <Select value={formData.relationship} onValueChange={v => setFormData(f => ({ ...f, relationship: v }))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Current Employee</SelectItem>
                          <SelectItem value="former_employee">Former Employee</SelectItem>
                          <SelectItem value="interviewee">Interviewed Here</SelectItem>
                          <SelectItem value="candidate">Applied Here</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Review Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                        placeholder="Summarize your experience"
                        maxLength={100}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Pros</Label>
                      <Textarea
                        value={formData.pros}
                        onChange={e => setFormData(f => ({ ...f, pros: e.target.value }))}
                        placeholder="What did you like?"
                        maxLength={500}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cons</Label>
                      <Textarea
                        value={formData.cons}
                        onChange={e => setFormData(f => ({ ...f, cons: e.target.value }))}
                        placeholder="What could be improved?"
                        maxLength={500}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Post anonymously</span>
                      </div>
                      <Switch checked={formData.is_anonymous} onCheckedChange={v => setFormData(f => ({ ...f, is_anonymous: v }))} />
                    </div>

                    <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl">
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        {summary && (
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">{summary.avg_overall}</div>
                <StarRating rating={Math.round(summary.avg_overall)} readonly size="sm" />
                <p className="text-xs text-muted-foreground mt-1">{summary.review_count} reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                <RatingBar label="Culture" value={summary.avg_culture} icon={Heart} />
                <RatingBar label="Salary" value={summary.avg_salary} icon={TrendingUp} />
                <RatingBar label="Growth" value={summary.avg_growth} icon={Briefcase} />
                <RatingBar label="Work-Life" value={summary.avg_worklife} icon={Users} />
                <RatingBar label="Management" value={summary.avg_management} icon={Shield} />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Individual Reviews */}
      {reviews.map((review, i) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="shadow-google">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{review.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={review.overall_rating} readonly size="sm" />
                    <Badge variant="outline" className="text-xs">
                      {relationshipLabels[review.relationship] || review.relationship}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>

              {review.pros && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-green-600">Pros: </span>
                  <span className="text-sm text-muted-foreground">{review.pros}</span>
                </div>
              )}
              {review.cons && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-red-500">Cons: </span>
                  <span className="text-sm text-muted-foreground">{review.cons}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Helpful ({review.helpful_count})
                </Button>
                {review.is_anonymous && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Anonymous
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {!loading && reviews.length === 0 && (
        <Card className="shadow-google">
          <CardContent className="p-8 text-center">
            <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
