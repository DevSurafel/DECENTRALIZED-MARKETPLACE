-- Enable leaked password protection for better security
-- This prevents users from using passwords that have been exposed in data breaches

-- Note: This is configured through Supabase Auth settings
-- Since we cannot modify auth schema directly, we'll document this requirement

-- Admin should enable this in Supabase Dashboard:
-- Authentication > Providers > Email > Password Settings
-- Enable: "Leaked Password Protection"

-- This migration serves as documentation that this security feature should be enabled