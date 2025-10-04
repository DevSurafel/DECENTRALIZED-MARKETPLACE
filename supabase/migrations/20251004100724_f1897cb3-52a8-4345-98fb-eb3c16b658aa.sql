-- Add revision tracking and dispute protections

-- Add revision tracking table
CREATE TABLE IF NOT EXISTS public.job_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  ipfs_hash TEXT NOT NULL,
  git_commit_hash TEXT,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  UNIQUE(job_id, revision_number)
);

-- Add dispute tracking table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  raised_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  arbitration_deposit_eth NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolution_notes TEXT,
  client_amount_eth NUMERIC,
  freelancer_amount_eth NUMERIC,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  evidence_bundle JSONB
);

-- Add reputation and strikes to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reputation_score NUMERIC DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS dispute_strikes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_disputes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_disputes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_kyc BOOLEAN DEFAULT false;

-- Add dispute/revision fields to jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS allowed_revisions INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS current_revision_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_release_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS freelancer_stake_eth NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS git_commit_hash TEXT,
ADD COLUMN IF NOT EXISTS requires_freelancer_stake BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stake_percentage NUMERIC DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS arbitration_deposit_percentage NUMERIC DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES disputes(id);

-- Enable RLS on new tables
ALTER TABLE public.job_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for revisions
CREATE POLICY "Revisions viewable by job participants"
ON public.job_revisions FOR SELECT
USING (
  job_id IN (
    SELECT id FROM jobs 
    WHERE client_id = auth.uid() OR freelancer_id = auth.uid()
  )
);

CREATE POLICY "Freelancers can create revisions"
ON public.job_revisions FOR INSERT
WITH CHECK (
  submitted_by = auth.uid() AND
  job_id IN (
    SELECT id FROM jobs WHERE freelancer_id = auth.uid()
  )
);

-- RLS policies for disputes
CREATE POLICY "Disputes viewable by participants"
ON public.disputes FOR SELECT
USING (
  job_id IN (
    SELECT id FROM jobs 
    WHERE client_id = auth.uid() OR freelancer_id = auth.uid()
  )
);

CREATE POLICY "Job participants can raise disputes"
ON public.disputes FOR INSERT
WITH CHECK (
  raised_by = auth.uid() AND
  job_id IN (
    SELECT id FROM jobs 
    WHERE client_id = auth.uid() OR freelancer_id = auth.uid()
  )
);

-- Create app_role enum for arbitrators
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'arbitrator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS for user_roles
CREATE POLICY "User roles viewable by everyone"
ON public.user_roles FOR SELECT
USING (true);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Allow arbitrators to update disputes
CREATE POLICY "Arbitrators can resolve disputes"
ON public.disputes FOR UPDATE
USING (public.has_role(auth.uid(), 'arbitrator') OR public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_revisions_job_id ON public.job_revisions(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Update job status enum to include revision states
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'refunded';