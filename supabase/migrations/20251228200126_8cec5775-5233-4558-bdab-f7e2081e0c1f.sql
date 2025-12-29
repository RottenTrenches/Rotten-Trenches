-- Create user_friends table for friend relationships
CREATE TABLE public.user_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  friend_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_wallet, friend_wallet)
);

-- Enable Row Level Security
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read friends" 
ON public.user_friends 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add friends" 
ON public.user_friends 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can remove their own friends" 
ON public.user_friends 
FOR DELETE 
USING (true);

-- Index for faster lookups
CREATE INDEX idx_user_friends_user_wallet ON public.user_friends(user_wallet);
CREATE INDEX idx_user_friends_friend_wallet ON public.user_friends(friend_wallet);