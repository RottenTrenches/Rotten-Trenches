-- Add unique constraint for kol_pnl_snapshots on kol_id and month_year
ALTER TABLE public.kol_pnl_snapshots 
ADD CONSTRAINT kol_pnl_snapshots_kol_id_month_year_key UNIQUE (kol_id, month_year);