-- Add profiles relationship to user_packages so PostgREST embeds work
ALTER TABLE public.user_packages
  ADD CONSTRAINT user_packages_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;