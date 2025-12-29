-- Fix the search_path security issue for the is_admin_wallet function
CREATE OR REPLACE FUNCTION public.is_admin_wallet(wallet_address text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT wallet_address = '96HvKxa7FzbSsSK2nD4Yc1AtdMNUUUoqb37dyNKNJsrV'
$$;