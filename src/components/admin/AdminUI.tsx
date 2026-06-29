import { type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";

/* ---------- AdminCard ---------- */
export function AdminCard({
  children, className, accent = "amber", interactive = false,
}: { children: ReactNode; className?: string; accent?: AccentKey; interactive?: boolean }) {
  const a = ACCENTS[accent];
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-soft animate-admin-pop transition-all duration-300",
      interactive && "hover:-translate-y-0.5 hover:shadow-pop",
      className,
    )}>
      <span className={cn("absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r", a.bar)} />
      {children}
    </div>
  );
}

/* ---------- AdminPageHeader ---------- */
export function AdminPageHeader({
  title, subtitle, accent = "amber", Icon, action, badge,
}: {
  title: string; subtitle?: string; accent?: AccentKey;
  Icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode; badge?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white/95 p-4 sm:p-5 shadow-soft animate-admin-pop",
    )}>
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", a.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
              a.chip, a.glow,
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="bn-display text-xl sm:text-2xl text-slate-900 truncate">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/* ---------- StatTile ---------- */
export function StatTile({
  label, value, hint, accent = "amber", Icon,
}: {
  label: string; value: ReactNode; hint?: string; accent?: AccentKey;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white p-4 shadow-soft animate-admin-pop transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop",
    )}>
      <span className={cn("absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r", a.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={cn("mt-1 bn-display text-2xl sm:text-3xl bg-gradient-to-br bg-clip-text text-transparent", a.chip)}>
            {value}
          </p>
          {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        </div>
        <div className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6",
          a.chip, a.glow,
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ---------- AdminSectionTitle ---------- */
export function AdminSectionTitle({ title, hint, accent = "slate" }: { title: string; hint?: string; accent?: AccentKey }) {
  const a = ACCENTS[accent];
  return (
    <div className="flex items-end justify-between gap-3 mb-3 mt-2">
      <div>
        <h2 className="bn-display text-lg text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md bg-gradient-to-r text-white", a.chip)}>Live</span>
    </div>
  );
}

/* ---------- GradientButton ---------- */
type BtnSize = "sm" | "md" | "lg" | "icon";
export function GradientButton({
  accent = "amber", size = "md", className, busy, disabled, type = "button", children, onClick, title,
}: {
  accent?: AccentKey; size?: BtnSize; className?: string; busy?: boolean; disabled?: boolean;
  type?: "button" | "submit"; children: ReactNode; onClick?: () => void; title?: string;
}) {
  const a = ACCENTS[accent];
  const sizeCls =
    size === "sm" ? "h-8 px-3 text-xs gap-1.5"
    : size === "lg" ? "h-12 px-5 text-base gap-2"
    : size === "icon" ? "h-9 w-9"
    : "h-10 px-4 text-sm gap-2";
  return (
    <button type={type} disabled={disabled || busy} title={title} onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl font-bold text-white shadow-lg transition-all duration-300 active:scale-[0.98]",
        "bg-gradient-to-br hover:scale-[1.02] hover:shadow-xl",
        a.chip, a.glow,
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        sizeCls, className,
      )}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

/* ---------- SoftButton (tertiary) ---------- */
export function SoftButton({
  className, onClick, children, accent = "slate", type = "button",
}: { className?: string; onClick?: () => void; children: ReactNode; accent?: AccentKey; type?: "button" | "submit" }) {
  const a = ACCENTS[accent];
  return (
    <button type={type} onClick={onClick} className={cn(
      "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-0.5",
      "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700",
      a.text, className,
    )}>{children}</button>
  );
}

/* ---------- ConfirmDeleteModal ---------- */
export function ConfirmDeleteModal({
  open, onClose, onConfirm, title = "নিশ্চিত?", body, busy,
}: { open: boolean; onClose: () => void; onConfirm: () => void; title?: string; body?: ReactNode; busy?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
        <div className="flex items-start justify-between">
          <h3 className="bn-display text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 text-sm text-slate-600">{body}</div>
        <div className="mt-4 flex gap-2">
          <SoftButton className="flex-1" onClick={onClose}>বাতিল</SoftButton>
          <GradientButton accent="rose" className="flex-1" busy={busy} onClick={onConfirm}>হ্যাঁ, ডিলিট</GradientButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shimmer skeleton ---------- */
export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl bg-amber-50/40", className)} />;
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  Icon, title, hint, accent = "amber", action,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string; hint?: string; accent?: AccentKey; action?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-2xl border border-dashed border-amber-200 bg-white/60 p-8 text-center animate-admin-pop">
      <div className={cn("mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", a.chip, a.glow)}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="bn-display mt-3 text-lg text-slate-900">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </div>
  );
}
