-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (wallet_address, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_wallet_address TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE wallet_address = _wallet_address
      AND role = _role
  )
$$;

-- RLS: Anyone can read roles (needed for UI checks)
CREATE POLICY "Anyone can read user roles"
ON public.user_roles
FOR SELECT
USING (true);

-- RLS: Only admins can insert roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(current_setting('request.jwt.claims', true)::json->>'wallet_address', 'admin'));

-- RLS: Only admins can delete roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(current_setting('request.jwt.claims', true)::json->>'wallet_address', 'admin'));

-- Insert admin role for the specified wallet
INSERT INTO public.user_roles (wallet_address, role)
VALUES ('96HvKxa7FzbSsSK2nD4Yc1AtdMNUUoqb37dyNKNJsrV', 'admin');