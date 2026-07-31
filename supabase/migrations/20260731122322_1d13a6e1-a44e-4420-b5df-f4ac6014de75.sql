CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  old_price numeric,
  image_url text,
  tag_label text,
  tag_gradient text NOT NULL DEFAULT 'from-amber-500 to-orange-600',
  category text,
  stock integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 4.9,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.shop_products FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products"
  ON public.shop_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.shop_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.shop_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shop_products_updated_at
  BEFORE UPDATE ON public.shop_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.shop_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place an order"
  ON public.shop_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own orders"
  ON public.shop_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.shop_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
  ON public.shop_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shop_products_active_sort_idx ON public.shop_products (active, sort_order);
CREATE INDEX shop_orders_status_created_idx ON public.shop_orders (status, created_at DESC);
CREATE INDEX shop_orders_user_idx ON public.shop_orders (user_id);

INSERT INTO public.shop_products (name, price, old_price, image_url, tag_label, tag_gradient, category, stock, sort_order, description) VALUES
('Apple AirPods Pro 2', 38900, 45000, 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80', 'BEST SELLER', 'from-amber-500 to-orange-600', 'Earbuds', 25, 1, 'অরিজিনাল Apple AirPods Pro 2 — অ্যাকটিভ নয়েজ ক্যান্সেলেশন সহ।'),
('Sony WH-1000XM5 হেডফোন', 34500, 39900, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80', 'PREMIUM', 'from-violet-500 to-purple-700', 'Headphone', 15, 2, 'ইন্ডাস্ট্রি লিডিং নয়েজ ক্যান্সেলিং হেডফোন।'),
('Samsung Galaxy Buds2 Pro', 14900, 18000, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80', 'NEW', 'from-emerald-500 to-teal-600', 'Earbuds', 30, 3, 'হাই-ফাই ২৪বিট অডিও সহ প্রিমিয়াম ইয়ারবাডস।'),
('JBL Tune 760NC হেডফোন', 12500, 15000, 'https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=600&q=80', 'SAVE 17%', 'from-rose-500 to-pink-600', 'Headphone', 40, 4, 'দীর্ঘস্থায়ী ব্যাটারি সহ ওয়্যারলেস নয়েজ ক্যান্সেলিং হেডফোন।'),
('Xiaomi Mi Band 8 স্মার্টব্যান্ড', 4990, 6500, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=600&q=80', 'HOT', 'from-orange-500 to-red-600', 'Wearable', 60, 5, 'ফিটনেস ট্র্যাকিং ও হার্ট রেট মনিটর সহ স্মার্টব্যান্ড।'),
('Anker Soundcore Liberty 4', 11900, 14500, 'https://images.unsplash.com/photo-1606741965326-cb6ea1937d57?auto=format&fit=crop&w=600&q=80', 'TRENDING', 'from-sky-500 to-blue-600', 'Earbuds', 35, 6, 'হার্ট রেট সেন্সর সহ প্রিমিয়াম TWS ইয়ারবাডস।'),
('Apple Watch SE', 32900, 38000, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', 'EXCLUSIVE', 'from-slate-700 to-slate-900', 'Wearable', 12, 7, 'অরিজিনাল Apple Watch SE — ফিটনেস ও হেলথ ট্র্যাকিং।'),
('Realme Buds Air 5 Pro', 6490, 8500, 'https://images.unsplash.com/photo-1612444530582-fc66183b16f4?auto=format&fit=crop&w=600&q=80', 'DEAL', 'from-fuchsia-500 to-purple-600', 'Earbuds', 50, 8, '৫০ঘণ্টা ব্যাটারি ব্যাকআপ সহ ANC ইয়ারবাডস।');