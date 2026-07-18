import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  DatabaseBackup, Loader2, Download, RefreshCcw, Cloud, FileJson, ExternalLink,
  CheckCircle2, AlertTriangle, HardDrive, Clock, Upload, ShieldAlert, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { GradientButton } from "@/components/admin/AdminUI";
import {
  adminTriggerBackup, adminListBackups, adminDownloadBackup,
  adminRestoreBackup, adminRestoreFromDrive,
} from "@/lib/admin-backup.functions";

export const Route = createFileRoute("/admin/backup")({
  ssr: false,
  head: () => ({ meta: [{ title: "ডেটা ব্যাকআপ — Admin" }] }),
  component: BackupPage,
});

type BackupFile = {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string | null;
};

function formatBytes(bytes: number): string {
  if (!bytes || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("bn-BD", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Dhaka",
    });
  } catch {
    return iso;
  }
}

function BackupPage() {
  const triggerFn = useServerFn(adminTriggerBackup);
  const listFn = useServerFn(adminListBackups);
  const downloadFn = useServerFn(adminDownloadBackup);
  const restoreFn = useServerFn(adminRestoreBackup);
  const restoreDriveFn = useServerFn(adminRestoreFromDrive);

  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [lastResult, setLastResult] = useState<null | {
    mode: string;
    total_rows: number;
    inserted: Record<string, number>;
    errors: Record<string, string>;
  }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listFn();
      setFiles(res.files ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ব্যাকআপ লিস্ট আনতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleTrigger() {
    if (busy) return;
    setBusy(true);
    const t = toast.loading("ব্যাকআপ চলছে… সব টেবিল প্রসেস হচ্ছে");
    try {
      const res = await triggerFn();
      toast.success(
        `ব্যাকআপ সম্পন্ন — ${res.file.name} (${formatBytes(res.size_bytes)})`,
        { id: t }
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ব্যাকআপ ব্যর্থ হয়েছে", { id: t });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(file: BackupFile) {
    if (downloading) return;
    setDownloading(file.id);
    const t = toast.loading(`${file.name} ডাউনলোড হচ্ছে…`);
    try {
      const { content } = await downloadFn({ data: { fileId: file.id } });
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড সম্পন্ন", { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ডাউনলোড ব্যর্থ", { id: t });
    } finally {
      setDownloading(null);
    }
  }

  async function runRestore(runner: () => Promise<{
    mode: string; total_rows: number; inserted: Record<string, number>;
    skipped: Record<string, number>; errors: Record<string, string>;
  }>, label: string) {
    if (restoring) return;
    const confirmMsg =
      restoreMode === "replace"
        ? `⚠️ REPLACE mode: ${label} থেকে restore করলে বর্তমান সব data মুছে যাবে ও backup-এর data বসানো হবে। নিশ্চিত?`
        : `MERGE mode: ${label} থেকে restore করলে existing rows update হবে ও নতুন rows যোগ হবে। চালিয়ে যাবেন?`;
    if (!window.confirm(confirmMsg)) return;
    setRestoring(true);
    setLastResult(null);
    const t = toast.loading("Restore চলছে… ডাটা import হচ্ছে");
    try {
      const res = await runner();
      const errCount = Object.keys(res.errors ?? {}).length;
      setLastResult(res);
      if (errCount === 0) {
        toast.success(`Restore সফল — ${res.total_rows} rows প্রসেস হয়েছে`, { id: t });
      } else {
        toast.warning(`Restore আংশিক সফল — ${errCount} টি error, details নিচে`, { id: t });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore ব্যর্থ", { id: t });
    } finally {
      setRestoring(false);
    }
  }

  async function handleUploadRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("শুধুমাত্র .json backup ফাইল সাপোর্টেড");
      e.target.value = "";
      return;
    }
    const content = await file.text();
    await runRestore(
      () => restoreFn({ data: { content, mode: restoreMode } }),
      `আপলোড করা ফাইল "${file.name}"`
    );
    e.target.value = "";
  }

  async function handleDriveRestore(file: BackupFile) {
    await runRestore(
      () => restoreDriveFn({ data: { fileId: file.id, mode: restoreMode } }),
      `Drive ফাইল "${file.name}"`
    );
  }

  const totalSize = files.reduce((s, f) => s + (f.size ? Number(f.size) : 0), 0);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      {/* Header */}
      <div className="rounded-3xl bg-white p-5 shadow-pop ring-1 ring-emerald-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40">
              <DatabaseBackup className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bn-display text-2xl text-slate-900">ডেটা ব্যাকআপ</h1>
              <p className="text-sm text-slate-500">
                Google Drive এ স্বয়ংক্রিয় ও ম্যানুয়াল ব্যাকআপ ম্যানেজমেন্ট
              </p>
            </div>
          </div>
          <GradientButton accent="emerald" onClick={handleTrigger} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            এখনই ব্যাকআপ নিন
          </GradientButton>
        </div>

        {/* Info strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold">অটো শিডিউল</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">প্রতিদিন রাত ২টা (BD Time)</p>
          </div>
          <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
            <div className="flex items-center gap-2 text-sky-700">
              <FileJson className="h-4 w-4" />
              <span className="text-xs font-semibold">মোট ব্যাকআপ ফাইল</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{files.length} টি</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
            <div className="flex items-center gap-2 text-amber-700">
              <HardDrive className="h-4 w-4" />
              <span className="text-xs font-semibold">মোট সাইজ</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{formatBytes(totalSize)}</p>
          </div>
        </div>
      </div>

      {/* Restore section */}
      <div className="rounded-3xl bg-white p-5 shadow-pop ring-1 ring-rose-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-lg shadow-rose-500/40">
              <Undo2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="bn-display text-xl text-slate-900">ডেটা রিস্টোর</h2>
              <p className="text-sm text-slate-500">
                Backup JSON আপলোড করে সরাসরি database-এ import করুন
              </p>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl p-3 ring-2 transition ${
            restoreMode === "merge"
              ? "bg-emerald-50 ring-emerald-400"
              : "bg-slate-50 ring-transparent hover:ring-slate-200"
          }`}>
            <input
              type="radio"
              className="sr-only"
              checked={restoreMode === "merge"}
              onChange={() => setRestoreMode("merge")}
            />
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> Merge (নিরাপদ)
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Existing rows update হবে (id ম্যাচ করলে), নতুন rows insert হবে। কিছু delete হবে না।
            </p>
          </label>
          <label className={`cursor-pointer rounded-2xl p-3 ring-2 transition ${
            restoreMode === "replace"
              ? "bg-rose-50 ring-rose-400"
              : "bg-slate-50 ring-transparent hover:ring-slate-200"
          }`}>
            <input
              type="radio"
              className="sr-only"
              checked={restoreMode === "replace"}
              onChange={() => setRestoreMode("replace")}
            />
            <div className="flex items-center gap-2 font-semibold text-rose-800">
              <ShieldAlert className="h-4 w-4" /> Replace (বিপজ্জনক)
            </div>
            <p className="mt-1 text-xs text-slate-600">
              সব existing data delete করে backup থেকে fresh insert হবে। System crash-এর পরে ব্যবহার করুন।
            </p>
          </label>
        </div>

        {/* Upload */}
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleUploadRestore}
            disabled={restoring}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-700">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Backup JSON ফাইল আপলোড করুন</p>
                <p className="text-xs text-slate-500">
                  Google Drive থেকে download করা <code className="rounded bg-white px-1">.json</code> ফাইল সিলেক্ট করুন
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-500/30 hover:from-rose-600 hover:to-orange-700 disabled:opacity-60"
            >
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              ফাইল বেছে নিন
            </button>
          </div>
        </div>

        {/* Result */}
        {lastResult && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">
                Restore Result — {lastResult.mode.toUpperCase()} mode • {lastResult.total_rows} rows প্রসেসড
              </span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-auto">
              {Object.entries(lastResult.inserted).map(([tbl, n]) => (
                <div key={tbl} className="flex items-center justify-between rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-100">
                  <span className="font-mono text-slate-600">{tbl}</span>
                  <span className="font-bold text-emerald-700">{n}</span>
                </div>
              ))}
            </div>
            {Object.keys(lastResult.errors).length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-rose-700">
                  ⚠️ {Object.keys(lastResult.errors).length} টি error দেখুন
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                  {Object.entries(lastResult.errors).map(([k, v]) => (
                    <div key={k} className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-800">
                      <span className="font-mono font-semibold">{k}:</span> {v}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-100">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">রিস্টোর করার নিয়ম:</p>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>System crash হলে প্রথমে schema ঠিক আছে কিনা নিশ্চিত করুন (নতুন Supabase হলে <code className="rounded bg-slate-100 px-1">complete-database-setup.sql</code> চালান)</li>
              <li>নিচের তালিকা থেকে সবচেয়ে সাম্প্রতিক backup <b>Restore</b> করুন, অথবা download করে upload করুন</li>
              <li><b>Merge</b> — শুধু নতুন data যোগ / update। <b>Replace</b> — বর্তমান data মুছে ফেলবে</li>
              <li>Restore-এর আগে সবসময় নতুন backup নিন (safety net)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Files list */}
      <div className="rounded-3xl bg-white p-5 shadow-pop ring-1 ring-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="bn-display text-lg text-slate-900">সব ব্যাকআপ ফাইল</h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            রিফ্রেশ
          </button>
        </div>

        {loading ? (
          <div className="py-12 grid place-items-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="mt-2 text-sm">ফাইল আনা হচ্ছে…</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 grid place-items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <FileJson className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-slate-500">এখনো কোনো ব্যাকআপ নেই</p>
            <p className="text-xs text-slate-400">উপরের বাটন দিয়ে প্রথম ব্যাকআপ তৈরি করুন</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 hover:ring-emerald-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
                    <FileJson className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(file.createdTime)}
                      </span>
                      {file.size && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatBytes(Number(file.size))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://drive.google.com/file/d/${file.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    title="Google Drive এ দেখুন"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Drive
                  </a>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.id}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
                  >
                    {downloading === file.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download
                  </button>
                  <button
                    onClick={() => handleDriveRestore(file)}
                    disabled={restoring}
                    title={`${restoreMode.toUpperCase()} mode-এ এই ব্যাকআপ থেকে restore করুন`}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-rose-500/30 hover:from-rose-600 hover:to-orange-700 disabled:opacity-60"
                  >
                    {restoring ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
        <div className="flex items-start gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 flex-none mt-0.5" />
          <p>
            সব ব্যাকআপ Google Drive এর <b>TaskEarn-Auto-Backups</b> ফোল্ডারে স্বয়ংক্রিয়ভাবে সেভ হয়।
            ভবিষ্যতে প্রজেক্ট recover করতে হলে যেকোনো ফাইল ডাউনলোড করে ব্যবহার করতে পারবেন।
          </p>
        </div>
      </div>
    </div>
  );
}
