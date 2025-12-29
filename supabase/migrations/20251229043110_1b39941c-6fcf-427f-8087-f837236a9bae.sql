-- Fix 1: Block direct UPDATE on kol_votes table
-- All vote updates must go through vote_for_kol() RPC function which enforces rate limits
CREATE POLICY "Deny direct vote updates"
ON public.kol_votes
FOR UPDATE
USING (false);

COMMENT ON POLICY "Deny direct vote updates" ON public.kol_votes IS 
'All vote updates must go through vote_for_kol() RPC function which enforces rate limits and business logic';

-- Fix 2: Secure kol-images storage bucket
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can upload kol images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update kol images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete kol images" ON storage.objects;

-- Restrict uploads to authenticated users only
CREATE POLICY "Authenticated users can upload kol images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kol-images'
  AND auth.role() = 'authenticated'
);

-- Only file owners can update their own images  
CREATE POLICY "Users can update own kol images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'kol-images'
  AND auth.uid() = owner
);

-- Only file owners can delete their own images
CREATE POLICY "Users can delete own kol images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kol-images'
  AND auth.uid() = owner
);

-- Fix 3: Secure bounty-images storage bucket (less urgent but fixing now)
DROP POLICY IF EXISTS "Users can upload bounty images" ON storage.objects;

CREATE POLICY "Authenticated users can upload bounty images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bounty-images'
  AND auth.role() = 'authenticated'
);