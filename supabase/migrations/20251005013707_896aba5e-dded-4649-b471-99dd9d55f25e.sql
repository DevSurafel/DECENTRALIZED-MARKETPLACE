-- Drop the existing SELECT policy that only allows job participants to view disputes
DROP POLICY IF EXISTS "Disputes viewable by participants" ON public.disputes;

-- Create a new policy that allows participants AND admins/arbitrators to view disputes
CREATE POLICY "Disputes viewable by participants and arbitrators"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  -- Job participants can view their own disputes
  (job_id IN (
    SELECT jobs.id
    FROM jobs
    WHERE (jobs.client_id = auth.uid() OR jobs.freelancer_id = auth.uid())
  ))
  -- OR admins/arbitrators can view all disputes
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'arbitrator'::app_role)
);