-- Create job_milestones table for milestone-based payments
CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  milestone_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL,
  amount_eth NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, milestone_number)
);

-- Enable RLS
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_milestones
CREATE POLICY "Milestones viewable by job participants"
  ON public.job_milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
      AND (jobs.client_id = auth.uid() OR jobs.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Clients can create milestones"
  ON public.job_milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
      AND jobs.client_id = auth.uid()
    )
  );

CREATE POLICY "Job participants can update milestones"
  ON public.job_milestones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
      AND (jobs.client_id = auth.uid() OR jobs.freelancer_id = auth.uid())
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_job_milestones_updated_at
  BEFORE UPDATE ON public.job_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Fix foreign key references for existing tables if needed
-- Ensure profiles table foreign keys are correct
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_freelancer_id_fkey;
ALTER TABLE public.bids ADD CONSTRAINT bids_freelancer_id_fkey 
  FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_job_id_fkey;
ALTER TABLE public.bids ADD CONSTRAINT bids_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_freelancer_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_freelancer_id_fkey 
  FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.social_media_listings DROP CONSTRAINT IF EXISTS social_media_listings_seller_id_fkey;
ALTER TABLE public.social_media_listings ADD CONSTRAINT social_media_listings_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_job_id_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_raised_by_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_raised_by_fkey 
  FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_resolved_by_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.job_revisions DROP CONSTRAINT IF EXISTS job_revisions_job_id_fkey;
ALTER TABLE public.job_revisions ADD CONSTRAINT job_revisions_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.job_revisions DROP CONSTRAINT IF EXISTS job_revisions_submitted_by_fkey;
ALTER TABLE public.job_revisions ADD CONSTRAINT job_revisions_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;