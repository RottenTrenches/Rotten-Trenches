-- Add parent_comment_id column to kol_comments for reply threading
ALTER TABLE public.kol_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.kol_comments(id) ON DELETE CASCADE;

-- Create index for efficient reply lookups
CREATE INDEX idx_kol_comments_parent ON public.kol_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;