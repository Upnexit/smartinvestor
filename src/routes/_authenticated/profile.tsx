import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  User as UserIcon, Mail, Phone, Smartphone, Save, Loader2, Lock,
  Copy, Check, ShieldCheck, Crown, Wallet, TrendingUp, BadgeCheck, AlertCircle,
  Pencil, Send, LinkIcon, Unlink, ArrowDownToLine,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getTelegramStatus, disconnectTelegram, sendTelegramTest } from "@/lib/telegram.functions";
import { EmailVerifyModal } from "@/components/panel/EmailVerifyModal";
import { updateMyEmail } from "@/lib/emailOtp.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "প্রোফাইল — Smart Investor" }] }),
  component: ProfilePage,
});

type Method = "bkash" | "nagad" | "rocket";

const DEFAULT_TELEGRAM_BOT_USERNAME = "smartinvestornotifybot_bot";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  payment_method: Method;
  payment_number: string;
  user_code: string;
  referral_code: string | null;
  balance: number;
  locked_balance: number;
  total_earned: number;
  avatar_url: string | null;
  email_verified: boolean;
};

function ProfilePage() {
  const updateEmailFn = useServerFn(updateMyEmail);
  const getTgFn = useServerFn(getTelegramStatus);
  const disconnectTgFn = useServerFn(disconnectTelegram);
  const testTgFn = useServerFn(sendTelegramTest);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Method>("bkash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [activePkg, setActivePkg] = useState<{ name: string; expires_at: string | null } | null>(null);
  const [tg, setTg] = useState<{ connected: boolean; username: string | null; connectedAt: string | null; botUsername: string; connectCode?: string | null; deepLink: string | null; configurationError?: string | null } | null>(null);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgLoadError, setTgLoadError] = useState<string | null>(null);
  const [tgReady, setTgReady] = useState(false);
  const [tgConnecting, setTgConnecting] = useState(false);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(0);
  const tgConnectingRef = useRef(false);
  const tgPollRef = useRef<number | null>(null);
  const tgPollStopRef = useRef<number | null>(null);

  const setTelegramWaiting = useCallback((waiting: boolean) => {
    tgConnectingRef.current = waiting;
    setTgConnecting(waiting);
  }, []);

  const stopTgPolling = useCallback(() => {
    if (tgPollRef.current) {
      window.clearInterval(tgPollRef.current);
      tgPollRef.current = null;
    }
    if (tgPollStopRef.current) {
      window.clearTimeout(tgPollStopRef.current);
      tgPollStopRef.current = null;
    }
  }, []);

  const loadTgFallback = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("লগইন সেশন পাওয়া যায়নি");

    const { data, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_username, telegram_connect_code, telegram_connected_at")
      .eq("id", u.user.id)
      .maybeSingle();
    if (error) throw error;

    const row = data as { telegram_chat_id?: number | null; telegram_username?: string | null; telegram_connect_code?: string | null; telegram_connected_at?: string | null } | null;
    const chatId = row?.telegram_chat_id ?? null;
    let code = row?.telegram_connect_code ?? null;

    if (!chatId && !code) {
      code = `u${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ telegram_connect_code: code })
        .eq("id", u.user.id);
      if (updateError) throw updateError;
    }

    setTg({
      connected: !!chatId,
      username: row?.telegram_username ?? null,
      connectedAt: row?.telegram_connected_at ?? null,
      botUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
      connectCode: code,
      deepLink: !chatId && code ? `https://t.me/${DEFAULT_TELEGRAM_BOT_USERNAME}?start=${code}` : null,
      configurationError: null,
    });
    if (chatId) setTelegramWaiting(false);
  }, [setTelegramWaiting]);

  const loadTg = useCallback(async (ensureWebhook = false, verifyUpdates = false) => {
    setTgLoadError(null);
    try {
      const r = await getTgFn({ data: { ensureWebhook, verifyUpdates } });
      const wasWaitingForTelegram = tgConnectingRef.current;
      setTg((current) => {
        if (current?.connected && !r.connected && verifyUpdates) return current;
        return r;
      });
      setTgReady(true);
      if (r.connected) {
        setTelegramWaiting(false);
        stopTgPolling();
        if (wasWaitingForTelegram) toast.success("Telegram সফলভাবে সংযুক্ত হয়েছে");
      }
    } catch (e) {
      try {
        await loadTgFallback();
        setTgReady(true);
      } catch {
        setTgLoadError(e instanceof Error ? e.message : "Telegram link তৈরি করা যাচ্ছে না");
        setTgReady(true);
      }
    }
  }, [getTgFn, loadTgFallback, setTelegramWaiting, stopTgPolling]);

  const startTgPolling = useCallback(() => {
    stopTgPolling();
    setTelegramWaiting(true);
    window.setTimeout(() => void loadTg(false, true), 120);
    tgPollRef.current = window.setInterval(() => void loadTg(false, true), 550);
    tgPollStopRef.current = window.setTimeout(() => {
      stopTgPolling();
      if (tgConnectingRef.current) setTelegramWaiting(false);
    }, 45000);
  }, [loadTg, setTelegramWaiting, stopTgPolling]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setEmailDraft(p.email ?? "");
        setPhone(p.phone ?? "");
        setPaymentMethod(p.payment_method);
        setPaymentNumber(p.payment_number ?? "");
        await loadTg(true);
      }
      const { data: wRows } = await supabase
        .from("withdrawals")
        .select("amount, gross_amount, status")
        .eq("user_id", u.user.id)
        .in("status", ["approved", "paid"]);
      const sum = (wRows ?? []).reduce((s: number, r: { amount: number | string | null; gross_amount: number | string | null }) => s + Number(r.gross_amount ?? r.amount ?? 0), 0);
      setTotalWithdrawn(sum);
      const { data: up } = await supabase
        .from("user_packages")
        .select("expires_at, packages(name)")
        .eq("user_id", u.user.id)
        .eq("status", "active")
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (up) {
        const pkgName = (up as unknown as { packages?: { name?: string } | null }).packages?.name;
        setActivePkg({ name: pkgName ?? "Active Package", expires_at: (up as { expires_at: string | null }).expires_at });
      }
    })();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`telegram-profile-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profile.id}` },
        (payload) => {
          const row = payload.new as { telegram_chat_id?: number | null; telegram_username?: string | null; telegram_connect_code?: string | null; telegram_connected_at?: string | null };
          const wasWaitingForTelegram = tgConnecting;
          setTg((current) => ({
            connected: !!row.telegram_chat_id,
            username: row.telegram_username ?? null,
            connectedAt: row.telegram_connected_at ?? null,
            botUsername: current?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME,
            connectCode: row.telegram_connect_code ?? null,
            deepLink: !row.telegram_chat_id && row.telegram_connect_code
              ? `https://t.me/${current?.botUsername || DEFAULT_TELEGRAM_BOT_USERNAME}?start=${row.telegram_connect_code}`
              : null,
            configurationError: current?.configurationError ?? null,
          }));
          if (row.telegram_chat_id) {
            setTelegramWaiting(false);
            stopTgPolling();
            if (wasWaitingForTelegram) toast.success("Telegram সফলভাবে সংযুক্ত হয়েছে");
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, setTelegramWaiting, stopTgPolling]);

  useEffect(() => {
    return () => stopTgPolling();
  }, [stopTgPolling]);

  useEffect(() => {
    if (!tg?.connected) return;
    stopTgPolling();
    setTelegramWaiting(false);
  }, [tg?.connected, setTelegramWaiting, stopTgPolling]);



  const phoneNorm = phone.replace(/\D/g, "");
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneNorm);
  const payNorm = paymentNumber.replace(/\D/g, "");
  const payValid = /^01[3-9]\d{8}$/.test(payNorm);
  const normalizedEmail = emailDraft.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const emailChanged = profile ? normalizedEmail !== (profile.email ?? "").toLowerCase() : false;

  async function copy(v: string, label: string) {
    try { await navigator.clipboard.writeText(v); setCopied(label); toast.success("কপি হয়েছে"); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  async function handleSave() {
    if (!profile) return;
    if (fullName.trim().length < 2) return toast.error("পুরো নাম দিন");
    if (!emailValid) return toast.error("সঠিক ইমেইল দিন");
    if (!phoneValid) return toast.error("সঠিক ফোন নাম্বার দিন");
    if (!payValid) return toast.error("সঠিক পেমেন্ট নাম্বার দিন");
    setSaving(true);
    const tId = toast.loading("সেভ হচ্ছে…");
    try {
      let nextProfile = profile;
      if (emailChanged) {
        const emailRes = await updateEmailFn({ data: { email: normalizedEmail } });
        nextProfile = { ...nextProfile, email: emailRes.email ?? normalizedEmail, email_verified: false };
      }
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        phone: phoneNorm,
        payment_method: paymentMethod,
        payment_number: payNorm,
      }).eq("id", profile.id);
      if (error) throw error;
      toast.success("সফলভাবে সেভ হয়েছে", { id: tId });
      setEmailDraft(nextProfile.email ?? normalizedEmail);
      setEmailEditing(false);
      setProfile({ ...nextProfile, full_name: fullName.trim(), phone: phoneNorm, payment_method: paymentMethod, payment_number: payNorm });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সেভ ব্যর্থ", { id: tId });
    } finally {
      setSaving(false);
    }
  }

  async function handleTgDisconnect() {
    setTgBusy(true);
    const tId = toast.loading("বিচ্ছিন্ন হচ্ছে…");
    try {
      await disconnectTgFn();
      toast.success("Telegram বিচ্ছিন্ন হয়েছে", { id: tId });
      await loadTg(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: tId });
    } finally { setTgBusy(false); }
  }
  async function handleTgTest() {
    setTgBusy(true);
    const tId = toast.loading("Test message পাঠানো হচ্ছে…");
    try {
      await testTgFn();
      toast.success("Telegram-এ message পাঠানো হয়েছে", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: tId });
    } finally { setTgBusy(false); }
  }

  async function handleChangePassword() {
    if (pwNew.length < 6) return toast.error("নতুন পাসওয়ার্ড অন্তত ৬ অক্ষর");
    setPwBusy(true);
    const tId = toast.loading("পরিবর্তন হচ্ছে…");
    try {
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) throw error;
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে", { id: tId });
      setPwOld(""); setPwNew("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: tId });
    } finally {
      setPwBusy(false);
    }
  }

  if (!profile) return <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />;

  const telegramConnected = tg?.connected === true;
  const telegramLoading = !tgReady && !tg;

  // Profile completion percentage
  const checks = [
    { key: "নাম",            ok: !!profile.full_name && profile.full_name.trim().length >= 2 },
    { key: "ইমেইল",          ok: !!profile.email },
    { key: "ইমেইল ভেরিফাইড", ok: !!profile.email_verified },
    { key: "ফোন",           ok: /^01[3-9]\d{8}$/.test((profile.phone ?? "").replace(/\D/g, "")) },
    { key: "পেমেন্ট মেথড",   ok: !!profile.payment_method },
    { key: "পেমেন্ট নাম্বার", ok: /^01[3-9]\d{8}$/.test((profile.payment_number ?? "").replace(/\D/g, "")) },
    { key: "রেফারেল কোড",    ok: !!profile.referral_code },
  ];
  const completePct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const missing = checks.filter((c) => !c.ok).map((c) => c.key);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">PROFILE</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">আমার প্রোফাইল</h1>
        <p className="mt-1 text-sm text-slate-600">তথ্য আপডেট ও নিরাপত্তা সেটিংস।</p>
      </div>

      {/* Identity card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-4">
          {/* Circular progress avatar */}
          <div className="relative grid h-20 w-20 shrink-0 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(completePct / 100) * 100.53} 100.53`} />
            </svg>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur text-xl font-bold ring-1 ring-white/40">
              {(profile.full_name ?? "S")[0]?.toUpperCase()}
            </div>
            <span className="absolute -bottom-1 right-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-rose-600 shadow">
              {completePct}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="bn-display text-xl truncate">{profile.full_name || "—"}</p>
              {activePkg && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow ring-1 ring-white/40">
                  <Crown className="h-3 w-3" />
                  {activePkg.name}
                </span>
              )}
            </div>
            <p className="text-xs text-white/90 truncate">{profile.email}</p>
            <button onClick={() => copy(profile.user_code, "uc")} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-mono">
              {profile.user_code} {copied === "uc" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

        </div>

        {/* Completion progress strip */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] text-white/90">
            <span className="font-semibold">প্রোফাইল সম্পূর্ণতা</span>
            <span className="font-bold">{completePct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-white to-emerald-300 transition-all duration-500" style={{ width: `${completePct}%` }} />
          </div>
          {missing.length > 0 && (
            <p className="mt-1.5 text-[10px] text-white/85">বাকি: {missing.join(" · ")}</p>
          )}
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/15 backdrop-blur p-2">
            <Wallet className="mx-auto h-4 w-4" />
            <p className="bn-display mt-1 text-sm">৳{Number(profile.balance).toFixed(0)}</p>
            <p className="text-[10px] text-white/80">ব্যালেন্স</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-2">
            <TrendingUp className="mx-auto h-4 w-4" />
            <p className="bn-display mt-1 text-sm">৳{Number(profile.total_earned).toFixed(0)}</p>
            <p className="text-[10px] text-white/80">মোট আয়</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-2">
            <Lock className="mx-auto h-4 w-4" />
            <p className="bn-display mt-1 text-sm">৳{Number(profile.locked_balance ?? 0).toFixed(0)}</p>
            <p className="text-[10px] text-white/80">লকড</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-soft">
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2"><UserIcon className="h-5 w-5 text-rose-500" /> ব্যক্তিগত তথ্য</h2>
        <Field label="পুরো নাম" icon={UserIcon}>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="profile-input" />
        </Field>
        <Field label="ইমেইল" icon={Mail}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 gap-2">
              <input
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                disabled={!emailEditing}
                type="email"
                className={cn(
                  "profile-input flex-1 font-mono",
                  !emailEditing && "bg-slate-50 text-slate-500",
                  emailEditing && emailDraft && !emailValid && "border-rose-300 bg-rose-50/40",
                )}
              />
              <button
                type="button"
                onClick={() => {
                  if (emailEditing) setEmailDraft(profile.email ?? "");
                  setEmailEditing((v) => !v);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
              >
                <Pencil className="h-3.5 w-3.5" /> {emailEditing ? "বাতিল" : "এডিট"}
              </button>
            </div>
            {profile.email_verified ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck className="h-4 w-4" /> ভেরিফাইড
              </span>
            ) : (
              <button
                type="button"
                onClick={() => emailChanged ? toast.error("আগে পরিবর্তিত ইমেইলটি সেভ করুন") : setVerifyOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 text-xs font-bold text-white shadow hover:opacity-95"
              >
                <AlertCircle className="h-4 w-4" /> ভেরিফাই করুন
              </button>
            )}
          </div>
          {emailEditing && (
            <p className="mt-1.5 text-[11px] text-slate-500">ইমেইল পরিবর্তন করে নিচের “সেভ করুন” চাপুন, তারপর ভেরিফাই করুন।</p>
          )}
          {!profile.email_verified && (
            <p className="mt-1.5 text-[11px] text-amber-700">টাস্ক/উইথড্র করতে ইমেইল ভেরিফিকেশন আবশ্যক।</p>
          )}
        </Field>
        <Field label="ফোন নাম্বার" icon={Phone}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" maxLength={14}
            className={cn("profile-input font-mono", phone && !phoneValid && "border-rose-300 bg-rose-50/40")} />
        </Field>
      </section>

      {/* Payment info */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-soft">
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2"><Smartphone className="h-5 w-5 text-emerald-500" /> পেমেন্ট তথ্য</h2>
        <div>
          <p className="text-sm font-semibold text-slate-700">পেমেন্ট মেথড</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["bkash", "nagad", "rocket"] as Method[]).map((m) => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={cn("rounded-xl border-2 p-2.5 text-xs font-bold transition",
                  paymentMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                {m === "bkash" ? "bKash" : m === "nagad" ? "Nagad" : "Rocket"}
              </button>
            ))}
          </div>
        </div>
        <Field label="পেমেন্ট নাম্বার" icon={Phone}>
          <input value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" maxLength={14}
            className={cn("profile-input font-mono", paymentNumber && !payValid && "border-rose-300 bg-rose-50/40")} />
        </Field>
        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 py-3 text-base font-bold text-white shadow-lg disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
        </button>
      </section>

      {/* Telegram */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2">
            <Send className="h-5 w-5 text-sky-500" /> Telegram নোটিফিকেশন
          </h2>
          {telegramConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-3.5 w-3.5" /> সংযুক্ত
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
              সংযুক্ত নয়
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Telegram সংযুক্ত করলে withdraw, task approval, package approval, ও admin support reply-এর সকল notification সরাসরি আপনার Telegram-এ চলে যাবে।
        </p>

        {telegramConnected ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-sky-50 ring-1 ring-sky-200 p-3 text-sm">
              <p className="font-semibold text-sky-900">✅ সফলভাবে সংযুক্ত</p>
              {tg.username && <p className="mt-0.5 text-xs text-sky-700">@{tg.username}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleTgTest} disabled={tgBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white shadow hover:bg-sky-600 disabled:opacity-50">
                <Send className="h-4 w-4" /> Test পাঠান
              </button>
              <button onClick={handleTgDisconnect} disabled={tgBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-sm font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50">
                <Unlink className="h-4 w-4" /> বিচ্ছিন্ন করুন
              </button>
            </div>
          </div>
        ) : telegramLoading ? (
          <button
            type="button"
            disabled
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-200 py-3 text-base font-bold text-slate-700"
          >
            <Loader2 className="h-5 w-5 animate-spin" /> Telegram status যাচাই হচ্ছে…
          </button>
        ) : (
          <div className="space-y-2">
            {tg?.deepLink ? (
              <a
                href={tg.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  startTgPolling();
                  toast.message("Telegram-এ Start চাপুন", { description: "Start চাপলেই এই পেজে auto সংযুক্ত দেখাবে।" });
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-base font-bold text-white shadow-lg active:scale-[.98] transition"
              >
                {tgConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />}
                {tgConnecting ? "সংযোগ যাচাই হচ্ছে…" : "Telegram Connect করুন"}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void loadTg(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-200 py-3 text-base font-bold text-slate-700"
              >
                <Loader2 className={cn("h-5 w-5", !tgLoadError && "animate-spin")} />
                {tgLoadError ? "আবার লিংক তৈরি করুন" : "লিংক তৈরি হচ্ছে…"}
              </button>
            )}
            {tgLoadError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
                {tgLoadError}
              </p>
            )}
            {tg?.configurationError && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                {tg.configurationError}
              </p>
            )}
            <p className="text-[11px] text-slate-500 text-center">
              বাটনে চাপলে Telegram bot খুলবে → “Start” চাপুন → সংযোগ সম্পূর্ণ।
            </p>
            {tg?.connectCode && (
              <button
                type="button"
                onClick={() => copy(`/start ${tg.connectCode}`, "tgcode")}
                className="w-full rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200"
              >
                Manual code কপি করুন: /start {tg.connectCode} {copied === "tgcode" && <Check className="ml-1 inline h-3 w-3" />}
              </button>
            )}
            {tg?.deepLink && (
              <p className="text-[10px] text-slate-400 text-center font-mono break-all select-all">
                {tg.deepLink}
              </p>
            )}
          </div>
        )}
      </section>


      {/* Security */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-4 shadow-soft">
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2"><Lock className="h-5 w-5 text-amber-500" /> নিরাপত্তা</h2>
        <Field label="নতুন পাসওয়ার্ড" icon={Lock}>
          <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="অন্তত ৬ অক্ষর" className="profile-input" />
        </Field>
        <button onClick={handleChangePassword} disabled={pwBusy || pwNew.length < 6}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-base font-bold text-white shadow-lg disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {pwBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          পাসওয়ার্ড পরিবর্তন করুন
        </button>
      </section>

      <style>{`.profile-input{width:100%;border-radius:0.75rem;border:2px solid #e2e8f0;padding:0.75rem 1rem;outline:none;transition:border-color .15s}.profile-input:focus{border-color:#f43f5e}`}</style>

      <EmailVerifyModal
        email={profile.email ?? ""}
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={() => setProfile({ ...profile, email_verified: true })}
        onEmailChanged={(newEmail) => { setEmailDraft(newEmail); setProfile({ ...profile, email: newEmail, email_verified: false }); }}
      />

    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof UserIcon; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-slate-400" /> {label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
