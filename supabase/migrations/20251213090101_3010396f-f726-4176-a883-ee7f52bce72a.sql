-- Create clubs table
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create club_members table (one club per user)
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create club_requests table for pending club creation requests
CREATE TABLE public.club_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_name TEXT NOT NULL,
  description TEXT,
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_requests ENABLE ROW LEVEL SECURITY;

-- Clubs policies
CREATE POLICY "Anyone can view approved clubs"
ON public.clubs
FOR SELECT
USING (is_approved = true);

CREATE POLICY "Club creator can view their pending club"
ON public.clubs
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create clubs"
ON public.clubs
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club admins can update their club"
ON public.clubs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = clubs.id
    AND club_members.user_id = auth.uid()
    AND club_members.role = 'admin'
  )
);

-- Club members policies
CREATE POLICY "Anyone can view club members"
ON public.club_members
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join clubs"
ON public.club_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
ON public.club_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Club admins can remove members"
ON public.club_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_members.club_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- Club requests policies
CREATE POLICY "Authenticated users can view their requests"
ON public.club_requests
FOR SELECT
USING (auth.uid() = requested_by);

CREATE POLICY "Authenticated users can create requests"
ON public.club_requests
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

-- Create trigger for updated_at on clubs
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Storage policies for club logos
CREATE POLICY "Club logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'club-logos');

CREATE POLICY "Club admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'club-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Club admins can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'club-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Club admins can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'club-logos' AND auth.uid() IS NOT NULL);