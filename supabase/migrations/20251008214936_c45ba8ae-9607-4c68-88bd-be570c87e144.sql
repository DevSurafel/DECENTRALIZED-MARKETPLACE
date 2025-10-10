-- Create storage bucket for social media screenshots (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-screenshots', 'social-media-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
DO $$ BEGIN
  CREATE POLICY "Anyone can view screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media-screenshots');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'social-media-screenshots' 
    AND auth.role() = 'authenticated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'social-media-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'social-media-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add missing foreign key constraints for conversations table (if not exists)
DO $$ BEGIN
  ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_participant_1_id_fkey 
  FOREIGN KEY (participant_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_participant_2_id_fkey 
  FOREIGN KEY (participant_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;