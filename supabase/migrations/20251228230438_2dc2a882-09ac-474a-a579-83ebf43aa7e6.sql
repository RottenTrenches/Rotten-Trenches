-- Add upvotes and downvotes columns if they don't exist
ALTER TABLE public.kols ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0;
ALTER TABLE public.kols ADD COLUMN IF NOT EXISTS downvotes integer DEFAULT 0;

-- Sync upvotes from vote history
UPDATE public.kols k
SET upvotes = COALESCE((
  SELECT COUNT(*) 
  FROM public.kol_votes v 
  WHERE v.kol_id = k.id AND v.vote_type = 'up'
), 0);

-- Sync downvotes from vote history
UPDATE public.kols k
SET downvotes = COALESCE((
  SELECT COUNT(*) 
  FROM public.kol_votes v 
  WHERE v.kol_id = k.id AND v.vote_type = 'down'
), 0);