-- Create reviews table for peer reviews after job completion
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type TEXT DEFAULT 'user' CHECK (review_type IN ('user', 'platform')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, reviewer_id, reviewee_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Job participants can create reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = reviews.job_id
      AND (jobs.client_id = auth.uid() OR jobs.freelancer_id = auth.uid())
      AND jobs.status = 'completed'
    )
  );

CREATE POLICY "Reviewers can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);