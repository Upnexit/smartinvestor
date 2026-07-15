
-- Add per-user targeting to notices, and a helper to auto-create a single-user "missed daily task" notice.
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS notices_target_user_ids_gin
  ON public.notices USING gin (target_user_ids);

-- Update admin_save_notice to accept target_user_ids in the patch.
CREATE OR REPLACE FUNCTION public.admin_save_notice(_actor uuid, _id uuid, _patch jsonb)
 RETURNS public.notices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.notices;
  v_priority text;
  v_target_package_ids uuid[];
  v_target_user_ids uuid[];
  v_all boolean;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  v_priority := COALESCE(NULLIF(_patch->>'priority', ''), 'info');
  IF v_priority NOT IN ('info', 'warning', 'critical') THEN v_priority := 'info'; END IF;

  SELECT COALESCE(array_agg(value::uuid), '{}'::uuid[]) INTO v_target_package_ids
  FROM jsonb_array_elements_text(COALESCE(_patch->'target_package_ids', '[]'::jsonb)) AS value;

  SELECT COALESCE(array_agg(value::uuid), '{}'::uuid[]) INTO v_target_user_ids
  FROM jsonb_array_elements_text(COALESCE(_patch->'target_user_ids', '[]'::jsonb)) AS value;

  v_all := COALESCE((_patch->>'target_all_users')::boolean, false);

  IF COALESCE(NULLIF(trim(_patch->>'title'), ''), '') = '' THEN RAISE EXCEPTION 'Title is required'; END IF;
  IF COALESCE(NULLIF(trim(_patch->>'body'), ''), '') = '' THEN RAISE EXCEPTION 'Body is required'; END IF;

  IF _id IS NULL THEN
    INSERT INTO public.notices (
      title, body, priority, target_package_ids, target_user_ids,
      target_all_users, published, expires_at, created_by
    ) VALUES (
      trim(_patch->>'title'),
      trim(_patch->>'body'),
      v_priority,
      CASE WHEN v_all THEN '{}'::uuid[] ELSE v_target_package_ids END,
      CASE WHEN v_all THEN '{}'::uuid[] ELSE v_target_user_ids END,
      v_all,
      COALESCE((_patch->>'published')::boolean, true),
      NULLIF(_patch->>'expires_at', '')::timestamptz,
      _actor
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.notices SET
      title = trim(COALESCE(_patch->>'title', title)),
      body = trim(COALESCE(_patch->>'body', body)),
      priority = v_priority,
      target_package_ids = CASE WHEN COALESCE((_patch->>'target_all_users')::boolean, target_all_users) THEN '{}'::uuid[] ELSE v_target_package_ids END,
      target_user_ids = CASE WHEN COALESCE((_patch->>'target_all_users')::boolean, target_all_users) THEN '{}'::uuid[] ELSE v_target_user_ids END,
      target_all_users = COALESCE((_patch->>'target_all_users')::boolean, target_all_users),
      published = COALESCE((_patch->>'published')::boolean, published),
      expires_at = CASE WHEN _patch ? 'expires_at' THEN NULLIF(_patch->>'expires_at', '')::timestamptz ELSE expires_at END
    WHERE id = _id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'notice not found'; END IF;
  END IF;

  RETURN v_row;
END;
$function$;

-- Telegram recipients: include per-user targets too.
CREATE OR REPLACE FUNCTION public.telegram_notice_recipients(
  _actor uuid,
  _target_all_users boolean,
  _target_package_ids uuid[] DEFAULT '{}'::uuid[],
  _target_user_ids uuid[] DEFAULT '{}'::uuid[]
)
 RETURNS TABLE(user_id uuid, chat_id bigint, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.telegram_chat_id, p.full_name
  FROM public.profiles p
  WHERE public.has_role(_actor, 'admin'::public.app_role)
    AND p.telegram_chat_id IS NOT NULL
    AND (
      _target_all_users
      OR (COALESCE(array_length(_target_user_ids, 1), 0) > 0 AND p.id = ANY(_target_user_ids))
      OR EXISTS (
        SELECT 1 FROM public.user_packages up
        WHERE up.user_id = p.id AND up.status = 'active'
          AND up.package_id = ANY(COALESCE(_target_package_ids, '{}'::uuid[]))
      )
    )
  LIMIT 5000;
$function$;

-- Admin helper: create a single-user "missed daily task" notice in one call.
CREATE OR REPLACE FUNCTION public.admin_send_missed_task_notice(
  _actor uuid, _user_id uuid, _bd_date date
)
 RETURNS public.notices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.notices;
  v_name text;
  v_title text;
  v_body text;
  v_expires timestamptz;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = _user_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  v_title := '⚠️ দৈনিক টাস্ক অসম্পূর্ণ — সতর্কতা';
  v_body := format(
    'প্রিয় %s,%s%sআপনি %s তারিখে আপনার দৈনিক টাস্ক সম্পূর্ণ করেননি। প্রতিদিন নির্ধারিত টাস্ক সম্পন্ন না করলে আপনার আয় এবং প্যাকেজের সুবিধা ক্ষতিগ্রস্ত হতে পারে।%s%sঅনুগ্রহ করে আজই লগইন করে বাকি টাস্ক সম্পন্ন করুন। ধন্যবাদ।',
    COALESCE(NULLIF(trim(v_name), ''), 'সদস্য'),
    E'\n', E'\n',
    to_char(COALESCE(_bd_date, (now() AT TIME ZONE 'Asia/Dhaka')::date), 'DD Mon YYYY'),
    E'\n', E'\n'
  );
  v_expires := now() + interval '3 days';

  INSERT INTO public.notices (
    title, body, priority, target_package_ids, target_user_ids,
    target_all_users, published, expires_at, created_by
  ) VALUES (
    v_title, v_body, 'warning',
    '{}'::uuid[], ARRAY[_user_id]::uuid[],
    false, true, v_expires, _actor
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
