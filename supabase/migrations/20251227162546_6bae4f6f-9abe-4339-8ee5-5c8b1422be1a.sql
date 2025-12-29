-- Add unique constraint for upsert on kol_pnl_snapshots
ALTER TABLE public.kol_pnl_snapshots 
ADD CONSTRAINT kol_pnl_snapshots_kol_id_month_year_unique 
UNIQUE (kol_id, month_year);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;