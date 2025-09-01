-- Add dual URL support to bookmarks table
-- This allows for separate internal and external URLs like Homer's feature

-- Add the new columns
ALTER TABLE bookmarks ADD COLUMN internal_url TEXT;
ALTER TABLE bookmarks ADD COLUMN external_url TEXT;

-- Migrate existing url data to external_url for backward compatibility  
UPDATE bookmarks SET external_url = url WHERE external_url IS NULL;

-- Add indexes for the new URL columns
CREATE INDEX IF NOT EXISTS idx_bookmarks_internal_url ON bookmarks(internal_url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_external_url ON bookmarks(external_url);