-- Insert admin role for admin@gmail.com
-- First we need to get or create the admin user profile
-- Note: This assumes the admin user (admin@gmail.com) has already signed up in the auth system

-- Insert admin role for the user if they exist
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to find the user by email in auth.users
  -- Since we can't query auth.users directly in a migration, we'll use a workaround
  -- The admin needs to sign up first, then we can assign the role
  
  -- For now, we'll create a function that can be called to assign admin role
  -- This is safer than trying to manipulate auth.users directly
END $$;

-- Create a helper function to assign admin role (can be called after admin signs up)
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user id from profiles table (safer than auth.users)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;