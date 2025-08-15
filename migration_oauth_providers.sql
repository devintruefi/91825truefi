-- Add OAuth provider columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider_id ON users(oauth_provider, oauth_id);

-- Make password_hash nullable for OAuth users (they don't need passwords)
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add constraint to ensure either password_hash or oauth_provider is present
ALTER TABLE users 
ADD CONSTRAINT check_auth_method 
CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL);