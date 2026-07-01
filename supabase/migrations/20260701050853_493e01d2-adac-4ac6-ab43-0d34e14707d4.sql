
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'admin_delete_user_data','admin_review_user_package','admin_update_user_profile',
        'admin_save_package','admin_toggle_package','admin_delete_package',
        'admin_review_withdrawal','admin_set_user_status','admin_delete_distributor',
        'admin_upsert_distributor'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;
