-- Add seller-specific payout wallet to social media listings
ALTER TABLE public.social_media_listings
ADD COLUMN IF NOT EXISTS seller_wallet_address TEXT;

-- Optional: simple check via application layer; keep DB flexible.
-- Consider adding an index if querying by wallet frequently
-- CREATE INDEX IF NOT EXISTS idx_social_media_listings_seller_wallet ON public.social_media_listings (seller_wallet_address);
