DROP FUNCTION IF EXISTS public.telegram_find_account_by_chat(bigint);

CREATE OR REPLACE FUNCTION public.telegram_find_account_by_chat(_chat_id bigint)
RETURNS TABLE(
  full_name text,
  user_code text,
  balance numeric,
  locked_balance numeric,
  total_earned numeric,
  active_package text,
  package_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.full_name,
    p.user_code,
    p.balance,
    p.locked_balance,
    p.total_earned,
    pkg.name AS active_package,
    up.expires_at AS package_expires_at
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT up.package_id, up.expires_at
    FROM public.user_packages up
    WHERE up.user_id = p.id AND up.status = 'active'
    ORDER BY up.activated_at DESC NULLS LAST, up.created_at DESC
    LIMIT 1
  ) up ON true
  LEFT JOIN public.packages pkg ON pkg.id = up.package_id
  WHERE p.telegram_chat_id = _chat_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_find_account_by_chat(bigint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.telegram_notice_recipients(
  _actor uuid,
  _target_all_users boolean,
  _target_package_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE(user_id uuid, chat_id bigint, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.telegram_chat_id, p.full_name
  FROM public.profiles p
  WHERE public.has_role(_actor, 'admin'::public.app_role)
    AND p.telegram_chat_id IS NOT NULL
    AND (
      _target_all_users
      OR EXISTS (
        SELECT 1
        FROM public.user_packages up
        WHERE up.user_id = p.id
          AND up.status = 'active'
          AND up.package_id = ANY(COALESCE(_target_package_ids, '{}'::uuid[]))
      )
    )
  LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_notice_recipients(uuid, boolean, uuid[]) TO authenticated, service_role;