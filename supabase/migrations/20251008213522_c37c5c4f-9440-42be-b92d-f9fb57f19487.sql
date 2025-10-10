-- Drop and recreate the insert policy to allow trigger-based inserts
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Allow users to insert their own profile OR allow service role to insert
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  OR 
  auth.jwt()->>'role' = 'service_role'
);