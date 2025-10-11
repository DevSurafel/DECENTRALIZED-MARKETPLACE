-- Drop the existing foreign key constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Now insert the admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('fec9f0ad-5770-486d-b380-b36082e8b3a4', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;