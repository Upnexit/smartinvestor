import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Download,
  Copy,
  RotateCcw,
  Sparkles,
  Phone,
  Clock,
  Battery,
  Wifi,
  Signal,
  CheckCircle2,
  Eye,
  RefreshCw,
  Share2,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton } from "@/components/admin/AdminUI";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/admin/screenshot-generator")({
  head: () => ({ meta: [{ title: "স্ক্রিনশট জেনারেটর — Admin" }] }),
  component: ScreenshotGeneratorPage,
});

function generateRandomTrxId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getFormattedCurrentDateTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = String(hours).padStart(2, "0");
  const strMinutes = String(minutes).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  return {
    timeOnly: `${strHours}:${strMinutes}`,
    fullDateTime: `${strHours}:${strMinutes} ${ampm} ${day}/${month}/${year}`,
  };
}

function ScreenshotGeneratorPage() {
  const site = useSiteSettings();
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Form State initialized with values from reference image
  const [recipientNumber, setRecipientNumber] = useState("01738121114");
  const [amount, setAmount] = useState<number>(3650);
  const [fee, setFee] = useState<number>(5);
  const [trxId, setTrxId] = useState("DIMT21AY70");
  const [reference, setReference] = useState("NexoraPay BD");
  const [dateTime, setDateTime] = useState("12:26 pm 22/09/26");
  const [statusTime, setStatusTime] = useState("12:26");
  const [batteryPercent, setBatteryPercent] = useState<number>(50);
  const [showWifi, setShowWifi] = useState(true);

  // Auto calculate total
  const totalAmount = (Number(amount) || 0) + (Number(fee) || 0);

  // Initial reference fallback if empty
  useEffect(() => {
    if (!reference && site.site_name) {
      setReference(site.site_name);
    }
  }, [site.site_name]);

  const handleSetCurrentTime = () => {
    const { timeOnly, fullDateTime } = getFormattedCurrentDateTime();
    setDateTime(fullDateTime);
    setStatusTime(timeOnly);
    toast.success("বর্তমান সময় ও তারিখ সেট করা হয়েছে!");
  };

  const handleGenerateTrxId = () => {
    const newId = generateRandomTrxId();
    setTrxId(newId);
    toast.success("নতুন TrxID জেনারেট করা হয়েছে!");
  };

  const handleResetForm = () => {
    setRecipientNumber("01738121114");
    setAmount(3650);
    setFee(5);
    setTrxId("DIMT21AY70");
    setReference(site.site_name || "NexoraPay BD");
    setDateTime("12:26 pm 22/09/26");
    setStatusTime("12:26");
    setBatteryPercent(50);
    setShowWifi(true);
    toast.info("ফর্ম ডিফল্ট মানে রিসেট করা হয়েছে");
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2.5, // 2.5x sharp resolution
        cacheBust: true,
        backgroundColor: "#FFFFFF",
      });
      const link = document.createElement("a");
      link.download = `bkash-send-money-${trxId || "slip"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("স্ক্রিনশট সফলভাবে ডাউনলোড হয়েছে! 📸");
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      toast.error("স্ক্রিনশট তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!previewRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#FFFFFF",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("স্ক্রিনশট ক্লিপবোর্ডে কপি করা হয়েছে! 📋");
    } catch (err) {
      console.error(err);
      toast.error("ক্লিপবোর্ডে কপি করা যায়নি, ডাউনলোড বাটন ব্যবহার করুন");
    } finally {
      setDownloading(false);
    }
  };

  // Avatar initial from number or 0
  const avatarChar = recipientNumber ? recipientNumber.trim().charAt(0) : "0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <AdminPageHeader
        title="স্ক্রিনশট জেনারেটর (bKash Send Money)"
        description="বিকাশ সফল সেন্ড মানি নিশ্চিতকরণ স্লিপের হুবহু রিয়েলিস্টিক স্ক্রিনশট তৈরি ও ডাউনলোড করুন।"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Controls & Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Transaction Information */}
          <AdminCard
            title="১. লেনদেনের তথ্য (Transaction Details)"
            subtitle="স্ক্রিনশটের মূল তথ্যগুলো এখানে পরিবর্তন করুন"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Main Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    টাকার পরিমাণ (মূল অ্যামাউন্ট) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-slate-800 text-sm"
                      placeholder="যেমন: 3650"
                    />
                  </div>
                </div>

                {/* Charge / Fee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সেন্ড মানি চার্জ (ফি)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-slate-800 text-sm"
                      placeholder="যেমন: 5"
                    />
                  </div>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="bg-pink-50/70 border border-pink-200/80 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-600">
                  সর্বমোট প্রদর্শিত হবে:
                </span>
                <span className="font-black text-pink-700">
                  ৳{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (৳{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} + ৳{fee.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                  </span>
                </span>
              </div>

              {/* Recipient Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রাপক মোবাইল নম্বর (Recipient Number) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono font-bold text-slate-800 text-sm"
                    placeholder="01738121114"
                  />
                </div>
              </div>

              {/* TrxID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    ট্রানজেকশন আইডি (TrxID) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTrxId}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    র‍্যান্ডম জেনারেট
                  </button>
                </div>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono font-black text-slate-800 text-sm tracking-wider uppercase"
                  placeholder="DIMT21AY70"
                />
              </div>

              {/* Reference Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রেফারেন্স নাম (Company / Project Name) *
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-slate-800 text-sm"
                  placeholder="NexoraPay BD / Smart Click BD"
                />
              </div>

              {/* Date & Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    তারিখ ও সময় (Date & Time) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    বর্তমান সময় দিন
                  </button>
                </div>
                <input
                  type="text"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono font-medium text-slate-800 text-sm"
                  placeholder="12:26 pm 22/09/26"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 2: Mobile Status Bar Controls */}
          <AdminCard
            title="২. মোবাইল স্ট্যাটাস বার সেটিংস"
            subtitle="স্ক্রিনের উপরের ঘড়ি, ব্যাটারি এবং নেটওয়ার্ক সেটিংস"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Bar Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্ট্যাটাস বার সময়
                </label>
                <input
                  type="text"
                  value={statusTime}
                  onChange={(e) => setStatusTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono text-sm"
                  placeholder="12:26"
                />
              </div>

              {/* Battery Percentage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যাটারি শতাংশ: {batteryPercent}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={batteryPercent}
                  onChange={(e) => setBatteryPercent(Number(e.target.value))}
                  className="w-full accent-pink-600 cursor-pointer mt-2"
                />
              </div>

              {/* Wi-Fi Switch */}
              <div className="flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ওয়াই-ফাই স্ট্যাটাস
                </label>
                <button
                  type="button"
                  onClick={() => setShowWifi(!showWifi)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    showWifi
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  {showWifi ? "Wi-Fi অন" : "মোবাইল ডেটা (4G)"}
                </button>
              </div>
            </div>
          </AdminCard>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-sm shadow-lg shadow-pink-500/25 hover:from-pink-700 hover:to-rose-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? "প্রসেস হচ্ছে..." : "স্ক্রিনশট ডাউনলোড করুন (PNG)"}
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition"
            >
              <Copy className="w-4 h-4" />
              কপি
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4" />
              রিসেট
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Pixel-Perfect Live Preview Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-20 w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-[390px] mb-2 px-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-pink-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-600"></span>
                </span>
                লাইভ প্রিভিউ (100% হুবহু ডিজাইন)
              </span>
              <span>390 × 844 px</span>
            </div>

            {/* Smartphone Outer Shadow Wrapper */}
            <div className="relative rounded-[2.5rem] p-1.5 bg-slate-900 shadow-2xl ring-1 ring-slate-800">
              {/* SCREEN CONTENT TO BE EXPORTED - EXACT MATCH TO REFERENCE IMAGE */}
              <div
                ref={previewRef}
                style={{ width: "375px", minHeight: "812px" }}
                className="relative bg-white text-slate-900 overflow-hidden font-sans select-none flex flex-col justify-between"
              >
                {/* 1. TOP MOBILE STATUS BAR */}
                <div>
                  <div className="h-10 px-5 pt-2 flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span className="font-semibold text-slate-600 tracking-tight text-[13px]">
                      {statusTime}
                    </span>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      {/* Cellular Signal Bars */}
                      <div className="flex items-end gap-[1.5px] h-3">
                        <span className="w-[2.5px] h-1.5 bg-slate-400 rounded-xs" />
                        <span className="w-[2.5px] h-2 bg-slate-400 rounded-xs" />
                        <span className="w-[2.5px] h-2.5 bg-slate-400 rounded-xs" />
                        <span className="w-[2.5px] h-3 bg-slate-400 rounded-xs" />
                      </div>

                      {/* Wi-Fi Icon */}
                      {showWifi && (
                        <Wifi className="w-3.5 h-3.5 text-slate-400" />
                      )}

                      {/* Battery Badge with Percentage Inside */}
                      <div className="flex items-center gap-0.5 ml-0.5">
                        <div className="relative w-6 h-3 rounded-[3px] border border-slate-400 p-[1px] flex items-center justify-center">
                          <span className="text-[8px] font-bold leading-none text-slate-500">
                            {batteryPercent}
                          </span>
                        </div>
                        <span className="w-[1.5px] h-1.5 bg-slate-400 rounded-r-xs" />
                      </div>
                    </div>
                  </div>

                  {/* 2. SUCCESS HEADER: আপনার সেন্ড মানি সফল হয়েছে */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <h2 className="text-[19px] leading-tight tracking-tight">
                      <span className="font-bold text-[#D12053]">আপনার </span>
                      <span className="font-black text-[#D12053]">সেন্ড মানি </span>
                      <span className="font-bold text-[#107C41]">সফল হয়েছে</span>
                    </h2>

                    {/* Circular Teal Checkmark Icon */}
                    <div className="w-8 h-8 rounded-full border-[2.5px] border-[#0B7261] flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 text-[#0B7261]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  {/* 3. RECIPIENT CONTACT ROW */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      {/* Teal circular avatar badge */}
                      <div className="w-12 h-12 rounded-full bg-[#73CDCB] flex items-center justify-center text-white text-xl font-bold">
                        {avatarChar}
                      </div>

                      {/* Phone Number Stack */}
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1E293B] text-[15px] tracking-wide leading-tight">
                          {recipientNumber}
                        </span>
                        <span className="font-medium text-slate-400 text-xs tracking-wider mt-0.5">
                          {recipientNumber}
                        </span>
                      </div>
                    </div>

                    {/* Call Pill Button */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D12053] bg-white text-[#D12053] font-bold text-xs shadow-xs">
                      <Phone className="w-3.5 h-3.5 fill-[#D12053]/20" />
                      <span>কল</span>
                    </div>
                  </div>

                  {/* 4. DETAILS 2-COLUMN TABLE (TIME, TRXID, AMOUNT, BALANCE, REF) */}
                  <div className="mt-3 border-t border-b border-slate-100">
                    {/* Row 1: সময় & ট্রানজেকশন আইডি */}
                    <div className="grid grid-cols-2 border-b border-slate-100">
                      {/* Left: সময় */}
                      <div className="p-3.5 border-r border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-400 leading-none">
                          সময়
                        </p>
                        <p className="text-[13px] font-bold text-slate-800 mt-1 leading-snug">
                          {dateTime}
                        </p>
                      </div>

                      {/* Right: ট্রানজেকশন আইডি */}
                      <div className="p-3.5">
                        <p className="text-[11px] font-semibold text-slate-400 leading-none">
                          ট্রানজেকশন আইডি
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[13px] font-bold text-slate-800 tracking-wider">
                            {trxId}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4 text-[#D12053]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: সর্বমোট & নতুন ব্যালেন্স */}
                    <div className="grid grid-cols-2 border-b border-slate-100">
                      {/* Left: সর্বমোট */}
                      <div className="p-3.5 border-r border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-400 leading-none">
                          সর্বমোট
                        </p>
                        <p className="text-[14px] font-black text-slate-900 mt-1 leading-tight">
                          ৳{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-none">
                          ৳{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} + ৳{fee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {/* Right: নতুন ব্যালেন্স (All time hidden asterisks as requested) */}
                      <div className="p-3.5">
                        <p className="text-[11px] font-semibold text-slate-400 leading-none">
                          নতুন ব্যালেন্স
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[14px] font-black tracking-widest text-slate-800">
                            *******
                          </span>
                          <Eye className="w-4 h-4 text-[#D12053]" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: রেফারেন্স & Empty Right */}
                    <div className="grid grid-cols-2">
                      {/* Left: রেফারেন্স */}
                      <div className="p-3.5 border-r border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-400 leading-none">
                          রেফারেন্স
                        </p>
                        <p className="text-[13px] font-black text-slate-800 mt-1 leading-tight">
                          {reference}
                        </p>
                      </div>

                      {/* Right: Empty */}
                      <div className="p-3.5" />
                    </div>
                  </div>

                  {/* 5. ACTION BUTTONS: অটো পে চালু করুন & শেয়ার */}
                  <div className="px-5 mt-5 grid grid-cols-2 gap-3">
                    <div className="py-2.5 px-3 rounded-xl border border-[#D12053] bg-white text-[#D12053] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                      <span className="w-4 h-4 rounded-full border border-[#D12053] flex items-center justify-center text-[10px] font-black">
                        ৳
                      </span>
                      <span>অটো পে চালু করুন</span>
                    </div>

                    <div className="py-2.5 px-3 rounded-xl border border-[#D12053] bg-white text-[#D12053] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                      <Share2 className="w-3.5 h-3.5 fill-[#D12053]" />
                      <span>শেয়ার</span>
                    </div>
                  </div>
                </div>

                {/* 6. BOTTOM SECTION: REWARDS & FOOTER BAR */}
                <div>
                  {/* Rewards Box */}
                  <div className="px-5 py-6 text-center flex flex-col items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-[#E2136E] flex items-center justify-center text-white mb-2 shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>

                    <p className="text-[11px] font-medium text-slate-500">
                      আপনি অর্জন করেছেন
                    </p>
                    <h4 className="text-[14px] font-extrabold text-slate-800 mt-0.5">
                      বিকাশ রিওয়ার্ড পয়েন্ট
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      পয়েন্ট ব্যবহার করতে{" "}
                      <span className="font-bold text-[#E2136E]">বিকাশ রিওয়ার্ডস</span>{" "}
                      চেক করুন!
                    </p>
                  </div>

                  {/* Pink Footer Navigation Bar: হোম-এ ফিরে যাই */}
                  <div className="bg-[#D12053] px-5 py-3.5 flex items-center justify-between text-white">
                    <span className="font-black text-sm tracking-wide">
                      হোম-এ ফিরে যাই
                    </span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>

                  {/* Phone Bottom Home Indicator */}
                  <div className="bg-black py-1.5 flex justify-center">
                    <div className="w-28 h-1 bg-white/70 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className || "w-5 h-5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
