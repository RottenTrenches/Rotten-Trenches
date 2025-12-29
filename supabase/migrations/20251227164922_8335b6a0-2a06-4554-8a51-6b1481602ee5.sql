-- Add last_vote_at column to kol_votes for rate limiting
ALTER TABLE public.kol_votes 
ADD COLUMN IF NOT EXISTS last_vote_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop the existing vote_for_kol function and replace with rate-limited version
CREATE OR REPLACE FUNCTION public.vote_for_kol(p_kol_id uuid, p_wallet_address text, p_vote_type text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_vote_id uuid;
  v_existing_vote_type text;
  v_last_vote_at timestamp with time zone;
  v_old_delta numeric;
  v_new_delta numeric;
  v_kol_record record;
  v_result json;
  v_minutes_since_last_vote numeric;
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

  -- Check for existing vote and rate limit (15 minutes)
  SELECT id, vote_type, COALESCE(last_vote_at, created_at) INTO v_existing_vote_id, v_existing_vote_type, v_last_vote_at
  FROM public.kol_votes 
  WHERE kol_id = p_kol_id AND wallet_address = p_wallet_address;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Check rate limit
    v_minutes_since_last_vote := EXTRACT(EPOCH FROM (now() - v_last_vote_at)) / 60;
    
    IF v_minutes_since_last_vote < 15 THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Rate limited', 
        'cooldown_remaining', CEIL(15 - v_minutes_since_last_vote)
      );
    END IF;
  END IF;

  -- Calculate deltas
  v_new_delta := CASE WHEN p_vote_type = 'up' THEN 0.1 ELSE -0.1 END;

  IF v_existing_vote_id IS NOT NULL THEN
    -- User already voted - update their vote
    IF v_existing_vote_type = p_vote_type THEN
      -- Same vote type, just update the timestamp
      UPDATE public.kol_votes 
      SET last_vote_at = now() 
      WHERE id = v_existing_vote_id;
      
      -- Apply the vote effect again
      UPDATE public.kols 
      SET rating = GREATEST(0, LEAST(5, COALESCE(rating, 0) + v_new_delta))
      WHERE id = p_kol_id;
    ELSE
      -- Different vote - reverse old delta and apply new
      v_old_delta := CASE WHEN v_existing_vote_type = 'up' THEN 0.1 ELSE -0.1 END;
      
      UPDATE public.kol_votes 
      SET vote_type = p_vote_type, last_vote_at = now()
      WHERE id = v_existing_vote_id;
      
      UPDATE public.kols 
      SET rating = GREATEST(0, LEAST(5, COALESCE(rating, 0) - v_old_delta + v_new_delta))
      WHERE id = p_kol_id;
    END IF;
  ELSE
    -- New vote
    INSERT INTO public.kol_votes (kol_id, wallet_address, vote_type, last_vote_at)
    VALUES (p_kol_id, p_wallet_address, p_vote_type, now());
    
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
$function$;