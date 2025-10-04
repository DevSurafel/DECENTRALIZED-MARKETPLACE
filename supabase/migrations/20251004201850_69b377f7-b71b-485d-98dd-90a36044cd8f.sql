-- Add policy to allow freelancers to update their assigned jobs (e.g., submit work, submit revisions)
CREATE POLICY "Freelancers can update their assigned jobs"
ON public.jobs
FOR UPDATE
USING (auth.uid() = freelancer_id)
WITH CHECK (auth.uid() = freelancer_id);
