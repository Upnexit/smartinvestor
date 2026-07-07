CREATE OR REPLACE FUNCTION public.telegram_chat_for_user(_user_id uuid)
RETURNS TABLE(chat_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.telegram_chat_id
  FROM public.profiles p
  WHERE p.id = _user_id
    AND p.telegram_chat_id IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_chat_for_user(uuid) TO authenticated, service_role;