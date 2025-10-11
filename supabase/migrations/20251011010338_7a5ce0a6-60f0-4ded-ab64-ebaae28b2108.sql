-- Refresh the PostgREST schema cache by adding a comment
COMMENT ON FUNCTION public.assign_admin_role(text) IS 'Assigns admin role to a user by email';