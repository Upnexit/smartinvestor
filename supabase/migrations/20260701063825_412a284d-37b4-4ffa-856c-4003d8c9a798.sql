
-- Add FK to profiles so PostgREST can embed profile info in withdrawal queries
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable realtime for withdrawals so admin dashboard updates live
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
