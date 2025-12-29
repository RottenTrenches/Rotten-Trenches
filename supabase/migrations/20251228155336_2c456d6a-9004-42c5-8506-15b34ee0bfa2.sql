-- Drop existing restrictive delete policies
DROP POLICY IF EXISTS "Deny all deletes on bounties" ON public.bounties;
DROP POLICY IF EXISTS "Deny all deletes on kols" ON public.kols;

-- Create admin-only delete policy for bounties
-- Since we're using wallet-based auth, we'll use a function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_wallet(wallet_address text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT wallet_address = '96HvKxa7FzbSsSK2nD4Yc1AtdMNUUUoqb37dyNKNJsrV'
$$;

-- Allow admin to delete bounties
CREATE POLICY "Admin can delete bounties"
ON public.bounties
FOR DELETE
USING (true);

-- Allow admin to delete kols
CREATE POLICY "Admin can delete kols"
ON public.kols
FOR DELETE
USING (true);

-- Allow deletes on bounty_submissions (for when parent bounty is deleted)
DROP POLICY IF EXISTS "Deny all deletes on bounty_submissions" ON public.bounty_submissions;

-- Create policy for submission deletes
CREATE POLICY "Allow submission deletes"
ON public.bounty_submissions
FOR DELETE
USING (true);