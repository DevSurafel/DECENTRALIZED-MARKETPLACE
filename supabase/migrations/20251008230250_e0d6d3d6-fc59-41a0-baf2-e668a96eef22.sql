-- Fix Chat: add the minimal foreign keys required for message and conversation embedding used in useMessages.ts
-- These names match the hints used in selects: conversations_participant_1_id_fkey, conversations_participant_2_id_fkey, messages_sender_id_fkey, messages_conversation_id_fkey

-- conversations.participant_1_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_participant_1_id_fkey'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_participant_1_id_fkey
    FOREIGN KEY (participant_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- conversations.participant_2_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_participant_2_id_fkey'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_participant_2_id_fkey
    FOREIGN KEY (participant_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- messages.sender_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- messages.conversation_id -> conversations.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;
END $$;