import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/anyClient";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RatingDialogProps {
  jobId: string;
  revieweeId: string;
  revieweeName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RatingDialog({ jobId, revieweeId, revieweeName, trigger, onSuccess }: RatingDialogProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has already reviewed this person for this job
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('job_id', jobId)
        .eq('reviewer_id', user.id)
        .eq('reviewee_id', revieweeId)
        .single();

      if (existingReview) {
        toast({
          title: "Already Reviewed",
          description: "You've already reviewed this person for this job",
          variant: "destructive"
        });
        setOpen(false);
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          job_id: jobId,
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      // Update reviewee's average rating (including the new review)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId)
        .not('rating', 'is', null);

      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = Math.round((totalRating / reviews.length) * 10) / 10;
        
        console.log('Rating calculation:', { totalRating, count: reviews.length, avgRating, ratings: reviews.map(r => r.rating) });
        
        await supabase
          .from('profiles')
          .update({ average_rating: avgRating })
          .eq('id', revieweeId);
      }

      // Notify the reviewee via Telegram about the review
      try {
        const { data: reviewerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        const { data: jobData } = await supabase
          .from('jobs')
          .select('title')
          .eq('id', jobId)
          .single();

        const stars = '⭐'.repeat(rating);
        const reviewText = comment.trim() ? `\n\n"${comment.trim()}"` : '';

        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            recipient_id: revieweeId,
            message: `⭐ ${reviewerProfile?.display_name || 'A user'} left you a review for "${jobData?.title}":\n\n${stars} (${rating}/5)${reviewText}`,
            sender_id: user.id,
            url: `${window.location.origin}/profile/${revieweeId}`,
            button_text: 'View Profile'
          }
        });
      } catch (notifError) {
        console.error('Error sending review notification:', notifError);
      }

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      setOpen(false);
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Leave Review</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {revieweeName}</DialogTitle>
          <DialogDescription>
            Share your experience working on this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-3 block">Rating</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {rating === 5 && "Excellent!"}
                {rating === 4 && "Great"}
                {rating === 3 && "Good"}
                {rating === 2 && "Fair"}
                {rating === 1 && "Poor"}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="comment" className="mb-2 block">
              Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share details about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
