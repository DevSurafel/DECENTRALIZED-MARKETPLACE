-- Add metadata column to store platform-specific fields
ALTER TABLE social_media_listings 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN social_media_listings.metadata IS 'Platform-specific fields like monetization_status, engagement_rate, niche, etc.';