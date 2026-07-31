ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS sender_number text,
  ADD COLUMN IF NOT EXISTS trx_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

DROP POLICY IF EXISTS "validated order insert" ON public.shop_orders;

CREATE POLICY "validated order insert"
ON public.shop_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'new'
  AND payment_status = 'unpaid'
  AND payment_method IN ('cod','bkash','nagad','rocket')
  AND length(btrim(customer_name)) BETWEEN 2 AND 120
  AND length(btrim(phone)) BETWEEN 6 AND 20
  AND quantity BETWEEN 1 AND 100
  AND unit_price >= 0
  AND total_amount >= 0
  AND (payment_method = 'cod' OR (
        sender_number IS NOT NULL AND length(btrim(sender_number)) BETWEEN 6 AND 20
        AND trx_id IS NOT NULL AND length(btrim(trx_id)) BETWEEN 4 AND 40
      ))
);

CREATE INDEX IF NOT EXISTS shop_orders_user_created_idx ON public.shop_orders (user_id, created_at DESC);