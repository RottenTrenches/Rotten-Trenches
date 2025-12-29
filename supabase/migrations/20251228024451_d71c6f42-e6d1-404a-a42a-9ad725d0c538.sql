-- Create storage bucket for bounty images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bounty-images', 'bounty-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to bounty images
CREATE POLICY "Public read access for bounty images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bounty-images');

-- Allow authenticated users to upload bounty images
CREATE POLICY "Users can upload bounty images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bounty-images');