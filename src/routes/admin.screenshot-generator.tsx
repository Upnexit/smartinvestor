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
  Eye,
  Share2,
  Brush,
  CheckCircle2,
  Shield,
  HelpCircle,
} from "lucide-react";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
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

function generateRandomBdNumber() {
  const prefixes = ["017", "018", "019", "016", "013", "014"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const mid = Math.floor(1000 + Math.random() * 9000);
  const end = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${mid}${end}`.slice(0, 11);
}

function generateRandomAmount() {
  const commonAmounts = [
    1250, 1500, 1850, 2200, 2650, 3100, 3650, 4200, 4850, 5500, 6250, 7500, 8800, 10500, 12500, 15000, 18500,
  ];
  return commonAmounts[Math.floor(Math.random() * commonAmounts.length)];
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

  // Form State initialized matching reference image
  const [recipientNumber, setRecipientNumber] = useState("01738121114");
  const [amount, setAmount] = useState<number>(3650);
  const [fee, setFee] = useState<number>(5);
  const [trxId, setTrxId] = useState("DIMT21AY70");
  const [reference, setReference] = useState("NexoraPay BD");
  const [dateTime, setDateTime] = useState("12:26 pm 22/09/26");
  const [statusTime, setStatusTime] = useState("12:26");
  const [batteryPercent, setBatteryPercent] = useState<number>(50);
  const [showWifi, setShowWifi] = useState(true);

  // Red Marker Privacy Hide Toggles
  const [hideNumber, setHideNumber] = useState(true); // Red marker over phone number (matches reference)
  const [hideTrx, setHideTrx] = useState(false); // Optional red marker over TrxID
  const [hideAmount, setHideAmount] = useState(false); // Optional red marker over Amount

  // Auto calculate total
  const totalAmount = (Number(amount) || 0) + (Number(fee) || 0);

  // Initial reference fallback if empty
  useEffect(() => {
    if (!reference && site.site_name) {
      setReference(site.site_name);
    }
  }, [site.site_name]);

  const handleRandomNumber = () => {
    const num = generateRandomBdNumber();
    setRecipientNumber(num);
    toast.success("র‍্যান্ডম মোবাইল নম্বর জেনারেট হয়েছে!");
  };

  const handleRandomAmount = () => {
    const amt = generateRandomAmount();
    setAmount(amt);
    toast.success(`৳${amt.toLocaleString()} র‍্যান্ডম মূল্য সেট হয়েছে!`);
  };

  const handleSetCurrentTime = () => {
    const { timeOnly, fullDateTime } = getFormattedCurrentDateTime();
    setDateTime(fullDateTime);
    setStatusTime(timeOnly);
    toast.success("বর্তমান সময় ও তারিখ সেট করা হয়েছে!");
  };

  const handleGenerateTrxId = () => {
    const newId = generateRandomTrxId();
    setTrxId(newId);
    toast.success("নতুন TrxID তৈরি করা হয়েছে!");
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
    setHideNumber(true);
    setHideTrx(false);
    setHideAmount(false);
    toast.info("ফর্ম ডিফল্ট মানে রিসেট করা হয়েছে");
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2.5, // 2.5x retina clarity
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

  const avatarChar = recipientNumber ? recipientNumber.trim().charAt(0) : "0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-1 sm:px-2">
      <AdminPageHeader
        title="বিকাশ স্ক্রিনশট জেনারেটর (bKash Send Money)"
        description="বিকাশ সফল সেন্ড মানি নিশ্চিতকরণ স্লিপের হুবহু রিয়েলিস্টিক স্ক্রিনশট তৈরি ও লাল মার্কার দিয়ে হাইড করে ডাউনলোড করুন।"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: Controls & Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Transaction Information */}
          <AdminCard
            title="১. লেনদেনের তথ্য (Transaction Details)"
            subtitle="স্ক্রিনশটের মূল তথ্যগুলো পরিবর্তন বা র‍্যান্ডম জেনারেট করুন"
          >
            <div className="space-y-4">
              {/* Recipient Number with Random generator */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    প্রাপক মোবাইল নম্বর *
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomNumber}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    🎲 র‍্যান্ডম নম্বর
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono font-medium text-slate-800 text-sm"
                    placeholder="01738121114"
                  />
                </div>
              </div>

              {/* Amount & Fee with Random generator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      টাকার পরিমাণ *
                    </label>
                    <button
                      type="button"
                      onClick={handleRandomAmount}
                      className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition px-1.5 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100"
                    >
                      <Sparkles className="w-3 h-3" />
                      🎲 র‍্যান্ডম
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-slate-800 text-sm"
                      placeholder="3650"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    চার্জ (ফি)
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
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              {/* Calculation pill */}
              <div className="bg-pink-50/70 border border-pink-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600">
                  সর্বমোট প্রদর্শিত হবে:
                </span>
                <span className="font-bold text-pink-700">
                  ৳{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="font-normal text-slate-500">
                    (৳{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} + ৳{fee.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                  </span>
                </span>
              </div>

              {/* TrxID */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    ট্রানজেকশন আইডি (TrxID) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTrxId}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    🎲 র‍্যান্ডম TrxID
                  </button>
                </div>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono font-bold text-slate-800 text-sm tracking-wider uppercase"
                  placeholder="DIMT21AY70"
                />
              </div>

              {/* Reference Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  রেফারেন্স নাম (যেমন: NexoraPay BD বা কোম্পানির নাম) *
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium text-slate-800 text-sm"
                  placeholder="NexoraPay BD / Smart Click BD"
                />
              </div>

              {/* Date & Time */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    তারিখ ও সময় *
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    🕒 বর্তমান সময় দিন
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

          {/* Section 2: Red Marker Privacy Section (রেফারেন্স স্ক্রিনশটের মতো লাল মার্কার দিয়ে হাইড) */}
          <AdminCard
            title="২. লাল মার্কার দিয়ে হাইড অপশন (Red Privacy Marker)"
            subtitle="রেফারেন্স ইমেজের মতো ডিজিটাল লাল মার্কার দিয়ে সংবেদনশীল অংশ ঢাকুন"
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                রেফারেন্স স্ক্রিনশটে যেমন নম্বরের মাঝের কিছু ডিজিট লাল মার্কার পেন দিয়ে দাগ টেনে ঢেকে দেওয়া হয়েছিল, নিচের অপশনগুলো দিয়ে আপনিও হুবহু সেই লাল মার্কার যুক্ত করতে পারেন:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Hide Phone Number */}
                <button
                  type="button"
                  onClick={() => setHideNumber(!hideNumber)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    hideNumber
                      ? "bg-rose-50 border-rose-400 text-rose-900 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5 text-rose-600" />
                      নম্বর হাইড করুন
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                        hideNumber
                          ? "bg-rose-600 text-white border-rose-600"
                          : "border-slate-300"
                      }`}
                    >
                      {hideNumber ? "✓" : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (0173 <span className="text-rose-600 font-bold">[লাল দাগ]</span> 1114)
                  </span>
                </button>

                {/* 2. Hide TrxID */}
                <button
                  type="button"
                  onClick={() => setHideTrx(!hideTrx)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    hideTrx
                      ? "bg-rose-50 border-rose-400 text-rose-900 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5 text-rose-600" />
                      TrxID হাইড করুন
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                        hideTrx
                          ? "bg-rose-600 text-white border-rose-600"
                          : "border-slate-300"
                      }`}
                    >
                      {hideTrx ? "✓" : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    মাঝের অংশ লাল মার্কার
                  </span>
                </button>

                {/* 3. Hide Amount */}
                <button
                  type="button"
                  onClick={() => setHideAmount(!hideAmount)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    hideAmount
                      ? "bg-rose-50 border-rose-400 text-rose-900 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Brush className="w-3.5 h-3.5 text-rose-600" />
                      টাকা হাইড করুন
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                        hideAmount
                          ? "bg-rose-600 text-white border-rose-600"
                          : "border-slate-300"
                      }`}
                    >
                      {hideAmount ? "✓" : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    অ্যামাউন্ট লাল মার্কার
                  </span>
                </button>
              </div>
            </div>
          </AdminCard>

          {/* Section 3: Mobile Status Bar Controls */}
          <AdminCard
            title="৩. মোবাইল স্ট্যাটাস বার সেটিংস"
            subtitle="স্ক্রিনের উপরের ঘড়ি, ব্যাটারি এবং নেটওয়ার্ক সেটিংস"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ব্যাটারি: {batteryPercent}%
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

              <div className="flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ওয়াই-ফাই স্ট্যাটাস
                </label>
                <button
                  type="button"
                  onClick={() => setShowWifi(!showWifi)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
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
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white font-black text-sm shadow-lg shadow-pink-500/25 hover:from-pink-700 hover:to-rose-800 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? "প্রসেস হচ্ছে..." : "স্ক্রিনশট ডাউনলোড করুন (PNG)"}
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition"
            >
              <Copy className="w-4 h-4" />
              কপি
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4" />
              রিসেট
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Responsive Live Preview Frame */}
        <div className="lg:col-span-5 flex flex-col items-center w-full">
          <div className="w-full flex flex-col items-center sticky top-20">
            <div className="flex items-center justify-between w-full max-w-[380px] mb-2 px-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-pink-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-600"></span>
                </span>
                লাইভ প্রিভিউ (হুবহু রেফারেন্স)
              </span>
              <span>375 × 812 px</span>
            </div>

            {/* Responsive scaling container to prevent any horizontal overflow on small screens */}
            <div className="w-full flex justify-center overflow-x-auto pb-4">
              <div className="scale-[0.92] sm:scale-100 origin-top transition-transform">
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

                      {/* 2. SUCCESS HEADER: আপনার সেন্ড মানি সফল হয়েছে (Calibrated Font Weight & Color) */}
                      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                        <h2 className="text-[18px] leading-tight tracking-tight">
                          <span className="font-medium text-[#D12053]">আপনার </span>
                          <span className="font-bold text-[#D12053]">সেন্ড মানি </span>
                          <span className="font-medium text-[#107C41]">সফল হয়েছে</span>
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
                          <div className="w-12 h-12 rounded-full bg-[#73CDCB] flex items-center justify-center text-white text-xl font-bold shrink-0">
                            {avatarChar}
                          </div>

                          {/* Phone Number Stack with Red Privacy Marker */}
                          <div className="relative flex flex-col">
                            <span className="font-medium text-[#1E293B] text-[15px] tracking-wide leading-tight">
                              {recipientNumber}
                            </span>
                            <span className="font-normal text-[#94A3B8] text-xs tracking-wider mt-0.5">
                              {recipientNumber}
                            </span>

                            {/* Organic Red Marker Pen Stroke Overlay (Exact match to reference image) */}
                            {hideNumber && (
                              <div
                                className="absolute left-[34px] -top-1 w-[24px] h-[48px] bg-[#EF4444] rounded-full opacity-95 pointer-events-none select-none z-10 shadow-xs"
                                style={{
                                  transform: "rotate(-2deg)",
                                  borderRadius: "10px 14px 12px 14px",
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Call Pill Button */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D12053]/80 bg-white text-[#D12053] font-medium text-xs shadow-xs shrink-0">
                          <Phone className="w-3.5 h-3.5 fill-[#D12053]/20" />
                          <span>কল</span>
                        </div>
                      </div>

                      {/* 4. DETAILS 2-COLUMN TABLE (TIME, TRXID, AMOUNT, BALANCE, REF) */}
                      <div className="mt-3 border-t border-b border-[#ECEFF1]">
                        {/* Row 1: সময় & ট্রানজেকশন আইডি */}
                        <div className="grid grid-cols-2 border-b border-[#ECEFF1]">
                          {/* Left: সময় (Font-normal, soft slate-600) */}
                          <div className="p-3.5 border-r border-[#ECEFF1]">
                            <p className="text-[11px] font-normal text-[#94A3B8] leading-none">
                              সময়
                            </p>
                            <p className="text-[13px] font-normal text-[#334155] mt-1.5 leading-snug">
                              {dateTime}
                            </p>
                          </div>

                          {/* Right: ট্রানজেকশন আইডি with optional Red Marker */}
                          <div className="p-3.5">
                            <p className="text-[11px] font-normal text-[#94A3B8] leading-none">
                              ট্রানজেকশন আইডি
                            </p>
                            <div className="relative flex items-center justify-between mt-1.5">
                              <span className="text-[13px] font-medium text-[#334155] tracking-wider">
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

                              {/* Optional Red Marker for TrxID */}
                              {hideTrx && (
                                <div
                                  className="absolute left-[24px] -top-1 w-[42px] h-[24px] bg-[#EF4444] rounded-md opacity-95 pointer-events-none select-none z-10 shadow-xs"
                                  style={{ transform: "rotate(-1deg)" }}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: সর্বমোট & নতুন ব্যালেন্স */}
                        <div className="grid grid-cols-2 border-b border-[#ECEFF1]">
                          {/* Left: সর্বমোট (Font-semibold, subtext normal) */}
                          <div className="relative p-3.5 border-r border-[#ECEFF1]">
                            <p className="text-[11px] font-normal text-[#94A3B8] leading-none">
                              সর্বমোট
                            </p>
                            <p className="text-[14px] font-semibold text-[#1E293B] mt-1.5 leading-tight">
                              ৳{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[11px] font-normal text-[#64748B] mt-0.5 leading-none">
                              ৳{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} + ৳{fee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>

                            {/* Optional Red Marker for Amount */}
                            {hideAmount && (
                              <div
                                className="absolute left-[20px] top-[26px] w-[55px] h-[22px] bg-[#EF4444] rounded-md opacity-95 pointer-events-none select-none z-10 shadow-xs"
                                style={{ transform: "rotate(-1deg)" }}
                              />
                            )}
                          </div>

                          {/* Right: নতুন ব্যালেন্স (All time hidden asterisks as requested) */}
                          <div className="p-3.5">
                            <p className="text-[11px] font-normal text-[#94A3B8] leading-none">
                              নতুন ব্যালেন্স
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[13px] font-medium tracking-widest text-[#334155]">
                                *******
                              </span>
                              <Eye className="w-4 h-4 text-[#D12053]" />
                            </div>
                          </div>
                        </div>

                        {/* Row 3: রেফারেন্স (Calibrated: Not heavy bold, soft & realistic) */}
                        <div className="grid grid-cols-2">
                          <div className="p-3.5 border-r border-[#ECEFF1]">
                            <p className="text-[11px] font-normal text-[#94A3B8] leading-none">
                              রেফারেন্স
                            </p>
                            <p className="text-[13px] font-medium text-[#334155] mt-1.5 leading-tight">
                              {reference}
                            </p>
                          </div>

                          {/* Right: Empty */}
                          <div className="p-3.5" />
                        </div>
                      </div>

                      {/* 5. ACTION BUTTONS: অটো পে চালু করুন & শেয়ার */}
                      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
                        <div className="py-2.5 px-3 rounded-xl border border-[#D12053]/70 bg-white text-[#D12053] font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs">
                          <span className="w-4 h-4 rounded-full border border-[#D12053] flex items-center justify-center text-[10px] font-bold">
                            ৳
                          </span>
                          <span>অটো পে চালু করুন</span>
                        </div>

                        <div className="py-2.5 px-3 rounded-xl border border-[#D12053]/70 bg-white text-[#D12053] font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs">
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

                        <p className="text-[11px] font-normal text-[#64748B]">
                          আপনি অর্জন করেছেন
                        </p>
                        <h4 className="text-[13px] font-semibold text-[#334155] mt-0.5">
                          বিকাশ রিওয়ার্ড পয়েন্ট
                        </h4>
                        <p className="text-[11px] font-normal text-[#64748B] mt-0.5">
                          পয়েন্ট ব্যবহার করতে{" "}
                          <span className="font-semibold text-[#E2136E]">বিকাশ রিওয়ার্ডস</span>{" "}
                          চেক করুন!
                        </p>
                      </div>

                      {/* Pink Footer Navigation Bar: হোম-এ ফিরে যাই */}
                      <div className="bg-[#D12053] px-5 py-3.5 flex items-center justify-between text-white">
                        <span className="font-medium text-xs sm:text-[13px] tracking-wide">
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
