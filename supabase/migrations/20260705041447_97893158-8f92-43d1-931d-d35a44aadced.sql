
-- Tighten distributor_applications INSERT policy so submissions cannot preset review fields
DROP POLICY IF EXISTS "Anyone can submit application" ON public.distributor_applications;
CREATE POLICY "Anyone can submit application"
ON public.distributor_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND rejection_reason IS NULL
);

-- Revoke anon EXECUTE from SECURITY DEFINER functions that must not be publicly callable
REVOKE EXECUTE ON FUNCTION public.admin_distributor_bundle(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_user_withdraw_history(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_referred_friends() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.distributor_withdrawal_guard() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_referral_signup() FROM anon, authenticated, PUBLIC;
