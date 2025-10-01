-- Create enum types
CREATE TYPE user_type AS ENUM ('freelancer', 'client', 'both');
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'under_review', 'completed', 'disputed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  user_type user_type DEFAULT 'both',
  bio TEXT,
  skills TEXT[],
  hourly_rate DECIMAL(10, 2),
  location TEXT,
  avatar_url TEXT,
  portfolio_items JSONB DEFAULT '[]'::jsonb,
  total_earnings DECIMAL(15, 4) DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills_required TEXT[] NOT NULL,
  budget_eth DECIMAL(15, 4) NOT NULL,
  budget_usd DECIMAL(15, 2),
  duration_weeks INTEGER,
  status job_status DEFAULT 'open',
  contract_address TEXT,
  ipfs_hash TEXT,
  escrow_address TEXT,
  accepted_bid_id UUID,
  freelancer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal_text TEXT NOT NULL,
  bid_amount_eth DECIMAL(15, 4) NOT NULL,
  estimated_duration_weeks INTEGER,
  status bid_status DEFAULT 'pending',
  ipfs_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, freelancer_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id),
  CHECK (participant_1_id < participant_2_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  telegram_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, reviewer_id, reviewee_id)
);

-- Create job_milestones table
CREATE TABLE public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount_eth DECIMAL(15, 4) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_paid BOOLEAN DEFAULT FALSE,
  ipfs_hash TEXT,
  order_index INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for jobs
CREATE POLICY "Jobs are viewable by everyone"
  ON public.jobs FOR SELECT
  USING (true);

CREATE POLICY "Clients can create jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = client_id);

-- RLS Policies for bids
CREATE POLICY "Bids are viewable by job owner and bidder"
  ON public.bids FOR SELECT
  USING (
    auth.uid() = freelancer_id OR
    auth.uid() IN (SELECT client_id FROM public.jobs WHERE id = job_id)
  );

CREATE POLICY "Freelancers can create bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = freelancer_id);

CREATE POLICY "Freelancers can update their own bids"
  ON public.bids FOR UPDATE
  USING (auth.uid() = freelancer_id);

CREATE POLICY "Freelancers can delete their own bids"
  ON public.bids FOR DELETE
  USING (auth.uid() = freelancer_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- RLS Policies for job_milestones
CREATE POLICY "Milestones are viewable by job participants"
  ON public.job_milestones FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs
      WHERE client_id = auth.uid() OR freelancer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create milestones"
  ON public.job_milestones FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients can update milestones"
  ON public.job_milestones FOR UPDATE
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE client_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX idx_jobs_freelancer_id ON public.jobs(freelancer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_bids_job_id ON public.bids(job_id);
CREATE INDEX idx_bids_freelancer_id ON public.bids(freelancer_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bids_updated_at
  BEFORE UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;