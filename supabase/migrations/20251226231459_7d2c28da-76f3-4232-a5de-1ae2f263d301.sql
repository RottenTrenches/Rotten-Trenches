-- Create KOLs table for user-submitted KOLs
CREATE TABLE public.kols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  twitter_handle TEXT NOT NULL,
  profile_pic_url TEXT,
  wallet_address TEXT,
  rating NUMERIC DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.kol_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_id UUID NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kol_id, wallet_address)
);

-- Create comments table
CREATE TABLE public.kol_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_id UUID NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bounties table
CREATE TABLE public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.kols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kol_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kol_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- KOLs policies - anyone can read, anyone can insert
CREATE POLICY "Anyone can read kols" ON public.kols FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kols" ON public.kols FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kols" ON public.kols FOR UPDATE USING (true);

-- Votes policies - anyone can read and vote
CREATE POLICY "Anyone can read votes" ON public.kol_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote" ON public.kol_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON public.kol_votes FOR UPDATE USING (true);

-- Comments policies
CREATE POLICY "Anyone can read comments" ON public.kol_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.kol_comments FOR INSERT WITH CHECK (true);

-- Bounties policies
CREATE POLICY "Anyone can read bounties" ON public.bounties FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bounties" ON public.bounties FOR INSERT WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.kols;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kol_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kol_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bounties;