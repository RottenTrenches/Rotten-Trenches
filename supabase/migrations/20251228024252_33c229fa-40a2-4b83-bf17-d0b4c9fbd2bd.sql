-- Add image_url and expires_at columns to bounties table
ALTER TABLE public.bounties 
ADD COLUMN image_url TEXT,
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Create a function to clean up expired bounties
CREATE OR REPLACE FUNCTION public.cleanup_expired_bounties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bounties 
  WHERE expires_at IS NOT NULL 
    AND expires_at < now() 
    AND status = 'open';
END;
$$;