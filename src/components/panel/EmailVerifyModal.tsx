import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/email-otp.functions";

export function EmailVerifyModal({
  email,
  open,
  onClose,
  onVerified,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const sendFn = useServerFn(sendEmailOtp);
  const verifyFn = useServerFn(verifyEmailOtp);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!open) {
      setSent(false); setDigits(["", "", "", "", "", ""]); setCooldown(0);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!open) return null;

  const code = digits.join("");

  async function handleSend() {
    setSending(true);
    const id = toast.loading("কোড পাঠানো হচ্ছে…");
    try {
      await sendFn();
      toast.success("কোড আপনার ইমেইলে পাঠানো হয়েছে", { id });
      setSent(true);
      setCooldown(60);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id });
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
            {sent ? "আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোডটি দিন।" : "নিচের বাটনে ক্লিক করলে আপনার ইমেইলে একটি কোড পাঠানো হবে।"}
          </p>
          <p className="mt-2 inline-block rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-mono">{email}</p>
        </div>

        <div className="space-y-4 p-6">
          {!sent ? (
            <button onClick={handleSend} disabled={sending}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-base font-bold text-white shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
              কোড পাঠান
            </button>
          ) : (
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
