-- Add listing_id to jobs table to link social media listings
ALTER TABLE public.jobs 
ADD COLUMN listing_id uuid REFERENCES public.social_media_listings(id);

-- Create index for better query performance
CREATE INDEX idx_jobs_listing_id ON public.jobs(listing_id);