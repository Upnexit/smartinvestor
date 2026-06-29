UPDATE auth.users
SET encrypted_password = crypt('upnex@2026', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'upnex360@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email='upnex360@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role FROM auth.users WHERE email='upnex360@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, full_name, phone, email, payment_method, payment_number, user_code, referral_code, balance, locked_balance)
SELECT id, 'Admin', '01700000000', email, 'bkash'::public.payment_method, '01700000000',
       'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0'),
       upper(substr(md5(random()::text), 1, 8)), 0, 0
FROM auth.users WHERE email='upnex360@gmail.com'
ON CONFLICT (id) DO NOTHING;