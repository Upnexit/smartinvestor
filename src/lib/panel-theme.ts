/**
 * User Panel Theme
 * ----------------
 * ইউজার নিজের প্যানেলের কালার থিম বেছে নিতে পারে।
 * থিম localStorage-এ সেভ হয় এবং <html data-panel-theme="..."> এ apply হয়।
 */

export type PanelThemeId =
  | "sunrise" | "ocean" | "emerald" | "royal" | "rose" | "midnight" | "sand" | "graphite";

export type PanelTheme = {
  id: PanelThemeId;
  name: string;
  desc: string;
  swatch: string[];
  dark?: boolean;
};

export const PANEL_THEMES: PanelTheme[] = [
  { id: "sunrise",  name: "সানরাইজ (ডিফল্ট)", desc: "সোনালি-কমলা উষ্ণ আভা", swatch: ["#f8fafc", "#fde68a", "#fb923c", "#f43f5e"] },
  { id: "ocean",    name: "ওশান ব্লু",        desc: "শান্ত নীল ও আকাশি",   swatch: ["#f0f9ff", "#bae6fd", "#3b82f6", "#6366f1"] },
  { id: "emerald",  name: "এমারেল্ড",         desc: "সবুজ ও প্রশান্ত",     swatch: ["#f0fdf4", "#a7f3d0", "#10b981", "#14b8a6"] },
  { id: "royal",    name: "রয়্যাল পার্পল",    desc: "বেগুনি রাজকীয় লুক",   swatch: ["#faf5ff", "#e9d5ff", "#8b5cf6", "#d946ef"] },
  { id: "rose",     name: "রোজ পিংক",         desc: "গোলাপি কোমল টোন",     swatch: ["#fff1f2", "#fecdd3", "#f43f5e", "#fb7185"] },
  { id: "midnight", name: "মিডনাইট ডার্ক",    desc: "চোখে আরামদায়ক ডার্ক", swatch: ["#0f172a", "#1e293b", "#3b82f6", "#22d3ee"], dark: true },
  { id: "sand",     name: "স্যান্ড গোল্ড",     desc: "নরম বালুরঙা",         swatch: ["#fefce8", "#fef08a", "#eab308", "#f59e0b"] },
  { id: "graphite", name: "গ্রাফাইট",         desc: "মিনিমাল ধূসর",        swatch: ["#f8fafc", "#e2e8f0", "#64748b", "#334155"] },
];

export const DEFAULT_PANEL_THEME: PanelThemeId = "sunrise";
const STORAGE_KEY = "panel_theme";

export function isPanelThemeId(v: unknown): v is PanelThemeId {
  return typeof v === "string" && PANEL_THEMES.some((t) => t.id === v);
}

export function getPanelTheme(): PanelThemeId {
  if (typeof window === "undefined") return DEFAULT_PANEL_THEME;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return isPanelThemeId(v) ? v : DEFAULT_PANEL_THEME;
}

export function applyPanelTheme(id: PanelThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-panel-theme", id);
}

export function clearPanelTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-panel-theme");
}

export function savePanelTheme(id: PanelThemeId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
  applyPanelTheme(id);
}
