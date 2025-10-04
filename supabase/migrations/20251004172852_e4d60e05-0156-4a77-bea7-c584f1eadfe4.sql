-- Add field to track which conversation was last notified for better reply handling
ALTER TABLE public.profiles 
ADD COLUMN last_notified_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;