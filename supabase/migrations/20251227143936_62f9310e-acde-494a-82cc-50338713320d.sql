-- Add categories array to kols table
ALTER TABLE public.kols 
ADD COLUMN categories text[] DEFAULT '{}';

-- Create index for faster category filtering
CREATE INDEX idx_kols_categories ON public.kols USING GIN(categories);

-- Update RLS policy to allow updates to categories (via vote_for_kol function or admin)
CREATE POLICY "Anyone can update kols rating" 
ON public.kols 
FOR UPDATE 
USING (true)
WITH CHECK (true);