import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Palette, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PANEL_THEMES, DEFAULT_PANEL_THEME, getPanelTheme, applyPanelTheme, savePanelTheme,
  type PanelThemeId,
} from "@/lib/panel-theme";

export const Route = createFileRoute("/_authenticated/theme")({
  head: () => ({
    meta: [
      { title: "থিম কাস্টমাইজ — Smart Click BD" },
      { name: "description", content: "নিজের পছন্দের কালার থিম বেছে নিন — প্যানেলের চেহারা সাথে সাথেই বদলে যাবে।" },
      { property: "og:title", content: "থিম কাস্টমাইজ — Smart Click BD" },
      { property: "og:description", content: "ইউজার প্যানেলের কালার থিম নিজের মতো করে সাজান।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThemePage,
});

function ThemePage() {
  const [saved, setSaved] = useState<PanelThemeId>(DEFAULT_PANEL_THEME);
  const [selected, setSelected] = useState<PanelThemeId>(DEFAULT_PANEL_THEME);

  useEffect(() => {
    const t = getPanelTheme();
    setSaved(t);
    setSelected(t);
  }, []);

  // Live preview while browsing
  const preview = (id: PanelThemeId) => {
    setSelected(id);
    applyPanelTheme(id);
  };

  const onSave = () => {
    savePanelTheme(selected);
    setSaved(selected);
    toast.success("থিম সেভ হয়েছে — আপনার প্যানেলে অ্যাপ্লাই হয়ে গেছে ✅");
  };

  const onReset = () => {
    savePanelTheme(DEFAULT_PANEL_THEME);
    setSaved(DEFAULT_PANEL_THEME);
    setSelected(DEFAULT_PANEL_THEME);
    toast.success("ডিফল্ট থিমে ফিরে গেছে");
  };

  const dirty = saved !== selected;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 p-5 text-white shadow-pop">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <h1 className="bn-display text-lg">থিম কাস্টমাইজ</h1>
        </div>
        <p className="mt-1 text-sm text-white/90">
          পছন্দের কালার থিম সিলেক্ট করুন — নিচে সেভ করলে আপনার পুরো প্যানেলে অ্যাপ্লাই হবে।
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PANEL_THEMES.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => preview(t.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                active ? "border-primary ring-2 ring-primary" : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="bn-display text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                {active && (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-1.5">
                {t.swatch.map((c) => (
                  <span
                    key={c}
                    className="h-8 flex-1 rounded-lg border border-border/60"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {saved === t.id && (
                <span className="mt-3 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  বর্তমানে সক্রিয়
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-pop backdrop-blur md:bottom-4">
        <button type="button" onClick={onSave} disabled={!dirty} className="btn-gold disabled:opacity-50">
          <Save className="h-4 w-4" /> সেভ করুন
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> ডিফল্ট
        </button>
        <p className="ml-auto text-xs text-muted-foreground">
          {dirty ? "প্রিভিউ চলছে — সেভ করলে স্থায়ী হবে" : "সব পরিবর্তন সেভ করা আছে"}
        </p>
      </div>
    </div>
  );
}
