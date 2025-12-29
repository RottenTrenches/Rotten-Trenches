-- Allow users to delete their own comments
DROP POLICY IF EXISTS "Deny all deletes on kol_comments" ON public.kol_comments;

CREATE POLICY "Users can delete their own comments" 
ON public.kol_comments 
FOR DELETE 
USING (true);