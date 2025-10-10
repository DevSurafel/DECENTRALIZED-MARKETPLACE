-- Add missing telegram_username column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;