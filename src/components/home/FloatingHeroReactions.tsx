import React from "react";

/* ---------------- Official Icons & Reaction SVGs ---------------- */

export function FacebookIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path
        d="M29.5 24.5H25.5V36H20.5V24.5H18V20.2H20.5V17.3C20.5 14.3 22.1 12 26 12C27.5 12 28.8 12.3 29.5 12.5V16.3C29 16.2 28.2 16.1 27.2 16.1C25.6 16.1 25.4 16.9 25.4 18.2V20.2H29.5L29.5 24.5Z"
        fill="white"
      />
    </svg>
  );
}

export function YouTubeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="14" fill="#FF0000" />
      <path d="M32 24L20 17V31L32 24Z" fill="white" />
    </svg>
  );
}

export function FbLikeReaction({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="likeGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#398CFF" />
          <stop offset="60%" stopColor="#0B67F6" />
          <stop offset="100%" stopColor="#004FD6" />
        </radialGradient>
        <linearGradient id="likeShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#likeGrad)" filter="drop-shadow(0 4px 8px rgba(11,103,246,0.35))" />
      <ellipse cx="32" cy="14" rx="20" ry="8" fill="url(#likeShine)" opacity="0.45" />
      <path
        d="M23 43H18C16.8954 43 16 42.1046 16 41V30C16 28.8954 16.8954 28 18 28H23V43ZM26 43H36.8C38.4 43 39.8 41.9 40.1 40.3L41.8 32.1C42.2 30.1 40.6 28.3 38.6 28.3H33.2L34.1 23.8C34.4 22.4 33.9 20.9 32.9 20L30.8 18L24.5 25.8C24.2 26.2 24 26.6 24 27.1V41C24 42.1046 24.8954 43 26 43Z"
        fill="white"
      />
    </svg>
  );
}

export function FbLoveReaction({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="loveGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF4A70" />
          <stop offset="55%" stopColor="#FA2453" />
          <stop offset="100%" stopColor="#D90032" />
        </radialGradient>
        <linearGradient id="loveShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#loveGrad)" filter="drop-shadow(0 4px 8px rgba(250,36,83,0.4))" />
      <ellipse cx="32" cy="14" rx="20" ry="8" fill="url(#loveShine)" opacity="0.45" />
      <path
        d="M32 46.5C32 46.5 17 37 17 26.5C17 21.8 20.8 18 25.5 18C28.2 18 30.6 19.3 32 21.3C33.4 19.3 35.8 18 38.5 18C43.2 18 47 21.8 47 26.5C47 37 32 46.5 32 46.5Z"
        fill="white"
      />
    </svg>
  );
}

export function FbCareReaction({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="careGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="65%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#E69500" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#careGrad)" filter="drop-shadow(0 4px 8px rgba(255,193,7,0.4))" />
      <path d="M21 24C21 21.5 24 21 26 23" stroke="#8C4D00" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M43 24C43 21.5 40 21 38 23" stroke="#8C4D00" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M27 30C27 34 37 34 37 30" stroke="#8C4D00" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M32 49C32 49 22 42.5 22 35C22 31.7 24.7 29 28 29C29.9 29 31.3 29.9 32 31C32.7 29.9 34.1 29 36 29C39.3 29 42 31.7 42 35C42 42.5 32 49 32 49Z"
        fill="#FA2453"
      />
      <path d="M16 38C19 36 23 37 25 39" stroke="#FFA726" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 38C45 36 41 37 39 39" stroke="#FFA726" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function FbHahaReaction({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hahaGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="65%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#E69500" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#hahaGrad)" filter="drop-shadow(0 4px 8px rgba(255,193,7,0.4))" />
      <path d="M19 23L26 27L19 31" stroke="#8C4D00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 23L38 27L45 31" stroke="#8C4D00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 36C20 46 44 46 44 36H20Z" fill="#8C2500" />
      <path d="M26 44C28 41 36 41 38 44C35 46 29 46 26 44Z" fill="#FA2453" />
    </svg>
  );
}

export function FbWowReaction({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wowGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="65%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#E69500" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#wowGrad)" filter="drop-shadow(0 4px 8px rgba(255,193,7,0.4))" />
      <path d="M20 18C22 15 27 16 28 19" stroke="#8C4D00" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 18C42 15 37 16 36 19" stroke="#8C4D00" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="23.5" cy="26" rx="3.5" ry="5.5" fill="#8C4D00" />
      <ellipse cx="40.5" cy="26" rx="3.5" ry="5.5" fill="#8C4D00" />
      <ellipse cx="32" cy="42" rx="7" ry="9.5" fill="#8C2500" />
    </svg>
  );
}

/* ---------------- Hero Floating Badges & Reactions ---------------- */

export function FloatingHeroReactions() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* ---------------- Desktop Floating Group: Left Side ---------------- */}
      <div className="hidden lg:block absolute left-4 xl:left-8 top-16 animate-float-slow">
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 shadow-xl shadow-blue-500/15 ring-1 ring-blue-200/80 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <FacebookIcon className="h-9 w-9 shrink-0 shadow-md rounded-full" />
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <FbLikeReaction className="h-4 w-4" />
              <span className="text-xs font-bold text-slate-800">ফেসবুক টাস্ক</span>
            </div>
            <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
              +৳০.৫০ লাইক
            </span>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute left-8 xl:left-14 top-48 animate-float-reverse">
        <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-lg shadow-rose-500/20 ring-1 ring-rose-200/80 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <FbLoveReaction className="h-9 w-9 shrink-0" />
          <FbCareReaction className="h-9 w-9 shrink-0" />
          <div className="text-left pr-1">
            <span className="text-xs font-bold text-rose-600 block leading-tight">লাভ ও কেয়ার</span>
            <span className="text-[10px] text-slate-500 font-semibold">আনলিমিটেড রিয়্যাক্ট</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute left-12 xl:left-20 bottom-8 animate-float-gentle">
        <div className="flex items-center gap-2 rounded-full bg-white/90 p-1.5 pr-3 shadow-lg shadow-amber-500/15 ring-1 ring-amber-200/80 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <FbHahaReaction className="h-8 w-8 shrink-0" />
          <span className="text-xs font-bold text-amber-800">হাহা রিয়্যাক্ট 😆</span>
        </div>
      </div>

      {/* ---------------- Desktop Floating Group: Right Side ---------------- */}
      <div className="hidden lg:block absolute right-4 xl:right-8 top-16 animate-float-reverse">
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 p-2.5 shadow-xl shadow-red-500/15 ring-1 ring-red-200/80 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <YouTubeIcon className="h-9 w-9 shrink-0 shadow-md rounded-xl" />
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">ইউটিউব টাস্ক</span>
            </div>
            <span className="text-[11px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
              +৳১.২০ কমেন্ট
            </span>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute right-8 xl:right-14 top-48 animate-float-slow">
        <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-lg shadow-blue-500/20 ring-1 ring-blue-200/80 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <FbLikeReaction className="h-9 w-9 shrink-0" />
          <FbWowReaction className="h-9 w-9 shrink-0" />
          <div className="text-left pr-1">
            <span className="text-xs font-bold text-indigo-700 block leading-tight">লাইক ও ওয়াও</span>
            <span className="text-[10px] text-slate-500 font-semibold">ইনস্ট্যান্ট পেমেন্ট</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute right-12 xl:right-20 bottom-8 animate-reaction-bob">
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/40 backdrop-blur-md transition-all hover:scale-105 pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          <span className="text-xs font-extrabold tracking-wide">ইনস্ট্যান্ট বিকাশ/নগদ ⚡</span>
        </div>
      </div>

      {/* ---------------- Mobile & Tablet Floating Elements ---------------- */}
      {/* Top Left Floating Pill */}
      <div className="lg:hidden absolute left-2 top-3 sm:left-4 sm:top-6 animate-float-slow pointer-events-auto">
        <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-md shadow-blue-500/15 ring-1 ring-blue-200/80 backdrop-blur-md">
          <FacebookIcon className="h-5 w-5 shrink-0" />
          <FbLikeReaction className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-bold text-blue-700">+৳০.৫০</span>
        </div>
      </div>

      {/* Top Right Floating Pill */}
      <div className="lg:hidden absolute right-2 top-3 sm:right-4 sm:top-6 animate-float-reverse pointer-events-auto">
        <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-md shadow-red-500/15 ring-1 ring-red-200/80 backdrop-blur-md">
          <YouTubeIcon className="h-5 w-5 shrink-0" />
          <FbLoveReaction className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-bold text-red-600">+৳১.২০</span>
        </div>
      </div>

      {/* Floating Emojis on Mobile around middle edges */}
      <div className="lg:hidden absolute left-3 top-28 sm:left-6 animate-reaction-bob pointer-events-auto">
        <div className="rounded-full bg-white/90 p-1 shadow-md ring-1 ring-rose-200/80">
          <FbLoveReaction className="h-6 w-6" />
        </div>
      </div>

      <div className="lg:hidden absolute right-3 top-28 sm:right-6 animate-float-gentle pointer-events-auto">
        <div className="rounded-full bg-white/90 p-1 shadow-md ring-1 ring-amber-200/80">
          <FbHahaReaction className="h-6 w-6" />
        </div>
      </div>

      <div className="lg:hidden absolute left-4 bottom-2 sm:left-8 animate-float-reverse pointer-events-auto">
        <div className="rounded-full bg-white/90 p-1 shadow-md ring-1 ring-amber-200/80">
          <FbCareReaction className="h-6 w-6" />
        </div>
      </div>

      <div className="lg:hidden absolute right-4 bottom-2 sm:right-8 animate-float-slow pointer-events-auto">
        <div className="rounded-full bg-white/90 p-1 shadow-md ring-1 ring-amber-200/80">
          <FbWowReaction className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
