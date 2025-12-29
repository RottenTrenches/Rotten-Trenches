-- Add auth_user_id to user_profiles to link with Supabase Auth
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on auth_user_id
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_auth_user_id_idx ON public.user_profiles(auth_user_id);

-- Create unique index on wallet_address to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_wallet_address_idx ON public.user_profiles(wallet_address);

-- Drop existing permissive UPDATE policy on user_profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create secure UPDATE policy that requires auth
CREATE POLICY "Authenticated users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Create secure INSERT policy that requires auth
CREATE POLICY "Authenticated users can insert own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Update kol_comments policies for authenticated users
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.kol_comments;

CREATE POLICY "Authenticated users can insert comments"
ON public.kol_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.wallet_address = kol_comments.wallet_address
    AND user_profiles.auth_user_id = auth.uid()
  )
);

-- Update bounties policies for authenticated users
DROP POLICY IF EXISTS "Anyone can insert bounties" ON public.bounties;

CREATE POLICY "Authenticated users can insert bounties"
ON public.bounties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.wallet_address = bounties.wallet_address
    AND user_profiles.auth_user_id = auth.uid()
  )
);

-- Update bounty_submissions policies for authenticated users
DROP POLICY IF EXISTS "Anyone can submit to bounties" ON public.bounty_submissions;

CREATE POLICY "Authenticated users can submit to bounties"
ON public.bounty_submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.wallet_address = bounty_submissions.wallet_address
    AND user_profiles.auth_user_id = auth.uid()
  )
);

-- Update kols table INSERT policy
DROP POLICY IF EXISTS "Anyone can insert kols" ON public.kols;

CREATE POLICY "Authenticated users can insert kols"
ON public.kols FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update user_friends policies for authenticated users
DROP POLICY IF EXISTS "Users can add friends" ON public.user_friends;

CREATE POLICY "Authenticated users can add friends"
ON public.user_friends FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.wallet_address = user_friends.user_wallet
    AND user_profiles.auth_user_id = auth.uid()
  )
);

-- Update wallet_verifications policies
DROP POLICY IF EXISTS "Anyone can insert wallet verifications" ON public.wallet_verifications;

CREATE POLICY "Authenticated users can insert wallet verifications"
ON public.wallet_verifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.wallet_address = wallet_verifications.verified_by_wallet
    AND user_profiles.auth_user_id = auth.uid()
  )
);