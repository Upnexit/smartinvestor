GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

GRANT SELECT, INSERT, DELETE ON public.notice_dismissals TO authenticated;
GRANT ALL ON public.notice_dismissals TO service_role;