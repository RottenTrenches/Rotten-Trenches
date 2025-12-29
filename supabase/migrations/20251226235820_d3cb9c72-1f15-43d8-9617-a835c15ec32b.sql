-- Fix 1: Drop overly permissive UPDATE policies
DROP POLICY IF EXISTS "Anyone can update kols" ON public.kols;
DROP POLICY IF EXISTS "Anyone can update votes" ON public.kol_votes;

-- Fix 2: Add explicit deny UPDATE policy for bounties (creator-only update not needed currently)
CREATE POLICY "Deny all updates on bounties" ON public.bounties 
FOR UPDATE USING (false);

-- Fix 3: Add explicit deny DELETE policies for all tables
CREATE POLICY "Deny all deletes on bounties" ON public.bounties 
FOR DELETE USING (false);

CREATE POLICY "Deny all deletes on kols" ON public.kols 
FOR DELETE USING (false);

CREATE POLICY "Deny all deletes on kol_votes" ON public.kol_votes 
FOR DELETE USING (false);

CREATE POLICY "Deny all deletes on kol_comments" ON public.kol_comments 
FOR DELETE USING (false);

-- Fix 4: Create secure voting function that handles all rating calculations server-side
CREATE OR REPLACE FUNCTION public.vote_for_kol(
  p_kol_id uuid,
  p_wallet_address text,
  p_vote_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_vote_id uuid;
  v_existing_vote_type text;
  v_old_delta numeric;
  v_new_delta numeric;
  v_kol_record record;
  v_result json;
BEGIN
  -- Validate inputs
  IF p_vote_type NOT IN ('up', 'down') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid vote type');
  END IF;
  
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if KOL exists
  SELECT id, rating, total_votes INTO v_kol_record
  FROM public.kols WHERE id = p_kol_id;
  
  IF v_kol_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'KOL not found');
  END IF;

  -- Check for existing vote
  SELECT id, vote_type INTO v_existing_vote_id, v_existing_vote_type
  FROM public.kol_votes 
  WHERE kol_id = p_kol_id AND wallet_address = p_wallet_address;

  -- Calculate deltas
  v_new_delta := CASE WHEN p_vote_type = 'up' THEN 0.1 ELSE -0.1 END;

  IF v_existing_vote_id IS NOT NULL THEN
    -- User already voted - update their vote
    IF v_existing_vote_type = p_vote_type THEN
      -- Same vote, no change needed
      RETURN json_build_object('success', true, 'message', 'Vote unchanged');
    END IF;
    
    -- Different vote - reverse old delta and apply new
    v_old_delta := CASE WHEN v_existing_vote_type = 'up' THEN 0.1 ELSE -0.1 END;
    
    UPDATE public.kol_votes 
    SET vote_type = p_vote_type 
    WHERE id = v_existing_vote_id;
    
    UPDATE public.kols 
    SET rating = GREATEST(0, LEAST(5, COALESCE(rating, 0) - v_old_delta + v_new_delta))
    WHERE id = p_kol_id;
  ELSE
    -- New vote
    INSERT INTO public.kol_votes (kol_id, wallet_address, vote_type)
    VALUES (p_kol_id, p_wallet_address, p_vote_type);
    
    UPDATE public.kols 
    SET 
      rating = GREATEST(0, LEAST(5, COALESCE(rating, 0) + v_new_delta)),
      total_votes = COALESCE(total_votes, 0) + 1
    WHERE id = p_kol_id;
  END IF;

  -- Return updated KOL data
  SELECT json_build_object(
    'success', true,
    'rating', rating,
    'total_votes', total_votes
  ) INTO v_result
  FROM public.kols WHERE id = p_kol_id;
  
  RETURN v_result;
END;
$$;

-- Fix 5: Create secure function for updating KOL rating from comments
CREATE OR REPLACE FUNCTION public.update_kol_rating_from_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_rating numeric;
BEGIN
  -- Calculate average rating from all comments with ratings
  SELECT AVG(rating)::numeric INTO v_avg_rating
  FROM public.kol_comments
  WHERE kol_id = NEW.kol_id AND rating IS NOT NULL AND rating > 0;
  
  -- Update KOL rating if we have valid ratings
  IF v_avg_rating IS NOT NULL THEN
    UPDATE public.kols
    SET rating = ROUND(v_avg_rating, 1)
    WHERE id = NEW.kol_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic rating updates from comments
DROP TRIGGER IF EXISTS update_kol_rating_on_comment ON public.kol_comments;
CREATE TRIGGER update_kol_rating_on_comment
AFTER INSERT ON public.kol_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_kol_rating_from_comment();

-- Grant execute permission on the voting function
GRANT EXECUTE ON FUNCTION public.vote_for_kol(uuid, text, text) TO anon, authenticated;