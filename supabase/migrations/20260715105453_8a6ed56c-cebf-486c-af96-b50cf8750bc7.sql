
-- Auto-send "missed daily task" notice for active-package users who haven't
-- done any task by 12:00 Asia/Dhaka. Runs daily via pg_cron.
CREATE OR REPLACE FUNCTION public.auto_send_missed_task_notices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_bd_date   date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_expires   timestamptz := now() + interval '18 hours';
  v_title     text := '⚠️ দৈনিক টাস্ক অসম্পূর্ণ — সতর্কতা';
  v_inserted  int := 0;
  r           record;
  v_body      text;
BEGIN
  FOR r IN
    SELECT DISTINCT p.id, COALESCE(NULLIF(trim(p.full_name), ''), 'সদস্য') AS full_name
    FROM public.profiles p
    JOIN public.user_packages up ON up.user_id = p.id AND up.status = 'active'
    WHERE COALESCE(p.status, 'active') = 'active'
      -- No task submission today (approved or pending — rejected doesn't count as an attempt)
      AND NOT EXISTS (
        SELECT 1 FROM public.task_submissions ts
        WHERE ts.user_id = p.id
          AND ts.status <> 'rejected'
          AND ts.created_at >= v_day_start
          AND ts.created_at <  v_day_end
      )
      -- Don't duplicate a notice already sent to this user today
      AND NOT EXISTS (
        SELECT 1 FROM public.notices n
        WHERE n.title = v_title
          AND n.created_at >= v_day_start
          AND p.id = ANY(n.target_user_ids)
      )
  LOOP
    v_body := format(
      'প্রিয় %s,%s%sআপনি %s তারিখে দুপুর ১২টার মধ্যে আপনার দৈনিক টাস্ক সম্পন্ন করেননি। প্রতিদিন নির্ধারিত টাস্ক সম্পন্ন না করলে আপনার আয় এবং প্যাকেজের সুবিধা ক্ষতিগ্রস্ত হতে পারে।%s%sঅনুগ্রহ করে আজই লগইন করে বাকি টাস্ক সম্পন্ন করুন। ধন্যবাদ।',
      r.full_name, E'\n', E'\n',
      to_char(v_bd_date, 'DD Mon YYYY'), E'\n', E'\n'
    );

    INSERT INTO public.notices (
      title, body, priority, target_package_ids, target_user_ids,
      target_all_users, published, expires_at, created_by
    ) VALUES (
      v_title, v_body, 'warning',
      '{}'::uuid[], ARRAY[r.id]::uuid[],
      false, true, v_expires, NULL
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_send_missed_task_notices() FROM PUBLIC, anon, authenticated;
