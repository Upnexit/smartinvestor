do $$
declare
  t text;
begin
  foreach t in array array[
    'user_packages',
    'packages',
    'distributors',
    'link_tasks',
    'task_submissions'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on all functions in schema public to authenticated;