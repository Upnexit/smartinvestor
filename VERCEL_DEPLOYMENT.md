# Vercel Deployment Guide — Smart Click BD

এই project **TanStack Start + Nitro** stack-এ built। Nitro-এর built-in Vercel preset আছে, তাই কোন code পরিবর্তন ছাড়াই Vercel-এ deploy করা যাবে — শুধু নিচের settings ঠিকমতো configure করতে হবে।

> সবচেয়ে দ্রুত ও error-free option: **Lovable Publish** button ব্যবহার করুন (এক ক্লিকে সব automatically deploy)। Vercel চালিয়ে যেতে চাইলে এই guide follow করুন।

---

## 1️⃣ Vercel Project Settings

Vercel Dashboard → আপনার project → **Settings → General**:

| Setting | Value |
|---|---|
| **Framework Preset** | `Other` (Vercel auto-detect ভুল করে — manually set করুন) |
| **Build Command** | `bun run build` (অথবা `npm run build`) |
| **Output Directory** | `.output/public` |
| **Install Command** | `bun install` (অথবা `npm install`) |
| **Node.js Version** | `20.x` বা `22.x` |
| **Root Directory** | `./` (default) |

---

## 2️⃣ Environment Variables (সবচেয়ে গুরুত্বপূর্ণ)

Vercel Dashboard → **Settings → Environment Variables** → এই **৭টি variable** add করুন (Production, Preview, Development — সব environment-এ):

### Client-visible (VITE_ prefix — browser-এ যায়)
```
VITE_SUPABASE_URL              = https://gpyarcrizvjyukaazndj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mjk5MzgsImV4cCI6MjA5ODMwNTkzOH0.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw
VITE_SUPABASE_PROJECT_ID       = gpyarcrizvjyukaazndj
```

### Server-only (server functions/SSR-এ প্রয়োজন)
```
SUPABASE_URL                   = https://gpyarcrizvjyukaazndj.supabase.co
SUPABASE_PUBLISHABLE_KEY       = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mjk5MzgsImV4cCI6MjA5ODMwNTkzOH0.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw
SUPABASE_SERVICE_ROLE_KEY      = <Supabase Dashboard → Settings → API → service_role secret>
SUPABASE_JWKS                  = <Supabase Dashboard → Settings → API → JWKS URL এর content>
```

### Optional (যদি ব্যবহার করেন)
```
LOVABLE_API_KEY                = <Lovable AI gateway key>
GEMINI_API_KEY                 = <Google AI Studio key>
GOOGLE_MAIL_API_KEY            = <Gmail API key>
```

### Nitro Preset (auto-set — না দিলেও চলবে)
```
NITRO_PRESET                   = vercel
```

> **`SUPABASE_SERVICE_ROLE_KEY` কোথায় পাবেন:**
> Supabase Dashboard → Project Settings → API → **service_role** section → "Reveal" ক্লিক করে copy করুন। **কখনোই এটি frontend/browser-এ leak করবেন না।**

---

## 3️⃣ Supabase Configuration (Auth callback URLs)

Vercel domain add করার পর Supabase-এ redirect URLs whitelist করতে হবে:

**Supabase Dashboard → Authentication → URL Configuration:**

- **Site URL**: `https://your-custom-domain.com`
- **Redirect URLs** (সবগুলো add করুন):
  ```
  https://your-custom-domain.com/**
  https://your-vercel-project.vercel.app/**
  https://your-vercel-project-*.vercel.app/**   (preview deployments)
  ```

না দিলে Google OAuth এবং email confirmation link কাজ করবে না।

---

## 4️⃣ Deploy করার আগে Checklist

- [ ] সব ৭টি environment variable Production-এ add করা আছে
- [ ] Framework Preset = `Other` (Next.js নয়!)
- [ ] Output Directory = `.output/public`
- [ ] Supabase Redirect URLs-এ Vercel domain add করা
- [ ] Node.js version = 20+ 

---

## 5️⃣ Deploy করা

Git push করলে Vercel automatically build করবে। প্রথমবার deploy-এর পর:

1. Deployment logs check করুন কোন error আছে কিনা
2. Live URL-এ যান → homepage load হচ্ছে কিনা দেখুন
3. `/auth` → register/login → `/dashboard` → package select → checkout → trx submit — সম্পূর্ণ flow test করুন
4. Admin login → `/admin/approvals` → real-time update আসছে কিনা check করুন

---

## 🚨 Common Errors ও Solutions

### "Missing Supabase environment variable"
→ Vercel Environment Variables-এ `SUPABASE_URL` ও `SUPABASE_PUBLISHABLE_KEY` (VITE_ prefix ছাড়াও) add করুন। **Redeploy করুন** — পুরনো deployment নতুন env variable পায় না।

### "Unauthorized" / "No authorization header"
→ Client bearer token attach হচ্ছে না। Browser console open করে `localStorage`-এ `sb-*-auth-token` key আছে কিনা check করুন। না থাকলে আবার login করুন।

### "Failed to fetch" checkout submit-এ
→ `SUPABASE_JWKS` variable missing। Supabase Dashboard → API → JWKS section থেকে copy করে add করুন।

### 404 on page refresh
→ Nitro এই স্বয়ংক্রিয়ভাবে handle করে। যদি এখনও হয়, `vercel.json` তৈরি করে rewrites add করুন (নিচে দেখুন)।

### White screen / blank page
→ Build failed। Vercel deployment logs check করুন। সাধারণত missing env variable এর কারণে হয়।

### "This page didn't load"
→ SSR server function crash। Vercel → Project → Logs → Function logs check করুন।

---

## 6️⃣ Optional: `vercel.json` (সাধারণত লাগে না)

Nitro-এর Vercel preset সব automatic handle করে। শুধুমাত্র বিশেষ cases-এ এই file add করুন:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": ".output/public",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## 7️⃣ Custom Domain

Vercel-এ custom domain add করার পর:

1. DNS records propagate হতে ২৪-৪৮ ঘণ্টা লাগতে পারে
2. Vercel automatically SSL certificate issue করবে
3. Supabase-এর Site URL এবং Redirect URLs update করতে ভুলবেন না
4. যদি এই domain আগে অন্য platform-এ ছিল, browser cache clear করুন

---

## সংক্ষেপে

**Vercel-এ error না দেখানোর জন্য শুধু ২টি কাজ করুন:**

1. উপরের **৭টি environment variable** Vercel-এ add করে **Redeploy** করুন
2. Supabase-এর **Redirect URLs-এ Vercel domain** add করুন

এই দুইটি ঠিক থাকলে checkout, admin approval, real-time — সব কাজ করবে।

---

**Alternative (recommended for zero-config):** Lovable Publish button ব্যবহার করলে এই সবকিছু automatic — শুধু publish বাটনে click করুন এবং custom domain connect করুন Project Settings → Domains থেকে।
