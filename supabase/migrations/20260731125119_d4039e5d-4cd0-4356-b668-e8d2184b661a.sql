ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS sender_number text,
  ADD COLUMN IF NOT EXISTS trx_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS shop_orders_user_created_idx ON public.shop_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON public.shop_orders (status, created_at DESC);

DROP POLICY IF EXISTS "Anyone can place a valid order" ON public.shop_orders;
CREATE POLICY "Anyone can place a valid order"
ON public.shop_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) OR (user_id = auth.uid()))
  AND length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(phone)) BETWEEN 6 AND 20
  AND quantity > 0 AND quantity <= 100
  AND unit_price >= 0
  AND total_amount >= 0
  AND status = 'new'
  AND payment_status = 'unpaid'
  AND payment_method IN ('cod','bkash','nagad','rocket')
  AND (
    payment_method = 'cod'
    OR (
      sender_number IS NOT NULL AND length(btrim(sender_number)) BETWEEN 6 AND 20
      AND trx_id IS NOT NULL AND length(btrim(trx_id)) BETWEEN 4 AND 40
    )
  )
);

DROP POLICY IF EXISTS "public read allowlisted settings" ON public.site_settings;
CREATE POLICY "public read allowlisted settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY['site'::text, 'payment_accounts'::text, 'package_launch'::text]));