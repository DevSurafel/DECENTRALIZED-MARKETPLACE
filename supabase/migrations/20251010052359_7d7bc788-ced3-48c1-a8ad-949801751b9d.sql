-- Add column for multiple screenshots
ALTER TABLE social_media_listings 
ADD COLUMN screenshot_urls text[] DEFAULT '{}';

-- Migrate existing screenshot_url to screenshot_urls array
UPDATE social_media_listings 
SET screenshot_urls = ARRAY[screenshot_url]
WHERE screenshot_url IS NOT NULL AND screenshot_url != '';