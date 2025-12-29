-- Add is_verified and is_profile_public columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_profile_public boolean DEFAULT true;

-- Update existing verified users (those who have verified a KOL wallet that matches their connected wallet)
-- For now, users can verify themselves by verifying a KOL wallet they own