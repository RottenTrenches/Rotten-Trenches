-- Create wallet verification table to track verified wallets
CREATE TABLE public.wallet_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_id UUID NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  verified_by_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kol_id, wallet_address)
);

-- Create monthly PNL snapshots table
CREATE TABLE public.kol_pnl_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_id UUID NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: "2025-01"
  pnl_sol NUMERIC DEFAULT 0,
  pnl_usd NUMERIC DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kol_id, wallet_address, month_year)
);

-- Add is_wallet_verified column to kols table
ALTER TABLE public.kols ADD COLUMN IF NOT EXISTS is_wallet_verified BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.wallet_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kol_pnl_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_verifications
CREATE POLICY "Anyone can read wallet verifications" 
ON public.wallet_verifications 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert wallet verifications" 
ON public.wallet_verifications 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for kol_pnl_snapshots
CREATE POLICY "Anyone can read PNL snapshots" 
ON public.kol_pnl_snapshots 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert PNL snapshots" 
ON public.kol_pnl_snapshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update PNL snapshots" 
ON public.kol_pnl_snapshots 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_pnl_snapshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kol_pnl_snapshots_updated_at
BEFORE UPDATE ON public.kol_pnl_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_pnl_snapshot_updated_at();