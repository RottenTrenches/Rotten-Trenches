-- Add worn_badge column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN worn_badge TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.user_profiles.worn_badge IS 'Achievement badge ID that the user has chosen to display';