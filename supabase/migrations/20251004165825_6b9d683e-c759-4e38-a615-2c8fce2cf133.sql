-- Fix RLS to allow recipients to mark messages as read and participants to update conversations

-- DROP existing restrictive policy on messages update if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'messages' 
      AND policyname = 'Users can update their own messages'
  ) THEN
    DROP POLICY "Users can update their own messages" ON public.messages;
  END IF;
END $$;

-- Allow participants of a conversation to update messages (e.g., to mark as read)
CREATE POLICY "Participants can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
  )
);

-- Allow participants to update their conversation metadata (e.g., last_message_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'conversations' 
      AND policyname = 'Participants can update their conversations'
  ) THEN
    CREATE POLICY "Participants can update their conversations"
    ON public.conversations
    FOR UPDATE
    USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());
  END IF;
END $$;
