-- Create job_status enum if not exists
DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('open', 'assigned', 'in_progress', 'under_review', 'revision_requested', 'disputed', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  wallet_address TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_earnings NUMERIC(20,6) DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  failed_disputes INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  dispute_strikes INTEGER DEFAULT 0,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_usdc NUMERIC(20,6) NOT NULL,
  budget_eth NUMERIC(20,10),
  skills_required TEXT[] DEFAULT '{}',
  duration_weeks INTEGER,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status job_status DEFAULT 'open',
  ipfs_hash TEXT,
  git_commit_hash TEXT,
  current_revision_number INTEGER DEFAULT 0,
  allowed_revisions INTEGER DEFAULT 3,
  review_deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bid_amount_usdc NUMERIC(20,6) NOT NULL,
  bid_amount_eth NUMERIC(20,10),
  estimated_duration_weeks INTEGER,
  proposal_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.conversations ADD CONSTRAINT conversations_participants_job_unique UNIQUE(participant_1_id, participant_2_id, job_id);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_revisions table
CREATE TABLE IF NOT EXISTS public.job_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  revision_number INTEGER NOT NULL,
  ipfs_hash TEXT NOT NULL,
  git_commit_hash TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.job_revisions ADD CONSTRAINT job_revisions_job_revision_unique UNIQUE(job_id, revision_number);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  raised_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raised_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arbitration_deposit_eth NUMERIC(20,10),
  status TEXT DEFAULT 'pending',
  resolution_notes TEXT,
  client_amount_eth NUMERIC(20,10),
  freelancer_amount_eth NUMERIC(20,10),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_bundle JSONB
);

-- Create social_media_listings table
CREATE TABLE IF NOT EXISTS public.social_media_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  followers_count INTEGER NOT NULL,
  description TEXT NOT NULL,
  price_usdc NUMERIC(20,6) NOT NULL,
  verification_proof TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social_media_favorites table
CREATE TABLE IF NOT EXISTS public.social_media_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.social_media_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.social_media_favorites ADD CONSTRAINT social_media_favorites_user_listing_unique UNIQUE(user_id, listing_id);
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

-- Create platform_reviews table
CREATE TABLE IF NOT EXISTS public.platform_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "User roles viewable by authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "User roles viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Jobs policies
DROP POLICY IF EXISTS "Jobs viewable by everyone" ON public.jobs;
DROP POLICY IF EXISTS "Clients can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Clients and freelancers can update their jobs" ON public.jobs;

CREATE POLICY "Jobs viewable by everyone" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Clients can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients and freelancers can update their jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = client_id OR auth.uid() = freelancer_id OR public.has_role(auth.uid(), 'admin'));

-- Bids policies
DROP POLICY IF EXISTS "Bids viewable by job owner and bid owner" ON public.bids;
DROP POLICY IF EXISTS "Freelancers can create bids" ON public.bids;
DROP POLICY IF EXISTS "Freelancers can update own bids" ON public.bids;

CREATE POLICY "Bids viewable by job owner and bid owner" ON public.bids FOR SELECT USING (
  auth.uid() = freelancer_id OR 
  auth.uid() IN (SELECT client_id FROM public.jobs WHERE id = job_id)
);
CREATE POLICY "Freelancers can create bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers can update own bids" ON public.bids FOR UPDATE TO authenticated USING (auth.uid() = freelancer_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT TO authenticated USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);
CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE TO authenticated USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Job revisions policies
DROP POLICY IF EXISTS "Revisions viewable by job participants" ON public.job_revisions;
DROP POLICY IF EXISTS "Freelancers can create revisions" ON public.job_revisions;

CREATE POLICY "Revisions viewable by job participants" ON public.job_revisions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id 
    AND (client_id = auth.uid() OR freelancer_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'arbitrator') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Freelancers can create revisions" ON public.job_revisions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = submitted_by AND
  EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND freelancer_id = auth.uid())
);

-- Disputes policies
DROP POLICY IF EXISTS "Disputes viewable by participants and arbitrators" ON public.disputes;
DROP POLICY IF EXISTS "Job participants can create disputes" ON public.disputes;
DROP POLICY IF EXISTS "Arbitrators can update disputes" ON public.disputes;

CREATE POLICY "Disputes viewable by participants and arbitrators" ON public.disputes FOR SELECT TO authenticated USING (
  auth.uid() = raised_by OR
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id 
    AND (client_id = auth.uid() OR freelancer_id = auth.uid())
  ) OR
  public.has_role(auth.uid(), 'arbitrator') OR 
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Job participants can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id 
    AND (client_id = auth.uid() OR freelancer_id = auth.uid())
  )
);
CREATE POLICY "Arbitrators can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'arbitrator') OR public.has_role(auth.uid(), 'admin')
);

-- Social media listings policies
DROP POLICY IF EXISTS "Listings viewable by everyone" ON public.social_media_listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON public.social_media_listings;
DROP POLICY IF EXISTS "Sellers can update own listings" ON public.social_media_listings;
DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.social_media_listings;

CREATE POLICY "Listings viewable by everyone" ON public.social_media_listings FOR SELECT USING (true);
CREATE POLICY "Users can create their own listings" ON public.social_media_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings" ON public.social_media_listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own listings" ON public.social_media_listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- Social media favorites policies
DROP POLICY IF EXISTS "Users can view their favorites" ON public.social_media_favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.social_media_favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.social_media_favorites;

CREATE POLICY "Users can view their favorites" ON public.social_media_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.social_media_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.social_media_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Platform reviews policies
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.platform_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.platform_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.platform_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.platform_reviews;

CREATE POLICY "Reviews viewable by everyone" ON public.platform_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.platform_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.platform_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.platform_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_freelancer_id ON public.jobs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_bids_job_id ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer_id ON public.bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_job_revisions_job_id ON public.job_revisions(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_social_media_listings_seller_id ON public.social_media_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_social_media_favorites_user_id ON public.social_media_favorites(user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
DROP TRIGGER IF EXISTS update_bids_updated_at ON public.bids;
DROP TRIGGER IF EXISTS update_social_media_listings_updated_at ON public.social_media_listings;
DROP TRIGGER IF EXISTS update_platform_reviews_updated_at ON public.platform_reviews;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_social_media_listings_updated_at BEFORE UPDATE ON public.social_media_listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_platform_reviews_updated_at BEFORE UPDATE ON public.platform_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();