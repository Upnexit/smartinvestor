
-- 1) Add daily_task_limit to distributors
ALTER TABLE public.distributors
  ADD COLUMN IF NOT EXISTS daily_task_limit int NOT NULL DEFAULT 5;

-- 2) Track distributor-created link_tasks
ALTER TABLE public.link_tasks
  ADD COLUMN IF NOT EXISTS created_by_distributor uuid NULL;
CREATE INDEX IF NOT EXISTS idx_link_tasks_created_by_distributor
  ON public.link_tasks(created_by_distributor);

-- 3) distributor_tasks — draft/verification staging area
CREATE TABLE IF NOT EXISTS public.distributor_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  title text NOT NULL,
  fb_page_url text NOT NULL,
  action_type text NOT NULL DEFAULT 'like',
  reward numeric NOT NULL DEFAULT 0,
  instruction text,
  status text NOT NULL DEFAULT 'draft', -- draft | verified | published | rejected
  published_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  published_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_tasks TO authenticated;
GRANT ALL ON public.distributor_tasks TO service_role;
ALTER TABLE public.distributor_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distributor_tasks_owner" ON public.distributor_tasks
  FOR ALL TO authenticated
  USING (distributor_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'))
  WITH CHECK (distributor_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE INDEX IF NOT EXISTS idx_distributor_tasks_dist ON public.distributor_tasks(distributor_id, status, created_at DESC);

-- 4) distributor_leads — mini CRM
CREATE TABLE IF NOT EXISTS public.distributor_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  source text,
  status text NOT NULL DEFAULT 'new', -- new | contacted | interested | converted | dropped
  next_followup_at timestamptz,
  notes text,
  converted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_leads TO authenticated;
GRANT ALL ON public.distributor_leads TO service_role;
ALTER TABLE public.distributor_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distributor_leads_owner" ON public.distributor_leads
  FOR ALL TO authenticated
  USING (distributor_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'))
  WITH CHECK (distributor_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE INDEX IF NOT EXISTS idx_distributor_leads_dist ON public.distributor_leads(distributor_id, status, created_at DESC);
CREATE TRIGGER trg_distributor_leads_updated_at BEFORE UPDATE ON public.distributor_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) distributor_earnings — track withdrawal-tax & bonus commission
CREATE TABLE IF NOT EXISTS public.distributor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  source text NOT NULL, -- withdrawal_tax | weekly_target | manual
  amount numeric NOT NULL,
  related_user_id uuid,
  related_withdrawal_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_earnings TO authenticated;
GRANT ALL ON public.distributor_earnings TO service_role;
ALTER TABLE public.distributor_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distributor_earnings_owner_read" ON public.distributor_earnings
  FOR SELECT TO authenticated
  USING (distributor_id = (select auth.uid()) OR public.has_role((select auth.uid()),'admin'));
CREATE POLICY "distributor_earnings_admin_write" ON public.distributor_earnings
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()),'admin'))
  WITH CHECK (public.has_role((select auth.uid()),'admin'));
CREATE INDEX IF NOT EXISTS idx_distributor_earnings_dist ON public.distributor_earnings(distributor_id, created_at DESC);

-- 6) Update admin_review_withdrawal to credit distributor 2% (from fee)
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.withdrawals;
  v_bal numeric;
  v_debit numeric;
  v_dist uuid;
  v_tax numeric;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdrawal not found';
  END IF;

  IF _action = 'approve' THEN
    SELECT COALESCE(balance, 0) INTO v_bal FROM public.profiles WHERE id = v_row.user_id FOR UPDATE;
    v_debit := COALESCE(v_row.gross_amount, v_row.amount, 0);
    IF v_bal < v_debit THEN
      RAISE EXCEPTION 'insufficient balance (available: %, requested: %)', v_bal, v_debit;
    END IF;

    UPDATE public.profiles
      SET balance = GREATEST(COALESCE(balance, 0) - v_debit, 0)
      WHERE id = v_row.user_id;

    UPDATE public.withdrawals
      SET status = 'approved', note = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;

    -- credit distributor with the 2% service fee
    SELECT distributor_id INTO v_dist FROM public.profiles WHERE id = v_row.user_id;
    v_tax := COALESCE(v_row.fee, 0);
    IF v_dist IS NOT NULL AND v_tax > 0 THEN
      INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
      VALUES (v_dist, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
      UPDATE public.distributors
        SET balance = COALESCE(balance,0) + v_tax,
            total_earned = COALESCE(total_earned,0) + v_tax,
            updated_at = now()
        WHERE user_id = v_dist;
    END IF;

  ELSIF _action = 'reject' THEN
    UPDATE public.withdrawals
      SET status = 'rejected', note = _note, rejection_reason = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  RETURN v_row;
END;
$function$;
