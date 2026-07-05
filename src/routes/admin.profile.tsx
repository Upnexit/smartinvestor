import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Save, LogOut, Lock, Shield } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "অ্যাডমিন প্রোফাইল" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; email: string; phone: string } | null>(null);
  const [pwd, setPwd] = useState({ new: "", confirm: "" });
  const [lock, setLock] = useState("");
  const [busy, setBusy] = useState(false);
  const authReady = useAuthReady();

  useEffect(() => { if (!authReady) return; void (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("profiles").select("full_name,email,phone").eq("id", u.user.id).maybeSingle();
    setProfile({ full_name: data?.full_name ?? "", email: data?.email ?? u.user.email ?? "", phone: data?.phone ?? "" });
    setLock(localStorage.getItem("admin_lock_pwd") ?? "");
  })(); }, [authReady]);

  const saveProfile = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");
      const { error } = await supabase.from("profiles").update({ full_name: profile.full_name, phone: profile.phone }).eq("id", u.user.id);
      if (error) throw error;
      toast.success("সেভ হয়েছে");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  const changePwd = async () => {
    if (pwd.new.length < 6) { toast.error("পাসওয়ার্ড ৬+ অক্ষর"); return; }
    if (pwd.new !== pwd.confirm) { toast.error("মিলছে না"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.new });
      if (error) throw error;
      toast.success("পাসওয়ার্ড পরিবর্তিত");
      setPwd({ new: "", confirm: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  const saveLock = () => {
    if (lock.length < 4) { toast.error("৪+ অক্ষর"); return; }
    localStorage.setItem("admin_lock_pwd", lock);
    toast.success("লক সেট হয়েছে");
  };

  const logoutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    localStorage.removeItem("admin_lock_pwd");
    toast.success("সব ডিভাইস থেকে লগআউট");
    nav({ to: "/auth" });
  };

  if (!authReady || !profile) return <Shimmer className="h-64" />;

  return (
    <>
      <AdminPageHeader accent="slate" Icon={User} title="অ্যাডমিন প্রোফাইল" subtitle="ব্যক্তিগত তথ্য, পাসওয়ার্ড ও সিকিউরিটি" />

      <AdminCard accent="slate" className="p-4 space-y-3">
        <h2 className="bn-display text-base">ব্যক্তিগত তথ্য</h2>
        <F label="পূর্ণ নাম" value={profile.full_name} onChange={(v) => setProfile({ ...profile, full_name: v })} />
        <F label="ইমেইল" value={profile.email} onChange={() => {}} disabled />
        <F label="ফোন" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} mono />
        <GradientButton accent="slate" busy={busy} onClick={saveProfile}><Save className="h-4 w-4" /> সেভ</GradientButton>
      </AdminCard>

      <AdminCard accent="indigo" className="p-4 space-y-3">
        <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-600" /><h2 className="bn-display text-base">পাসওয়ার্ড পরিবর্তন</h2></div>
        <F label="নতুন পাসওয়ার্ড" type="password" value={pwd.new} onChange={(v) => setPwd({ ...pwd, new: v })} />
        <F label="কনফার্ম" type="password" value={pwd.confirm} onChange={(v) => setPwd({ ...pwd, confirm: v })} />
        <GradientButton accent="indigo" busy={busy} onClick={changePwd}>পরিবর্তন করুন</GradientButton>
      </AdminCard>

      <AdminCard accent="amber" className="p-4 space-y-3">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600" /><h2 className="bn-display text-base">অ্যাডমিন লক পাসওয়ার্ড</h2></div>
        <p className="text-xs text-slate-500">এই পাসওয়ার্ড ব্রাউজারে সেভ থাকবে; লগআউট হলে মুছে যাবে।</p>
        <F label="লক পাসওয়ার্ড" type="password" value={lock} onChange={setLock} />
        <GradientButton accent="amber" onClick={saveLock}>সেট করুন</GradientButton>
      </AdminCard>

      <AdminCard accent="rose" className="p-4 space-y-3">
        <h2 className="bn-display text-base text-rose-700">ডেঞ্জার জোন</h2>
        <SoftButton accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={logoutAll}><LogOut className="h-3.5 w-3.5" /> সব ডিভাইস থেকে লগআউট</SoftButton>
      </AdminCard>
    </>
  );
}

function F({ label, value, onChange, type = "text", mono, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500 ${mono ? "font-mono" : ""}`} />
    </label>
  );
}
