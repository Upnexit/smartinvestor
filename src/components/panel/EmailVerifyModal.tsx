import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, ShieldCheck, X, Pencil, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailOtp, verifyEmailOtp, updateMyEmail } from "@/lib/emailOtp.functions";

export function EmailVerifyModal({
  email,
  open,
  onClose,
  onVerified,
  onEmailChanged,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  onEmailChanged?: (newEmail: string) => void;
}) {
  const sendFn = useServerFn(sendEmailOtp);
  const verifyFn = useServerFn(verifyEmailOtp);
  const updateFn = useServerFn(updateMyEmail);

  const [currentEmail, setCurrentEmail] = useState(email);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(email);
  const [savingEmail, setSavingEmail] = useState(false);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!open) {
      setSent(false);
      setDigits(["", "", "", "", "", ""]);
      setCooldown(0);
      setEditMode(false);
    } else {
      setCurrentEmail(email);
      setEditValue(email);
    }
  }, [open, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!open) return null;

  const code = digits.join("");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editValue.trim());

  async function handleSaveEmail() {
    if (!emailValid) return toast.error("সঠিক ইমেইল দিন");
    setSavingEmail(true);
    const id = toast.loading("ইমেইল আপডেট হচ্ছে…");
    try {
      const res = await updateFn({ data: { email: editValue.trim() } });
      const next = res.email ?? editValue.trim();
      setCurrentEmail(next);
      setEditMode(false);
      setSent(false);
      setDigits(["", "", "", "", "", ""]);
      onEmailChanged?.(next);
      toast.success(res.changed ? "ইমেইল আপডেট হয়েছে" : "ইমেইল অপরিবর্তিত", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id });
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSend() {
    setSending(true);
    const id = toast.loading("কোড পাঠানো হচ্ছে…");
    try {
      await sendFn({ data: {} });
      toast.success("কোড আপনার ইমেইলে পাঠানো হয়েছে", { id });
      setSent(true);
      setCooldown(60);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ব্যর্থ";
      toast.error(msg.includes("Unauthorized") ? "সেশন মেয়াদ শেষ — আবার লগইন করুন" : msg, { id });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return toast.error("৬-সংখ্যার কোড দিন");
    setVerifying(true);
    const id = toast.loading("ভেরিফাই হচ্ছে…");
    try {
      await verifyFn({ data: { code } });
      toast.success("ইমেইল ভেরিফাইড ✅", { id });
      onVerified();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id });
    } finally {
      setVerifying(false);
    }
  }

  function setDigit(i: number, v: string) {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (t.length) {
      e.preventDefault();
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < t.length; i++) next[i] = t[i];
      setDigits(next);
      inputs.current[Math.min(t.length, 5)]?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 px-6 py-7 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/40">
            {sent ? <ShieldCheck className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
          </div>
          <h2 className="bn-display mt-3 text-xl">ইমেইল ভেরিফিকেশন</h2>
          <p className="mt-1 text-xs text-white/90">
            {editMode
              ? "সঠিক ইমেইলটি লিখে সেভ করুন, এরপর কোড পাঠান।"
              : sent
              ? "আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোডটি দিন।"
              : "নিচের বাটনে ক্লিক করলে আপনার ইমেইলে একটি কোড পাঠানো হবে।"}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Email row */}
          {!editMode ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">আপনার ইমেইল</p>
                <p className="truncate font-mono text-sm text-slate-900">{currentEmail}</p>
              </div>
              <button
                onClick={() => { setEditMode(true); setEditValue(currentEmail); }}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
              >
                <Pencil className="h-3 w-3" /> পরিবর্তন
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-700">নতুন ইমেইল</label>
              <input
                type="email"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-rose-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditMode(false); setEditValue(currentEmail); }}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> বাতিল
                </button>
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail || !emailValid || editValue.trim().toLowerCase() === currentEmail.toLowerCase()}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2 text-xs font-bold text-white shadow disabled:opacity-50"
                >
                  {savingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  সেভ করুন
                </button>
              </div>
            </div>
          )}

          {!editMode && !sent && (
            <button onClick={handleSend} disabled={sending}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 py-3 text-base font-bold text-white shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              কোড পাঠান
            </button>
          )}

          {!editMode && sent && (
            <>
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKey(i, e)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-14 w-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-2xl font-bold text-slate-900 outline-none focus:border-rose-500 focus:bg-white"
                  />
                ))}
              </div>

              <button onClick={handleVerify} disabled={verifying || code.length !== 6}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 py-3 text-base font-bold text-white shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                ভেরিফাই করুন
              </button>

              <div className="text-center text-xs text-slate-500">
                কোড পাননি?{" "}
                <button onClick={handleSend} disabled={sending || cooldown > 0}
                  className="font-semibold text-rose-600 disabled:text-slate-400">
                  {cooldown > 0 ? `আবার পাঠান (${cooldown}s)` : "আবার পাঠান"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
