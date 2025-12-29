-- Create storage bucket for KOL profile pictures and review images
INSERT INTO storage.buckets (id, name, public) VALUES ('kol-images', 'kol-images', true);

-- Create policies for the bucket
CREATE POLICY "Anyone can view kol images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'kol-images');

CREATE POLICY "Anyone can upload kol images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'kol-images');

CREATE POLICY "Anyone can update kol images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'kol-images');

CREATE POLICY "Anyone can delete kol images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'kol-images');