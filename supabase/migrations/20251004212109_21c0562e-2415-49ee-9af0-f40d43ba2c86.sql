-- Create platform_reviews table for reviews about the platform service
CREATE TABLE IF NOT EXISTS public.platform_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reviewer_id, job_id)
);

-- Enable RLS on platform_reviews
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

-- Platform reviews are viewable by everyone
CREATE POLICY "Platform reviews are viewable by everyone"
ON public.platform_reviews
FOR SELECT
USING (true);

-- Users can create platform reviews for jobs they participated in
CREATE POLICY "Users can create platform reviews"
ON public.platform_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id AND
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE client_id = auth.uid() OR freelancer_id = auth.uid()
  )
);

-- Add admin role to existing user_roles enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'arbitrator', 'user');
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;