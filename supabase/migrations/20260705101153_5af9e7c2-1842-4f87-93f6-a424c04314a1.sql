drop policy if exists "admins read all referrals" on public.referral_earnings;
create policy "admins read all referrals"
on public.referral_earnings
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));