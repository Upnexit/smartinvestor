revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.distributor_stats(uuid) to authenticated, service_role;
grant execute on function public.my_referred_friends() to authenticated, service_role;
grant execute on function public.expire_user_packages() to service_role;

grant execute on function public.admin_delete_distributor(uuid, uuid) to authenticated, service_role;
grant execute on function public.admin_delete_package(uuid, uuid) to authenticated, service_role;
grant execute on function public.admin_delete_user_data(uuid, uuid) to authenticated, service_role;
grant execute on function public.admin_distributor_bundle(uuid, uuid) to authenticated, service_role;
grant execute on function public.admin_review_user_package(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_review_withdrawal(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_save_package(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_set_user_status(uuid, uuid, public.user_status, text) to authenticated, service_role;
grant execute on function public.admin_toggle_package(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_update_user_profile(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_upsert_distributor(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_user_withdraw_history(uuid, uuid) to authenticated, service_role;