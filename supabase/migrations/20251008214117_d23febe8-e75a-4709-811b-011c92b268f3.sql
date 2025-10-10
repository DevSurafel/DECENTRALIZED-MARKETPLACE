-- Drop the problematic insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a new policy that allows inserts during signup trigger
-- This allows the trigger to create profiles without RLS blocking it
CREATE POLICY "Allow profile creation during signup" ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Keep the update policy secure
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);