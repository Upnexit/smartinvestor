import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock,
  ShieldCheck, AlertCircle, RefreshCw, Eye, Loader2, ArrowUpRight,
  Trophy, DollarSign, Wallet, Check, X, ExternalLink, Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  listAllSlicesAdmin,
  saveSliceAdmin,
  deleteSliceAdmin,
  listSpinClaimsAdmin,
  approveSpinClaimAdmin,
  rejectSpinClaimAdmin,
  type SpinSlice,
  type SpinHistoryItem,
} from "@/lib/spin-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/spin")({
  head: () => ({ meta: [{ title: "স্পিন ম্যানেজমেন্ট — Smart Click BD Admin" }] }),
  component: AdminSpinPage,
});

export function AdminSpinPage() {
  const [activeTab, setActiveTab] = useState<"slices" | "deposits" | "history">("deposits");
  const [adminId, setAdminId] = useState<string | null>(null);

  // Slices state
  const [slices, setSlices] = useState<SpinSlice[]>([]);
  const [slicesLoading, setSlicesLoading] = useState(true);
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  const [editingSlice, setEditingSlice] = useState<Partial<SpinSlice> | null>(null);
  const [savingSlice, setSavingSlice] = useState(false);

  // Claims state
  const [claims, setClaims] = useState<SpinHistoryItem[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("deposit_submitted");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Overall stats
  const [stats, setStats] = useState({
    totalSpins: 0,
    totalWon: 0,
    pendingDeposits: 0,
    approvedCount: 0,
  });

  const loadAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setAdminId(data.user.id);
  };

  const loadSlices = async () => {
    setSlicesLoading(true);
    const data = await listAllSlicesAdmin();
    setSlices(data);
    setSlicesLoading(false);
  };

  const loadClaims = async () => {
    setClaimsLoading(true);
    const data = await listSpinClaimsAdmin(statusFilter);
    setClaims(data);
    setClaimsLoading(false);

    // Compute stats from all claims
    const all = await listSpinClaimsAdmin("all");
    const totalWon = all.reduce((sum, c) => sum + Number(c.won_amount || 0), 0);
    const pending = all.filter((c) => c.status === "deposit_submitted").length;
    const approved = all.filter((c) => c.status === "approved").length;

    setStats({
      totalSpins: all.length,
      totalWon,
      pendingDeposits: pending,
      approvedCount: approved,
    });
  };

  useEffect(() => {
    loadAdmin();
    loadSlices();
  }, []);

  useEffect(() => {
    loadClaims();
  }, [statusFilter]);

  // Handle Save Slice
  const handleSaveSlice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlice || !editingSlice.label || editingSlice.amount == null) {
      toast.error("সঠিক নাম ও টাকার পরিমাণ দিন");
      return;
    }

    setSavingSlice(true);
    const res = await saveSliceAdmin({
      id: editingSlice.id,
      label: editingSlice.label,
      amount: Number(editingSlice.amount),
      color: editingSlice.color || "#F59E0B",
      text_color: editingSlice.text_color || "#FFFFFF",
      weight: Number(editingSlice.weight || 10),
      is_active: editingSlice.is_active ?? true,
      sort_order: Number(editingSlice.sort_order || 0),
    });

    setSavingSlice(false);
    if (!res.success) {
      toast.error(res.error || "স্লাইস সংরক্ষণ করা সম্ভব হয়নি");
      return;
    }

    toast.success("স্লাইস সফলভাবে সংরক্ষণ করা হয়েছে");
    setSliceModalOpen(false);
    setEditingSlice(null);
    loadSlices();
  };

  // Handle Delete Slice
  const handleDeleteSlice = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই স্লাইসটি মুছে ফেলতে চান?")) return;
    const res = await deleteSliceAdmin(id);
    if (!res.success) {
      toast.error(res.error || "মুছে ফেলা যায়নি");
      return;
    }
    toast.success("স্লাইস মুছে ফেলা হয়েছে");
    loadSlices();
  };

  // Handle Approve Claim
  const handleApproveClaim = async (spinId: string) => {
    if (!adminId) {
      toast.error("অ্যাডমিন আইডি পাওয়া যায়নি");
      return;
    }
    if (!confirm("আপনি কি এই ডিপোজিট অনুমোদন করতে চান? ইউজারের মূল ব্যালেন্সে পুরস্কারের সম্পূর্ণ টাকা ক্রেডিট হবে।")) {
      return;
    }

    setProcessingId(spinId);
    const res = await approveSpinClaimAdmin(spinId, adminId);
    setProcessingId(null);

    if (!res.success) {
      toast.error(res.error || "অনুমোদন ব্যর্থ হয়েছে");
      return;
    }

    toast.success(res.message || "স্পিন ডিপোজিট সফলভাবে অনুমোদিত হয়েছে!");
    loadClaims();
  };

  // Handle Reject Claim
  const handleRejectClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !rejectTargetId) return;

    setProcessingId(rejectTargetId);
    const res = await rejectSpinClaimAdmin(rejectTargetId, adminId, rejectReason || "তথ্য অসঙ্গতি");
    setProcessingId(null);
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReason("");

    if (!res.success) {
      toast.error(res.error || "বাতিল করতে সমস্যা হয়েছে");
      return;
    }

    toast.success("স্পিন বাতিল করা হয়েছে");
    loadClaims();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎡</span>
            <h1 className="text-2xl font-black text-slate-900">স্পিন হুইল ম্যানেজমেন্ট</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            ২৪ ঘণ্টার লাকি স্পিনের স্লাইস কনফিগারেশন ও ইউজার ডিপোজিট অনুমোদন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadSlices();
              loadClaims();
            }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
            title="রিফ্রেশ"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingSlice({
                label: "৳১০০",
                amount: 100,
                color: "#EC4899",
                text_color: "#FFFFFF",
                weight: 10,
                is_active: true,
                sort_order: slices.length + 1,
              });
              setSliceModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-md flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন স্লাইস যুক্ত করুন</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট স্পিন সংখ্যা</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              🎡
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalSpins} টি</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট জেতা পুরস্কার</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              ৳
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">৳ {stats.totalWon.toFixed(2)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ডিপোজিট অপেক্ষমান</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              ⏳
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{stats.pendingDeposits} টি</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">অনুমোদিত ক্লেইম</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ✅
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{stats.approvedCount} টি</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("deposits")}
          className={cn(
            "py-3 px-5 font-bold text-sm border-b-2 transition flex items-center gap-2",
            activeTab === "deposits"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>ডিপোজিট ভেরিফিকেশন</span>
          {stats.pendingDeposits > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black">
              {stats.pendingDeposits}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("slices")}
          className={cn(
            "py-3 px-5 font-bold text-sm border-b-2 transition flex items-center gap-2",
            activeTab === "slices"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>চাকার স্লাইস কনফিগারেশন ({slices.length})</span>
        </button>
      </div>

      {/* TAB 1: DEPOSIT CLAIMS VERIFICATION */}
      {activeTab === "deposits" && (
        <div>
          {/* Status Filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-slate-500">ফিল্টার:</span>
            {[
              { id: "deposit_submitted", label: "পর্যালোচনায় অপেক্ষমান" },
              { id: "approved", label: "অনুমোদিত" },
              { id: "pending_deposit", label: "ডিপোজিট দেয়নি" },
              { id: "rejected", label: "বাতিলকৃত" },
              { id: "all", label: "সকল" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "py-1.5 px-3 rounded-xl text-xs font-bold transition",
                  statusFilter === f.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {claimsLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : claims.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">কোনো ক্লেইম রিকোয়েস্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">ইউজার তথ্য</th>
                      <th className="py-3 px-4">জেতা প্রাইজ</th>
                      <th className="py-3 px-4">প্রয়োজনীয় ৫০% ডিপোজিট</th>
                      <th className="py-3 px-4">পেমেন্ট গেটওয়ে ও প্রেরক</th>
                      <th className="py-3 px-4">TrxID ও প্রমাণ</th>
                      <th className="py-3 px-4">স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.map((c) => {
                      const won = Number(c.won_amount);
                      const dep = Number(c.deposit_required);
                      const isPending = c.status === "deposit_submitted";
                      const isProcessing = processingId === c.id;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                          {/* User info */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">
                              {c.profiles?.full_name || "ইউজার"}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {c.profiles?.phone || c.profiles?.email || "—"}
                            </p>
                            {c.profiles?.user_code && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                                {c.profiles.user_code}
                              </span>
                            )}
                          </td>

                          {/* Won Amount */}
                          <td className="py-3.5 px-4">
                            <span className="font-black text-amber-600 text-base">
                              ৳ {won.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {c.slice_label || "স্পিন"}
                            </span>
                          </td>

                          {/* 50% Deposit Required */}
                          <td className="py-3.5 px-4">
                            <span className="font-black text-rose-600">
                              ৳ {dep.toFixed(2)}
                            </span>
                          </td>

                          {/* Payment Gateway & Sender Phone */}
                          <td className="py-3.5 px-4">
                            {c.payment_method ? (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800">
                                  {c.payment_method}
                                </span>
                                <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                                  {c.sender_number || "—"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">জমা দেয়নি</span>
                            )}
                          </td>

                          {/* TrxID & Screenshot */}
                          <td className="py-3.5 px-4">
                            {c.trx_id ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                  {c.trx_id}
                                </span>
                                {c.screenshot_url && (
                                  <button
                                    onClick={() => setPreviewImage(c.screenshot_url)}
                                    className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                                    title="স্ক্রিনশট দেখুন"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(c.created_at).toLocaleString("bn-BD", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {c.status === "pending_deposit" && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                ডিপোজিট বাকি
                              </span>
                            )}
                            {c.status === "deposit_submitted" && (
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full animate-pulse">
                                অপেক্ষমান
                              </span>
                            )}
                            {c.status === "approved" && (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                অনুমোদিত ✅
                              </span>
                            )}
                            {c.status === "rejected" && (
                              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                                বাতিল ❌
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveClaim(c.id)}
                                  disabled={isProcessing}
                                  className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition active:scale-95"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>অনুমোদন</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectTargetId(c.id);
                                    setRejectReason("");
                                    setRejectModalOpen(true);
                                  }}
                                  disabled={isProcessing}
                                  className="py-1 px-2.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">সম্পন্ন</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SLICES CONFIGURATION */}
      {activeTab === "slices" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              চাকার প্রতিটি সেকশন রিয়েল-টাইমে পরিবর্তন করুন। ব্যবহারকারীরা স্পিন করার সময় এই মানগুলো দেখবে।
            </p>
          </div>

          {slicesLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {slices.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm"
                      style={{ backgroundColor: s.color, color: s.text_color || "#FFFFFF" }}
                    >
                      {s.label}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-base">{s.label}</span>
                        {!s.is_active && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-600 font-bold">
                            বন্ধ
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        টাকার মান: <strong className="text-slate-800">৳ {s.amount}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        জেতার চান্স/ওয়েট: {s.weight} (ক্রম: {s.sort_order})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSlice(s);
                        setSliceModalOpen(true);
                      }}
                      className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                      title="সম্পাদনা করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlice(s.id)}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
       * MODAL: ADD / EDIT SLICE
       * ========================================================= */}
      <Dialog open={sliceModalOpen} onOpenChange={setSliceModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white text-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-lg font-black text-slate-900">
              {editingSlice?.id ? "স্লাইস সম্পাদনা করুন" : "নতুন স্লাইস যুক্ত করুন"}
            </h3>
            <button
              onClick={() => setSliceModalOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveSlice} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                লেবেল (যা চাকায় দেখা যাবে):
              </label>
              <input
                type="text"
                placeholder="যেমন: ৳৫০০০ বা ৳১০০০"
                value={editingSlice?.label || ""}
                onChange={(e) => setEditingSlice((prev) => ({ ...prev, label: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পুরস্কারের পরিমাণ (টাকা):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="যেমন: 5000"
                value={editingSlice?.amount ?? ""}
                onChange={(e) => setEditingSlice((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                * ইউজার এই টাকার ৫০% (৳ {((editingSlice?.amount || 0) * 0.5).toFixed(2)}) ডিপোজিট করলে পুরো টাকা পাবে।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্লাইসের রঙ:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingSlice?.color || "#EC4899"}
                    onChange={(e) => setEditingSlice((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={editingSlice?.color || "#EC4899"}
                    onChange={(e) => setEditingSlice((prev) => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জেতার ওয়েট / সম্ভাবনা:
                </label>
                <input
                  type="number"
                  placeholder="১০"
                  value={editingSlice?.weight ?? 10}
                  onChange={(e) => setEditingSlice((prev) => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সাজানোর ক্রম:
                </label>
                <input
                  type="number"
                  value={editingSlice?.sort_order ?? 0}
                  onChange={(e) => setEditingSlice((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="sliceActive"
                  checked={editingSlice?.is_active ?? true}
                  onChange={(e) => setEditingSlice((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="sliceActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  স্লাইসটি চালু রাখুন
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSlice}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              {savingSlice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>সংরক্ষণ করুন</span>
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
       * MODAL: REJECT CLAIM REASON
       * ========================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-white text-slate-900">
          <h3 className="text-base font-black text-slate-900 mb-2">স্পিন ডিপোজিট বাতিল করুন</h3>
          <p className="text-xs text-slate-500 mb-4">
            বাতিলের কারণ উল্লেখ করুন। ইউজার তার হিস্ট্রিতে এই কারণ দেখতে পাবে।
          </p>

          <form onSubmit={handleRejectClaimSubmit} className="space-y-4">
            <textarea
              placeholder="যেমন: TrxID ভুল, পেমেন্ট পাওয়া যায়নি"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                ফিরে যান
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow"
              >
                বাতিল নিশ্চিত করুন
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
       * MODAL: SCREENSHOT PREVIEW
       * ========================================================= */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-3 rounded-2xl bg-slate-900 border-0">
          {previewImage && (
            <img
              src={previewImage}
              alt="Payment proof"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
