-- Migration: Update Admin Credentials and purge legacy admin
-- New Admin: smartclickbd@gmail.com
-- Removed Legacy Admin: upnex360@gmail.com

DO $$
DECLARE
    new_admin_id uuid;
    old_admin_id uuid;
BEGIN
    -- Get old admin id if still exists
    SELECT id INTO old_admin_id FROM auth.users WHERE email = 'upnex360@gmail.com' LIMIT 1;
    -- Get new admin id
    SELECT id INTO new_admin_id FROM auth.users WHERE email = 'smartclickbd@gmail.com' LIMIT 1;

    -- If old admin exists, reassign references
    IF old_admin_id IS NOT NULL AND new_admin_id IS NOT NULL THEN
        UPDATE public.distributors SET created_by = new_admin_id WHERE created_by = old_admin_id;
        UPDATE public.distributor_applications SET reviewed_by = new_admin_id WHERE reviewed_by = old_admin_id;
        UPDATE public.withdrawals SET reviewed_by = new_admin_id WHERE reviewed_by = old_admin_id;

        DELETE FROM public.user_roles WHERE user_id = old_admin_id;
        DELETE FROM public.profiles WHERE id = old_admin_id;
        DELETE FROM auth.users WHERE id = old_admin_id;
    END IF;

    -- Ensure new admin roles exist
    IF new_admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_admin_id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_admin_id, 'user'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
