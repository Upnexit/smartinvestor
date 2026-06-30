
-- Add featured flag + default duration
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.packages ALTER COLUMN duration_days SET DEFAULT 45;

-- Update admin_save_package to support featured
CREATE OR REPLACE FUNCTION public.admin_save_package(_actor uuid, _id uuid, _patch jsonb)
RETURNS public.packages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.packages (name, price, daily_income, daily_tasks, duration_days, image_url, active, description, featured, sort_order)
    VALUES (
      _patch->>'name',
      COALESCE((_patch->>'price')::numeric,0),
      COALESCE((_patch->>'daily_income')::numeric,(_patch->>'daily_earning')::numeric,0),
      COALESCE((_patch->>'daily_tasks')::int,(_patch->>'daily_task_limit')::int,0),
      COALESCE((_patch->>'duration_days')::int,45),
      _patch->>'image_url',
      COALESCE((_patch->>'active')::boolean,true),
      _patch->>'description',
      COALESCE((_patch->>'featured')::boolean,false),
      COALESCE((_patch->>'sort_order')::int,0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.packages SET
      name = COALESCE(_patch->>'name', name),
      price = COALESCE((_patch->>'price')::numeric, price),
      daily_income = COALESCE((_patch->>'daily_income')::numeric, (_patch->>'daily_earning')::numeric, daily_income),
      daily_tasks = COALESCE((_patch->>'daily_tasks')::int, (_patch->>'daily_task_limit')::int, daily_tasks),
      duration_days = COALESCE((_patch->>'duration_days')::int, duration_days),
      image_url = COALESCE(_patch->>'image_url', image_url),
      active = COALESCE((_patch->>'active')::boolean, active),
      description = COALESCE(_patch->>'description', description),
      featured = COALESCE((_patch->>'featured')::boolean, featured),
      sort_order = COALESCE((_patch->>'sort_order')::int, sort_order)
    WHERE id = _id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;$$;

-- Background job: auto-expire user_packages after duration
CREATE OR REPLACE FUNCTION public.expire_user_packages()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_packages SET status='expired'
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now();
$$;
