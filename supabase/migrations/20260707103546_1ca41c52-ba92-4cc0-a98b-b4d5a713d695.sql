CREATE OR REPLACE FUNCTION public.telegram_connect_account(
  _code text,
  _chat_id bigint,
  _username text DEFAULT NULL
)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF _code IS NULL OR length(trim(_code)) < 6 THEN
    RAISE EXCEPTION 'invalid connect code';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE telegram_connect_code = trim(_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid connect code';
  END IF;

  UPDATE public.profiles
    SET telegram_chat_id = _chat_id,
        telegram_username = NULLIF(trim(COALESCE(_username, '')), ''),
        telegram_connected_at = now(),
        telegram_connect_code = NULL
    WHERE id = v_profile.id;

  RETURN QUERY SELECT v_profile.id, v_profile.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_connect_account(text, bigint, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.telegram_find_account_by_chat(_chat_id bigint)
RETURNS TABLE(full_name text, user_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.full_name, p.user_code
  FROM public.profiles p
  WHERE p.telegram_chat_id = _chat_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_find_account_by_chat(bigint) TO anon, authenticated, service_role;