import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface PlatformReviewDialogProps {
  jobId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PlatformReviewDialog({ jobId, trigger, onSuccess }: PlatformReviewDialogProps) {
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

      // Check if user has already reviewed the platform
      const { data: existingReview } = await supabase
        .from('platform_reviews')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingReview) {
        toast({
          title: "Already Reviewed",
          description: "You've already reviewed the platform",
          variant: "destructive"
        });
        setOpen(false);
        return;
      }

      const { error } = await supabase
        .from('platform_reviews')
        .insert({
          user_id: user.id,
          rating,
          review_text: comment.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Thank You!",
        description: "Your feedback helps us improve our platform",
      });

      setOpen(false);
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting platform review:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Already Reviewed",
          description: "You've already reviewed the platform for this job",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit review",
          variant: "destructive"
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Review Platform</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review DeFiLance Platform</DialogTitle>
          <DialogDescription>
            How was your experience using our platform?
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
              placeholder="Share your thoughts about the platform..."
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
