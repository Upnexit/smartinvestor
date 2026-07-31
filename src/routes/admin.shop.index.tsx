import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingBag, Package, Boxes, Wallet, TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/shop/")({
  head: () => ({ meta: [{ title: "শপ ড্যাশবোর্ড — Admin" }] }),
  component: ShopDashboard,
});

type Stats = {
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  pendingValue: number;
  products: number;
  activeProducts: number;
  stockValue: number;
};

const bn = (n: number) => Number(n || 0).toLocaleString("en-BD");

function ShopDashboard() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from("shop_orders").select("status, total_amount"),
        supabase.from("shop_products").select("price, stock, active"),
      ]);
      const o = orders ?? [];
      const p = products ?? [];
      const done = o.filter((r) => r.status === "completed" || r.status === "delivered");
      setS({
        totalOrders: o.length,
        newOrders: o.filter((r) => r.status === "new").length,
        completedOrders: done.length,
        cancelledOrders: o.filter((r) => r.status === "cancelled").length,
        revenue: done.reduce((a, r) => a + Number(r.total_amount || 0), 0),
        pendingValue: o
          .filter((r) => r.status !== "cancelled" && !done.includes(r))
          .reduce((a, r) => a + Number(r.total_amount || 0), 0),
        products: p.length,
        activeProducts: p.filter((r) => r.active).length,
        stockValue: p.reduce((a, r) => a + Number(r.price || 0) * Number(r.stock || 0), 0),
      });
    })();
  }, []);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="শপ ড্যাশবোর্ড"
        subtitle="অর্ডার, ইনকাম ও পণ্যের সামগ্রিক পরিসংখ্যান"
        accent="emerald"
        Icon={ShoppingBag}
      />

      {!s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="মোট অর্ডার" value={bn(s.totalOrders)} hint="সর্বমোট প্লেসড অর্ডার" accent="sky" Icon={ShoppingBag} />
            <StatTile label="নতুন অর্ডার" value={bn(s.newOrders)} hint="প্রসেসিং বাকি" accent="amber" Icon={Clock} />
            <StatTile label="অর্ডার থেকে ইনকাম" value={`৳${bn(s.revenue)}`} hint="সম্পন্ন অর্ডার" accent="emerald" Icon={Wallet} />
            <StatTile label="পেন্ডিং মূল্য" value={`৳${bn(s.pendingValue)}`} hint="এখনো সম্পন্ন হয়নি" accent="orange" Icon={TrendingUp} />
            <StatTile label="মোট পণ্য" value={bn(s.products)} hint={`${bn(s.activeProducts)} টি সক্রিয়`} accent="fuchsia" Icon={Package} />
            <StatTile label="স্টক মূল্য" value={`৳${bn(s.stockValue)}`} hint="পণ্যের মোট মূল্য" accent="indigo" Icon={Boxes} />
            <StatTile label="সম্পন্ন অর্ডার" value={bn(s.completedOrders)} accent="teal" Icon={CheckCircle2} />
            <StatTile label="বাতিল অর্ডার" value={bn(s.cancelledOrders)} accent="rose" Icon={XCircle} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminCard accent="fuchsia" interactive>
              <Link to="/admin/shop/products" className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="bn-display text-lg text-slate-900">সকল পণ্য</p>
                  <p className="text-sm text-slate-500">পণ্য যোগ, এডিট ও ডিলিট করুন</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            </AdminCard>
            <AdminCard accent="sky" interactive>
              <Link to="/admin/shop/orders" className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="bn-display text-lg text-slate-900">সকল অর্ডার</p>
                  <p className="text-sm text-slate-500">অর্ডার স্ট্যাটাস আপডেট করুন</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            </AdminCard>
          </div>
        </>
      )}
    </div>
  );
}
