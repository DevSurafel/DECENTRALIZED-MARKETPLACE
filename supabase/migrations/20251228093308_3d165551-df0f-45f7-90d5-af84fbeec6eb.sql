-- Add additional fields to jobs table for comprehensive job postings
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'remote',
ADD COLUMN IF NOT EXISTS timezone_preference text,
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS questions_for_freelancer text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS freelancers_needed integer DEFAULT 1;

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.category IS 'Job category: web_dev, mobile_dev, design, writing, marketing, data, ai_ml, blockchain, other';
COMMENT ON COLUMN public.jobs.experience_level IS 'Required experience: entry, intermediate, expert';
COMMENT ON COLUMN public.jobs.project_type IS 'Project type: one_time, ongoing, contract';
COMMENT ON COLUMN public.jobs.payment_type IS 'Payment type: fixed, hourly';
COMMENT ON COLUMN public.jobs.location_type IS 'Location type: remote, onsite, hybrid';
COMMENT ON COLUMN public.jobs.timezone_preference IS 'Preferred timezone for collaboration';
COMMENT ON COLUMN public.jobs.attachment_urls IS 'URLs to project attachments/briefs';
COMMENT ON COLUMN public.jobs.questions_for_freelancer IS 'Screening questions for applicants';
COMMENT ON COLUMN public.jobs.visibility IS 'Job visibility: public, private, invite_only';
COMMENT ON COLUMN public.jobs.freelancers_needed IS 'Number of freelancers needed for the job';