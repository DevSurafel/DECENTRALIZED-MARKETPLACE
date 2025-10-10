-- Allow sellers to delete their own social media listings
ALTER POLICY "Sellers can update their listings" ON public.social_media_listings
  USING (auth.uid() = seller_id);

-- Create delete policy for social media listings
CREATE POLICY "Sellers can delete their listings"
  ON public.social_media_listings
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Create delete policy for jobs  
CREATE POLICY "Clients can delete their jobs"
  ON public.jobs
  FOR DELETE
  USING (auth.uid() = client_id);