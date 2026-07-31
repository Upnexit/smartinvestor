import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingBag, ShoppingCart, Plus, Minus, X, Trash2, Star, Loader2,
  Truck, CheckCircle2, Copy, PackageSearch, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchFlag } from "@/hooks/use-launch-flag";
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
  const [checkout, setCheckout] = useState(false);

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
                <button
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" /> কার্টে যোগ করুন
                </button>
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

function CheckoutModal({
  cart, total, onClose, onDone,
}: { cart: CartLine[]; total: number; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<Method>("cod");
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [accounts, setAccounts] = useState<Partial<Record<Method, string>>>({});

  useEffect(() => {
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      if (me.user) {
        const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", me.user.id).maybeSingle();
        if (p) { setName((p.full_name as string) ?? ""); setPhone((p.phone as string) ?? ""); }
      }
      const [{ data: base }, { data: perMethod }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "payment_accounts").maybeSingle(),
        supabase.from("site_settings").select("key,value").in("key", ["payment_bkash", "payment_nagad", "payment_rocket"]),
      ]);
      const acc: Partial<Record<Method, string>> = {};
      const b = (base?.value ?? {}) as Record<string, string>;
      (["bkash", "nagad", "rocket"] as Method[]).forEach((m) => { if (b[m]) acc[m] = String(b[m]); });
      (perMethod ?? []).forEach((r) => {
        const m = String(r.key).replace("payment_", "") as Method;
        const v = r.value as { number?: string; agent_number?: string; active?: boolean } | null;
        if (!v || v.active === false) { delete acc[m]; return; }
        const num = (v.number || v.agent_number || "").replace(/\D/g, "");
        if (num) acc[m] = num;
      });
      setAccounts(acc);
    })();
  }, []);

  const phoneNorm = phone.replace(/\D/g, "").replace(/^880/, "0");
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneNorm);
  const senderNorm = sender.replace(/\D/g, "").replace(/^880/, "0");
  const mobileOk = method === "cod" || (/^01[3-9]\d{8}$/.test(senderNorm) && /^[A-Za-z0-9]{4,40}$/.test(trx.trim()));
  const canSubmit = name.trim().length >= 2 && phoneValid && address.trim().length >= 5 && mobileOk && cart.length > 0;

  const availableMethods = METHODS.filter((m) => m.key === "cod" || accounts[m.key]);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const rows = cart.map((l) => ({
        user_id: me.user?.id ?? null,
        product_id: l.product.id,
        product_name: l.product.name,
        customer_name: name.trim(),
        phone: phoneNorm,
        address: address.trim(),
        quantity: l.qty,
        unit_price: Number(l.product.price),
        total_amount: Number(l.product.price) * l.qty,
        status: "new",
        payment_status: "unpaid",
        payment_method: method,
        sender_number: method === "cod" ? null : senderNorm,
        trx_id: method === "cod" ? null : trx.trim().toUpperCase(),
        note: note.trim() || null,
      }));
      const { error } = await supabase.from("shop_orders").insert(rows);
      if (error) throw error;
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "অর্ডার জমা দেওয়া যায়নি");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h3 className="bn-display mt-3 text-xl text-slate-900">অর্ডার সফল হয়েছে!</h3>
          <p className="mt-1 text-sm text-slate-600">
            আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে। অর্ডারটি যাচাইয়ের পর কনফার্ম করা হবে।
          </p>
          <button onClick={onDone} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white">
            ঠিক আছে
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/60 backdrop-blur-sm sm:place-items-center sm:px-4 sm:py-6" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="bn-display text-lg text-slate-900">অর্ডার ফর্ম</h3>
            <p className="text-xs text-slate-500">{bn(cart.length)} টি পণ্য • সর্বমোট ৳{bn(total)}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <L label="আপনার নাম *">
            <input className={ip} value={name} onChange={(e) => setName(e.target.value)} placeholder="পূর্ণ নাম" maxLength={120} />
          </L>
          <L label="মোবাইল নম্বর *">
            <input className={ip} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" maxLength={14} />
            {phone && !phoneValid && <p className="mt-1 text-[11px] text-rose-600">সঠিক ১১ ডিজিটের নম্বর দিন</p>}
          </L>
          <L label="সম্পূর্ণ ঠিকানা *">
            <textarea rows={2} className={ip} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="গ্রাম/বাসা, থানা, জেলা" maxLength={500} />
          </L>

          <L label="পেমেন্ট পদ্ধতি *">
            <div className="grid gap-2 sm:grid-cols-2">
              {availableMethods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    method === m.key ? "border-transparent ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span className={cn("inline-flex rounded-lg bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white", m.cls)}>
                    {m.label}
                  </span>
                  <p className="mt-1 text-[11px] text-slate-500">{m.hint}</p>
                </button>
              ))}
            </div>
          </L>

          {method !== "cod" && (
            <div className="space-y-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    {METHODS.find((m) => m.key === method)?.label} নম্বর
                  </p>
                  <p className="bn-display text-lg text-slate-900">{accounts[method] ?? "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(accounts[method] ?? ""); toast.success("নম্বর কপি হয়েছে"); }}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  <Copy className="h-3.5 w-3.5" /> কপি
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                উপরের নম্বরে ৳{bn(total)} সেন্ড মানি করে নিচে তথ্য দিন।
              </p>
              <L label="যে নম্বর থেকে পাঠিয়েছেন *">
                <input className={ip} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" maxLength={14} />
              </L>
              <L label="ট্রানজেকশন আইডি *">
                <input className={ip} value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="যেমন 9F7KD2XQ" maxLength={40} />
              </L>
            </div>
          )}

          <L label="নোট (ঐচ্ছিক)">
            <input className={ip} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ডেলিভারি সংক্রান্ত নির্দেশনা" maxLength={300} />
          </L>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600">
            <Truck className="h-4 w-4 shrink-0 text-slate-400" />
            অর্ডার কনফার্ম হলে আমাদের টিম ফোনে যোগাযোগ করে ডেলিভারি নিশ্চিত করবে।
          </div>
        </div>

        <button
          disabled={!canSubmit || busy}
          onClick={submit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-700 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          অর্ডার কনফার্ম করুন — ৳{bn(total)}
        </button>
      </div>
    </div>
  );
}

const ip = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
