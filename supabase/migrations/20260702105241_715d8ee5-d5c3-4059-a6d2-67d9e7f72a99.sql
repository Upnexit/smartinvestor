
-- Distributor applications table
CREATE TABLE public.distributor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  father_name text,
  phone text NOT NULL,
  email text NOT NULL,
  division text,
  district text NOT NULL,
  thana text NOT NULL,
  address text NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'bkash',
  payment_number text NOT NULL,
  experience text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.distributor_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.distributor_applications TO authenticated;
GRANT ALL ON public.distributor_applications TO service_role;

ALTER TABLE public.distributor_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit an application
CREATE POLICY "Anyone can submit application" ON public.distributor_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only admins can view / update / delete
CREATE POLICY "Admins view applications" ON public.distributor_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications" ON public.distributor_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete applications" ON public.distributor_applications
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_distributor_applications_updated
  BEFORE UPDATE ON public.distributor_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_distributor_applications_status ON public.distributor_applications(status, created_at DESC);

-- Realtime
ALTER TABLE public.distributor_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distributor_applications;
