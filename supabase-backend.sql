-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

-- Helper function to verify admin role
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Admin can manage all job listings
CREATE POLICY "Admin full access on job listings"
ON public.job_listings
FOR ALL
USING (is_admin(auth.uid()));

-- Policy: Students and Alumni can view active job listings
CREATE POLICY "Users can view published job listings"
ON public.job_listings
FOR SELECT
USING (status = 'active');
