# Distributor Onboarding System

Add a complete public-facing distributor recruitment flow with admin approval.

## 1. Homepage change
- Replace the "কিভাবে কাজ করব" button with **"ডিস্ট্রিবিউটর হোন"** (gradient CTA)
- Links to new route `/distributor-info`

## 2. New public page: `/distributor-info`
Matches homepage design language (same fonts, gradient theme, glassmorphism). Sections:
- **Hero** — "ডিস্ট্রিবিউটর হোন, নিজের এলাকায় ব্যবসা শুরু করুন"
- **Benefits grid** — ৳২৫,০০০ ইনস্ট্যান্ট ব্যালেন্স, ৫% কমিশন, নিজস্ব রেফারেল লিংক, ইউজার ম্যানেজমেন্ট প্যানেল, উইথড্র সুবিধা, ট্রেনিং সাপোর্ট
- **কাজের ধরন** — ৪-স্টেপ (রেজিস্টার → রিভিউ → অ্যাপ্রুভাল → ইনকাম)
- **যোগ্যতা** — বয়স, স্মার্টফোন, সময়, এলাকা কভারেজ
- **FAQ** — সাধারণ প্রশ্ন
- **CTA** — বড় "আবেদন করুন" button → `/distributor-apply`

## 3. Application page: `/distributor-apply`
Professional multi-field glassmorphism form:
- পূর্ণ নাম, পিতার নাম
- বিভাগ → জেলা → উপজেলা (cascading dropdowns, existing `bd-districts.ts` / `bd-thanas.ts`)
- বিস্তারিত ঠিকানা (textarea)
- মোবাইল, ইমেইল
- পেমেন্ট মেথড (বিকাশ/নগদ/রকেট) + নম্বর
- পাসওয়ার্ড (min 6)
- অভিজ্ঞতা/মন্তব্য (optional)
- Submits to `distributor_applications` table with `status='pending'` (no auth account yet)

## 4. Database
New table `distributor_applications`:
- personal info fields, location, payment info, hashed reference, notes
- `status`: pending | approved | rejected
- `rejection_reason`, `reviewed_by`, `reviewed_at`
- RLS: public INSERT (anonymous can apply), admin SELECT/UPDATE
- Realtime enabled

## 5. Admin section on `/admin/distributors`
New tab/section "নতুন আবেদন" with badge count:
- Grid of pending application cards (name, area, phone, method, submitted time)
- "বিস্তারিত" modal → full info view
- **Approve** → calls edge function `admin-create-distributor` with application data (creates auth user, profile, distributor row with ৳25,000 balance, deletes application)
- **Reject** → prebuilt reason chips + custom textarea, marks status

## Technical notes
- Public form uses anonymous Supabase insert (no login required)
- Password stored temporarily encrypted in application row; consumed by approval edge function to create auth user
- On approval: reuse existing `admin-create-distributor` edge function, pass balance=25000
- Homepage button gets `<Link to="/distributor-info">` — replacing existing "কিভাবে কাজ করব" scroll anchor
- All pages inherit homepage's font stack (Baloo Da 2) and OKLCH gradient tokens

## Files to create/modify
- `src/routes/distributor-info.tsx` (new)
- `src/routes/distributor-apply.tsx` (new)
- `src/routes/index.tsx` (button swap)
- `src/routes/admin.distributors.tsx` (add applications tab)
- Migration: `distributor_applications` table + RLS + realtime
- `supabase/functions/admin-create-distributor/index.ts` (accept `application_id` + balance param, delete on success)
