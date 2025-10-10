-- Add telegram_chat_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add last_notified_conversation_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_notified_conversation_id UUID;