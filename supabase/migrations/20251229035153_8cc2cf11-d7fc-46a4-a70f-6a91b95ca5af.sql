-- ==============================================
-- FIX SECURITY ISSUE: Permissive DELETE Policies
-- ==============================================
-- This migration:
-- 1. Drops overly permissive DELETE policies (USING (true))
-- 2. Creates SECURITY DEFINER functions that validate wallet ownership
-- 3. Restricts DELETE operations to require wallet matching

-- ==============================================
-- Step 1: Create SECURITY DEFINER functions for authenticated deletes
-- ==============================================

-- Function to delete a comment (only comment owner can delete)
CREATE OR REPLACE FUNCTION public.delete_comment(
  p_comment_id uuid,
  p_wallet_address text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_wallet text;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if comment exists and belongs to the wallet
  SELECT wallet_address INTO v_comment_wallet
  FROM public.kol_comments
  WHERE id = p_comment_id;

  IF v_comment_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Comment not found');
  END IF;

  IF v_comment_wallet != p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to delete this comment');
  END IF;

  -- Delete the comment
  DELETE FROM public.kol_comments WHERE id = p_comment_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to remove a friend (only the user who added can remove)
CREATE OR REPLACE FUNCTION public.remove_friend(
  p_user_wallet text,
  p_friend_wallet text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Validate inputs
  IF p_user_wallet IS NULL OR p_user_wallet = '' THEN
    RETURN json_build_object('success', false, 'error', 'User wallet address required');
  END IF;

  IF p_friend_wallet IS NULL OR p_friend_wallet = '' THEN
    RETURN json_build_object('success', false, 'error', 'Friend wallet address required');
  END IF;

  -- Check if friendship exists
  SELECT id INTO v_existing_id
  FROM public.user_friends
  WHERE user_wallet = p_user_wallet AND friend_wallet = p_friend_wallet;

  IF v_existing_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Friendship not found');
  END IF;

  -- Delete the friendship
  DELETE FROM public.user_friends WHERE id = v_existing_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to delete a bounty submission (only submission owner or bounty creator can delete)
CREATE OR REPLACE FUNCTION public.delete_bounty_submission(
  p_submission_id uuid,
  p_wallet_address text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_wallet text;
  v_bounty_creator_wallet text;
  v_bounty_id uuid;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Get submission details
  SELECT wallet_address, bounty_id INTO v_submission_wallet, v_bounty_id
  FROM public.bounty_submissions
  WHERE id = p_submission_id;

  IF v_submission_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found');
  END IF;

  -- Get bounty creator
  SELECT wallet_address INTO v_bounty_creator_wallet
  FROM public.bounties
  WHERE id = v_bounty_id;

  -- Check authorization: submission owner OR bounty creator
  IF v_submission_wallet != p_wallet_address AND v_bounty_creator_wallet != p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to delete this submission');
  END IF;

  -- Delete the submission
  DELETE FROM public.bounty_submissions WHERE id = p_submission_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ==============================================
-- Step 2: Update DELETE policies to be restrictive
-- ==============================================

-- Drop existing permissive DELETE policies
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.kol_comments;
DROP POLICY IF EXISTS "Users can remove their own friends" ON public.user_friends;
DROP POLICY IF EXISTS "Allow submission deletes" ON public.bounty_submissions;

-- Create restrictive DELETE policies (deny all direct deletes, force use of SECURITY DEFINER functions)
CREATE POLICY "Deny direct comment deletes"
ON public.kol_comments
FOR DELETE
USING (false);

CREATE POLICY "Deny direct friend deletes"
ON public.user_friends
FOR DELETE
USING (false);

CREATE POLICY "Deny direct submission deletes"
ON public.bounty_submissions
FOR DELETE
USING (false);