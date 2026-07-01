
CREATE TABLE public.distributor_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL DEFAULT 'bkash',
  account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.distributor_withdrawals TO authenticated;
GRANT ALL ON public.distributor_withdrawals TO service_role;

ALTER TABLE public.distributor_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributor sees own withdrawals"
  ON public.distributor_withdrawals FOR SELECT TO authenticated
  USING (distributor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Distributor creates own withdrawal"
  ON public.distributor_withdrawals FOR INSERT TO authenticated
  WITH CHECK (distributor_id = auth.uid() AND public.has_role(auth.uid(),'distributor'));

CREATE POLICY "Admin manages withdrawals"
  ON public.distributor_withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER dw_set_updated_at BEFORE UPDATE ON public.distributor_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent withdrawal above available balance at insert
CREATE OR REPLACE FUNCTION public.distributor_withdrawal_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal numeric;
BEGIN
  SELECT balance INTO v_bal FROM public.distributors WHERE user_id = NEW.distributor_id;
  IF COALESCE(v_bal,0) < NEW.amount THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER dw_check_balance BEFORE INSERT ON public.distributor_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.distributor_withdrawal_guard();
