-- First, drop the policy that depends on the status column
DROP POLICY IF EXISTS "Users can create reviews for completed jobs" ON public.reviews;

-- Now alter the jobs.status column to text type
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        ALTER TABLE public.jobs ALTER COLUMN status TYPE text;
        DROP TYPE IF EXISTS job_status CASCADE;
    END IF;
END $$;

-- Ensure the column is text type
ALTER TABLE public.jobs ALTER COLUMN status TYPE text;
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'open';

-- Recreate the policy with text comparison
CREATE POLICY "Users can create reviews for completed jobs"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = reviews.job_id 
    AND jobs.status = 'completed'
    AND (jobs.client_id = auth.uid() OR jobs.freelancer_id = auth.uid())
  )
);