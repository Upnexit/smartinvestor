-- 1) site_settings: remove blanket public read, replace with key allow-lists
DROP POLICY IF EXISTS "anyone reads site settings" ON public.site_settings;

DROP POLICY IF EXISTS "public read payment_accounts" ON public.site_settings;
CREATE POLICY "public read allowlisted settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key IN ('site', 'payment_accounts'));

CREATE POLICY "authenticated read payment settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (key IN ('payment_bkash', 'payment_nagad', 'payment_rocket', 'dashboard_banner'));

-- 2) shop_orders: replace always-true insert policy with validated one
DROP POLICY IF EXISTS "Anyone can place an order" ON public.shop_orders;

CREATE POLICY "Anyone can place a valid order"
  ON public.shop_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND length(btrim(customer_name)) BETWEEN 2 AND 120
    AND length(btrim(phone)) BETWEEN 6 AND 20
    AND quantity > 0 AND quantity <= 100
    AND unit_price >= 0
    AND total_amount >= 0
    AND status = 'new'
  );
