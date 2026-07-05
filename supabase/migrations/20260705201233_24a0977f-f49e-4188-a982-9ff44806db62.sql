CREATE OR REPLACE FUNCTION public.admin_save_notice(_actor uuid, _id uuid, _patch jsonb)
RETURNS public.notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.notices;
  v_priority text;
  v_target_package_ids uuid[];
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  v_priority := COALESCE(NULLIF(_patch->>'priority', ''), 'info');
  IF v_priority NOT IN ('info', 'warning', 'critical') THEN
    v_priority := 'info';
  END IF;

  SELECT COALESCE(array_agg(value::uuid), '{}'::uuid[])
    INTO v_target_package_ids
  FROM jsonb_array_elements_text(COALESCE(_patch->'target_package_ids', '[]'::jsonb)) AS value;

  IF COALESCE(NULLIF(trim(_patch->>'title'), ''), '') = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF COALESCE(NULLIF(trim(_patch->>'body'), ''), '') = '' THEN
    RAISE EXCEPTION 'Body is required';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.notices (
      title,
      body,
      priority,
      target_package_ids,
      target_all_users,
      published,
      expires_at,
      created_by
    ) VALUES (
      trim(_patch->>'title'),
      trim(_patch->>'body'),
      v_priority,
      CASE WHEN COALESCE((_patch->>'target_all_users')::boolean, false) THEN '{}'::uuid[] ELSE v_target_package_ids END,
      COALESCE((_patch->>'target_all_users')::boolean, false),
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
      target_all_users = COALESCE((_patch->>'target_all_users')::boolean, target_all_users),
      published = COALESCE((_patch->>'published')::boolean, published),
      expires_at = CASE WHEN _patch ? 'expires_at' THEN NULLIF(_patch->>'expires_at', '')::timestamptz ELSE expires_at END
    WHERE id = _id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'notice not found';
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_notice(_actor uuid, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  DELETE FROM public.notices WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'notice not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_notice(_actor uuid, _id uuid, _published boolean)
RETURNS public.notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.notices;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  UPDATE public.notices
    SET published = _published
    WHERE id = _id
    RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notice not found';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_notice(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_notice(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_toggle_notice(uuid, uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_save_notice(uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_notice(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_notice(uuid, uuid, boolean) TO authenticated, service_role;