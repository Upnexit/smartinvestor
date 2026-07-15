import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Small icon-only copy button. Copies `value` to clipboard, shows a check for 1.2s,
 * and surfaces a toast. Meant for inline placement next to short values like email,
 * phone, payment number, user code.
 */
export function CopyButton({
  value,
  label,
  className,
  size = "sm",
}: {
  value: string | null | undefined;
  label?: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const [done, setDone] = useState(false);
  const disabled = !value || value === "—";

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setDone(true);
      toast.success(`${label ?? "কপি"} কপি হয়েছে`);
      setTimeout(() => setDone(false), 1200);
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  const dim = size === "xs" ? "h-6 w-6" : "h-7 w-7";
  const icon = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label ? `${label} কপি` : "কপি"}
      aria-label={label ? `${label} কপি করুন` : "কপি করুন"}
      className={cn(
        "inline-grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white text-slate-500 hover:text-sky-700 hover:bg-sky-50 hover:ring-sky-200 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm",
        dim,
        className,
      )}
    >
      {done ? <Check className={cn(icon, "text-emerald-600")} /> : <Copy className={icon} />}
    </button>
  );
}
