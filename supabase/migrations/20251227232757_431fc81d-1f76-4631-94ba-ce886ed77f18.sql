-- Add unique constraint for upsert to work
ALTER TABLE public.kol_pnl_snapshots 
ADD CONSTRAINT kol_pnl_snapshots_kol_month_unique UNIQUE (kol_id, month_year);