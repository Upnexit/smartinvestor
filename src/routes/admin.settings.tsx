import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Settings, Save, Upload } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { adminSaveSetting } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "সাইট সেটিংস — Admin" }] }),
  component: SettingsPage,
});

type Site = {
  site_name: string; tagline: string; logo_url: string; favicon_url: string;
  hero_title: string; hero_subtitle: string; cta_text: string; cta_link: string;
  signup_bonus: number; referral_commission: number; bonus_locked: boolean;
};
const DEF: Site = {
  site_name: "Smart Investor", tagline: "ঘরে বসে আয়", logo_url: "", favicon_url: "",
  hero_title: "লাইক কমেন্ট করে ইনকাম", hero_subtitle: "বিশ্বস্ত বাংলাদেশী প্ল্যাটফর্ম",
  cta_text: "এখনই শুরু করুন", cta_link: "/register",
  signup_bonus: 300, referral_commission: 5, bonus_locked: true,
};

function SettingsPage() {
  const save = useServerFn(adminSaveSetting);
  const [s, setS] = useState<Site | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void (async () => {
    const { data } = await supabase.from("site_settings").select("key,value")
      .in("key", ["site"]);
    const v = (data?.[0]?.value ?? {}) as Partial<Site>;
    setS({ ...DEF, ...v });
  })(); }, []);

  const upd = (p: Partial<Site>) => setS((x) => x ? { ...x, ...p } : x);

  const handleSave = async () => {
    if (!s) return;
    setBusy(true);
    try { await save({ data: { key: "site", value: s as unknown as Record<string, unknown> } }); toast.success("সেভ হয়েছে"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  const upload = async (kind: "logo" | "favicon", file: File) => {
    const path = `${kind}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("payment-logos").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("payment-logos").createSignedUrl(path, 60*60*24*365);
    upd(kind === "logo" ? { logo_url: data?.signedUrl ?? "" } : { favicon_url: data?.signedUrl ?? "" });
  };

  if (!s) return <Shimmer className="h-64" />;

  return (
    <>
      <AdminPageHeader accent="teal" Icon={Settings} title="হোমপেজ সেটিংস"
        subtitle="ব্র্যান্ড, হিরো ও বোনাস কনফিগ"
        action={<GradientButton accent="teal" busy={busy} onClick={handleSave}><Save className="h-4 w-4" /> সেভ</GradientButton>} />

      <AdminCard accent="teal" className="p-4 space-y-3">
        <h2 className="bn-display text-base">ব্র্যান্ড</h2>
        <F label="সাইট নাম" value={s.site_name} onChange={(v) => upd({ site_name: v })} />
        <F label="ট্যাগলাইন" value={s.tagline} onChange={(v) => upd({ tagline: v })} />
        <div className="grid grid-cols-2 gap-3">
          <UploadField label="লোগো" url={s.logo_url} onUpload={(f) => upload("logo", f)} />
          <UploadField label="ফেভিকন" url={s.favicon_url} onUpload={(f) => upload("favicon", f)} />
        </div>
      </AdminCard>

      <AdminCard accent="cyan" className="p-4 space-y-3">
        <h2 className="bn-display text-base">হিরো সেকশন</h2>
        <F label="টাইটেল" value={s.hero_title} onChange={(v) => upd({ hero_title: v })} />
        <F label="সাবটাইটেল" value={s.hero_subtitle} onChange={(v) => upd({ hero_subtitle: v })} />
        <div className="grid grid-cols-2 gap-2">
          <F label="CTA টেক্সট" value={s.cta_text} onChange={(v) => upd({ cta_text: v })} />
          <F label="CTA লিংক" value={s.cta_link} onChange={(v) => upd({ cta_link: v })} />
        </div>
      </AdminCard>

      <AdminCard accent="amber" className="p-4 space-y-3">
        <h2 className="bn-display text-base">বোনাস ও রেফারেল</h2>
        <div className="grid grid-cols-2 gap-2">
          <F label="সাইনআপ বোনাস (৳)" type="number" value={String(s.signup_bonus)} onChange={(v) => upd({ signup_bonus: Number(v) })} />
          <F label="রেফারেল কমিশন (%)" type="number" value={String(s.referral_commission)} onChange={(v) => upd({ referral_commission: Number(v) })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.bonus_locked} onChange={(e) => upd({ bonus_locked: e.target.checked })} />
          সাইনআপ বোনাস লক করুন (প্যাকেজ অ্যাক্টিভ না হওয়া পর্যন্ত)
        </label>
      </AdminCard>

      <GradientButton accent="teal" className="w-full" busy={busy} onClick={handleSave}><Save className="h-4 w-4" /> সব সেভ করুন</GradientButton>
    </>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400" />
    </label>
  );
}
function UploadField({ label, url, onUpload }: { label: string; url: string; onUpload: (f: File) => void }) {
  return (
    <div>
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-md")}>
        <Upload className="h-3.5 w-3.5" /> আপলোড
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
      {url && <img src={url} alt="" className="mt-2 h-12 rounded-lg" />}
    </div>
  );
}
