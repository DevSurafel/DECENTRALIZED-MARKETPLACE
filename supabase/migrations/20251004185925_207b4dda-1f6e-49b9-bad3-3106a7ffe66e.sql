-- Add new job statuses for the complete workflow
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'funded';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'submitted';

-- Create function to update freelancer stats when job is completed
CREATE OR REPLACE FUNCTION increment_completed_jobs(freelancer_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    completed_jobs = COALESCE(completed_jobs, 0) + 1,
    total_earnings = COALESCE(total_earnings, 0) + amount,
    success_rate = CASE
      WHEN COALESCE(completed_jobs, 0) + 1 > 0 
      THEN ((COALESCE(completed_jobs, 0) + 1)::NUMERIC / (COALESCE(completed_jobs, 0) + 1 + COALESCE(failed_disputes, 0))) * 100
      ELSE 100
    END
  WHERE id = freelancer_id;
END;
$$;