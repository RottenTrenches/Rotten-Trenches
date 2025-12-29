-- Create SECURITY DEFINER functions for admin delete operations
-- These verify the wallet_address matches an admin in user_roles

-- Function to delete a bounty (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_bounty(p_bounty_id uuid, p_wallet_address text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- First delete related submissions
  DELETE FROM public.bounty_submissions WHERE bounty_id = p_bounty_id;
  
  -- Delete the bounty
  DELETE FROM public.bounties WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to delete a KOL (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_kol(p_kol_id uuid, p_wallet_address text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete related data first
  DELETE FROM public.kol_comments WHERE kol_id = p_kol_id;
  DELETE FROM public.kol_votes WHERE kol_id = p_kol_id;
  DELETE FROM public.kol_pnl_snapshots WHERE kol_id = p_kol_id;
  DELETE FROM public.wallet_verifications WHERE kol_id = p_kol_id;
  
  -- Delete the KOL
  DELETE FROM public.kols WHERE id = p_kol_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to delete a comment (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_comment_id uuid, p_wallet_address text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete the comment
  DELETE FROM public.kol_comments WHERE id = p_comment_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to delete a submission (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_submission(p_submission_id uuid, p_wallet_address text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete the submission
  DELETE FROM public.bounty_submissions WHERE id = p_submission_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Update RLS policies to deny direct deletes (force use of RPC functions)
DROP POLICY IF EXISTS "Admin can delete bounties" ON public.bounties;
CREATE POLICY "Deny direct bounty deletes" 
ON public.bounties 
FOR DELETE 
USING (false);

DROP POLICY IF EXISTS "Admin can delete kols" ON public.kols;
CREATE POLICY "Deny direct kol deletes" 
ON public.kols 
FOR DELETE 
USING (false);

-- Add DELETE policy for kol_votes (currently missing, needed for cascade delete via RPC)
DROP POLICY IF EXISTS "Deny all deletes on kol_votes" ON public.kol_votes;
CREATE POLICY "Deny direct vote deletes" 
ON public.kol_votes 
FOR DELETE 
USING (false);

-- Add DELETE policy for kol_pnl_snapshots (currently missing)
CREATE POLICY "Deny direct pnl snapshot deletes" 
ON public.kol_pnl_snapshots 
FOR DELETE 
USING (false);

-- Add DELETE policy for wallet_verifications (currently missing)
CREATE POLICY "Deny direct verification deletes" 
ON public.wallet_verifications 
FOR DELETE 
USING (false);