-- Create bounty_submissions table
CREATE TABLE public.bounty_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  content TEXT NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  creator_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read submissions
CREATE POLICY "Anyone can read submissions"
ON public.bounty_submissions
FOR SELECT
USING (true);

-- Anyone can submit to a bounty
CREATE POLICY "Anyone can submit to bounties"
ON public.bounty_submissions
FOR INSERT
WITH CHECK (true);

-- Bounty creator can update submission status
CREATE POLICY "Bounty creator can update submissions"
ON public.bounty_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bounties 
    WHERE bounties.id = bounty_submissions.bounty_id 
    AND bounties.wallet_address = bounty_submissions.wallet_address
  )
  OR wallet_address = (SELECT wallet_address FROM public.bounties WHERE id = bounty_id)
)
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_bounty_submissions_updated_at
BEFORE UPDATE ON public.bounty_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Add tx_signature column to bounties for tracking token transfers
ALTER TABLE public.bounties ADD COLUMN IF NOT EXISTS tx_signature TEXT;
ALTER TABLE public.bounties ADD COLUMN IF NOT EXISTS winner_wallet TEXT;

-- Update bounty status options
ALTER TABLE public.bounties DROP CONSTRAINT IF EXISTS bounties_status_check;
ALTER TABLE public.bounties ADD CONSTRAINT bounties_status_check 
CHECK (status IN ('open', 'in_review', 'completed', 'expired', 'cancelled'));