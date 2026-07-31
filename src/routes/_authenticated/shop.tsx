import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingBag, ShoppingCart, Plus, Minus, X, Trash2, Star, Loader2,
  PackageSearch, Search, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchFlag } from "@/hooks/use-launch-flag";
import { OrderDrawer, type OrderLine } from "@/components/shop/OrderDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "শপ — পণ্য কিনুন | Smart Investor" },
      { name: "description", content: "প্রিমিয়াম পণ্য কালেকশন থেকে অর্ডার করুন — ক্যাশ অন ডেলিভারি, বিকাশ ও নগদ সাপোর্ট।" },
      { property: "og:title", content: "শপ — পণ্য কিনুন" },
      { property: "og:description", content: "প্রিমিয়াম পণ্য কালেকশন থেকে অর্ডার করুন — ক্যাশ অন ডেলিভারি, বিকাশ ও নগদ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  tag_label: string | null;
  tag_gradient: string;
  category: string | null;
  stock: number;
  rating: number;
};

type CartLine = { product: Product; qty: number };
type Method = "cod" | "bkash" | "nagad" | "rocket";

const METHODS: { key: Method; label: string; hint: string; cls: string }[] = [
  { key: "cod", label: "ক্যাশ অন ডেলিভারি", hint: "পণ্য হাতে পেয়ে টাকা দিন", cls: "from-emerald-500 to-teal-600" },
  { key: "bkash", label: "বিকাশ", hint: "সেন্ড মানি করে ট্রানজেকশন আইডি দিন", cls: "from-pink-500 to-rose-600" },
  { key: "nagad", label: "নগদ", hint: "সেন্ড মানি করে ট্রানজেকশন আইডি দিন", cls: "from-orange-500 to-red-600" },
  { key: "rocket", label: "রকেট", hint: "সেন্ড মানি করে ট্রানজেকশন আইডি দিন", cls: "from-purple-500 to-fuchsia-700" },
];

const bn = (n: number) => Number(n || 0).toLocaleString("en-BD");

function ShopPage() {
  const navigate = useNavigate();
  const { launched, ready } = useLaunchFlag();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderLines, setOrderLines] = useState<OrderLine[] | null>(null);

  // Hidden until launch day
  useEffect(() => {
    if (ready && !launched) navigate({ to: "/dashboard", replace: true });
  }, [ready, launched, navigate]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id,name,description,price,old_price,image_url,tag_label,tag_gradient,category,stock,rating")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) { toast.error("পণ্য লোড করা যায়নি"); setProducts([]); return; }
      setProducts((data ?? []) as Product[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return null;
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(s) || (p.category ?? "").toLowerCase().includes(s));
  }, [products, q]);

  const totalQty = cart.reduce((s, l) => s + l.qty, 0);
  const totalAmount = cart.reduce((s, l) => s + l.qty * Number(l.product.price), 0);

  function addToCart(p: Product) {
    setCart((c) => {
      const found = c.find((l) => l.product.id === p.id);
      if (found) return c.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { product: p, qty: 1 }];
    });
    toast.success(`${p.name} কার্টে যোগ হয়েছে`);
  }

  function setQty(id: string, qty: number) {
    setCart((c) => qty <= 0 ? c.filter((l) => l.product.id !== id) : c.map((l) => l.product.id === id ? { ...l, qty } : l));
  }

  if (!ready || !launched) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 p-5 text-white shadow-pop">
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              <h1 className="bn-display text-2xl">শপ</h1>
            </div>
            <p className="mt-1 text-sm text-white/85">পছন্দের পণ্য বেছে নিন — ঘরে বসে অর্ডার করুন</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur transition hover:bg-white/30"
            aria-label="কার্ট"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalQty > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-slate-900">
                {totalQty}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-soft">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="পণ্য খুঁজুন..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Grid */}
      {!filtered ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-600">কোনো পণ্য পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article key={p.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-pop">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  : <div className="grid h-full w-full place-items-center text-slate-300"><ShoppingBag className="h-10 w-10" /></div>}
                {p.tag_label && (
                  <span className={cn("absolute left-3 top-3 rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-bold text-white shadow", p.tag_gradient)}>
                    {p.tag_label}
                  </span>
                )}
                {p.stock <= 0 && (
                  <span className="absolute inset-0 grid place-items-center bg-slate-900/50 text-sm font-bold text-white">স্টক শেষ</span>
                )}
              </div>
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</h2>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}
                  </span>
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="bn-display text-xl text-rose-600">৳{bn(p.price)}</span>
                  {p.old_price ? <span className="text-xs text-slate-400 line-through">৳{bn(p.old_price)}</span> : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={p.stock <= 0}
                    onClick={() => addToCart(p)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-2 py-2.5 text-xs font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingCart className="h-4 w-4" /> কার্টে যোগ
                  </button>
                  <button
                    disabled={p.stock <= 0}
                    onClick={() => setOrderLines([{ product: p, qty: 1 }])}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 px-2 py-2.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" /> অর্ডার নাও
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Floating cart bar */}
      {totalQty > 0 && !cartOpen && !checkout && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-24 z-30 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl lg:left-auto lg:right-8 lg:w-80 lg:bottom-8"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4" /> {bn(totalQty)} টি পণ্য
          </span>
          <span className="bn-display text-lg">৳{bn(totalAmount)}</span>
        </button>
      )}

      {cartOpen && (
        <CartSheet
          cart={cart}
          onClose={() => setCartOpen(false)}
          onQty={setQty}
          total={totalAmount}
          onCheckout={() => { setCartOpen(false); setCheckout(true); }}
        />
      )}

      {checkout && (
        <CheckoutModal
          cart={cart}
          total={totalAmount}
          onClose={() => setCheckout(false)}
          onDone={() => { setCart([]); setCheckout(false); }}
        />
      )}
    </div>
  );
}

/* ---------------- Cart ---------------- */

function CartSheet({
  cart, onClose, onQty, total, onCheckout,
}: {
  cart: CartLine[]; onClose: () => void; onQty: (id: string, q: number) => void;
  total: number; onCheckout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:rounded-l-3xl sm:rounded-tr-none">
        <div className="flex items-center justify-between">
          <h3 className="bn-display text-lg">আপনার কার্ট</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {cart.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">কার্ট খালি</p>
        ) : (
          <div className="mt-3 space-y-3">
            {cart.map((l) => (
              <div key={l.product.id} className="flex gap-3 rounded-2xl border border-slate-200 p-2.5">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {l.product.image_url
                    ? <img src={l.product.image_url} alt={l.product.name} className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-slate-300"><ShoppingBag className="h-6 w-6" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{l.product.name}</p>
                  <p className="text-xs text-rose-600">৳{bn(l.product.price)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button onClick={() => onQty(l.product.id, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm font-bold">{bn(l.qty)}</span>
                    <button onClick={() => onQty(l.product.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onQty(l.product.id, 0)} className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="bn-display shrink-0 text-sm text-slate-900">৳{bn(l.qty * Number(l.product.price))}</p>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-600">সর্বমোট</span>
              <span className="bn-display text-xl text-rose-600">৳{bn(total)}</span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110"
            >
              অর্ডার করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Checkout ---------------- */

