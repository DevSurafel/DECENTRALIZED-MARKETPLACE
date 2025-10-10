-- Add missing columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Update job_status enum to include all needed statuses
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'under_review';

-- Create increment_completed_jobs function
CREATE OR REPLACE FUNCTION public.increment_completed_jobs(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET completed_jobs = COALESCE(completed_jobs, 0) + 1
  WHERE id = user_id_param;
END;
$$;

-- Create assign_admin_role function
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Insert admin role for target user if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_freelancer_id ON public.jobs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_bids_job_id ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer_id ON public.bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_social_media_listings_seller_id ON public.social_media_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_social_media_listings_status ON public.social_media_listings(status);