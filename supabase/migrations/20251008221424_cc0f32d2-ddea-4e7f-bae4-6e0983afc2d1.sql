-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb;

-- The security warning about leaked password protection is a configuration setting, not a database issue
-- Users can enable it in Supabase Dashboard > Authentication > Providers > Email > Password Protection