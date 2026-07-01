
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.referral_earnings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_earnings;
