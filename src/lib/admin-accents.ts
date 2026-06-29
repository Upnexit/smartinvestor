export type AccentKey =
  | "amber" | "sky" | "emerald" | "fuchsia" | "orange" | "pink"
  | "rose" | "purple" | "indigo" | "lime" | "teal" | "cyan" | "slate";

export type Accent = {
  /** main gradient from/via/to classes */
  gradient: string;
  /** soft top accent bar (1.5px) */
  bar: string;
  /** chip background (icon tile) */
  chip: string;
  /** glow shadow class */
  glow: string;
  /** soft pastel background tint */
  soft: string;
  /** ring color when active */
  ring: string;
  /** label / text accent */
  text: string;
};

export const ACCENTS: Record<AccentKey, Accent> = {
  amber:   { gradient: "from-amber-500 via-orange-500 to-red-500",        bar: "from-amber-400 to-red-500",       chip: "from-amber-500 to-orange-600",     glow: "shadow-orange-500/30", soft: "bg-amber-50",   ring: "ring-amber-300",   text: "text-amber-700" },
  sky:     { gradient: "from-sky-500 via-blue-600 to-indigo-600",         bar: "from-sky-400 to-indigo-600",      chip: "from-sky-500 to-blue-600",         glow: "shadow-blue-500/30",   soft: "bg-sky-50",     ring: "ring-sky-300",     text: "text-sky-700" },
  emerald: { gradient: "from-emerald-500 via-green-600 to-teal-600",      bar: "from-emerald-400 to-teal-600",    chip: "from-emerald-500 to-green-600",    glow: "shadow-emerald-500/30",soft: "bg-emerald-50", ring: "ring-emerald-300", text: "text-emerald-700" },
  fuchsia: { gradient: "from-fuchsia-500 via-pink-600 to-rose-600",       bar: "from-fuchsia-400 to-rose-600",    chip: "from-fuchsia-500 to-pink-600",     glow: "shadow-pink-500/30",   soft: "bg-fuchsia-50", ring: "ring-fuchsia-300", text: "text-fuchsia-700" },
  orange:  { gradient: "from-orange-500 via-amber-600 to-yellow-600",     bar: "from-orange-400 to-yellow-500",   chip: "from-orange-500 to-amber-600",     glow: "shadow-orange-500/30", soft: "bg-orange-50",  ring: "ring-orange-300",  text: "text-orange-700" },
  pink:    { gradient: "from-pink-500 via-rose-600 to-red-600",           bar: "from-pink-400 to-red-600",        chip: "from-pink-500 to-rose-600",        glow: "shadow-rose-500/30",   soft: "bg-pink-50",    ring: "ring-pink-300",    text: "text-pink-700" },
  rose:    { gradient: "from-rose-500 via-red-600 to-orange-600",         bar: "from-rose-400 to-orange-600",     chip: "from-rose-500 to-red-600",         glow: "shadow-rose-500/30",   soft: "bg-rose-50",    ring: "ring-rose-300",    text: "text-rose-700" },
  purple:  { gradient: "from-purple-500 via-violet-600 to-indigo-700",    bar: "from-purple-400 to-indigo-700",   chip: "from-purple-500 to-violet-600",    glow: "shadow-violet-500/30", soft: "bg-purple-50",  ring: "ring-purple-300",  text: "text-purple-700" },
  indigo:  { gradient: "from-indigo-500 via-violet-600 to-purple-700",    bar: "from-indigo-400 to-purple-700",   chip: "from-indigo-500 to-violet-600",    glow: "shadow-indigo-500/30", soft: "bg-indigo-50",  ring: "ring-indigo-300",  text: "text-indigo-700" },
  lime:    { gradient: "from-lime-500 via-green-600 to-emerald-700",      bar: "from-lime-400 to-emerald-700",    chip: "from-lime-500 to-green-600",       glow: "shadow-lime-500/30",   soft: "bg-lime-50",    ring: "ring-lime-300",    text: "text-lime-700" },
  teal:    { gradient: "from-teal-500 via-cyan-600 to-sky-700",           bar: "from-teal-400 to-sky-700",        chip: "from-teal-500 to-cyan-600",        glow: "shadow-teal-500/30",   soft: "bg-teal-50",    ring: "ring-teal-300",    text: "text-teal-700" },
  slate:   { gradient: "from-slate-600 via-slate-700 to-slate-900",       bar: "from-slate-400 to-slate-900",     chip: "from-slate-600 to-slate-800",      glow: "shadow-slate-500/30",  soft: "bg-slate-50",   ring: "ring-slate-300",   text: "text-slate-700" },
};
