-- Add trade_signature column to kol_comments for linking trades to reviews
ALTER TABLE public.kol_comments 
ADD COLUMN IF NOT EXISTS trade_signature text;