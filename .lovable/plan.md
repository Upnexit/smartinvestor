
# ডিস্ট্রিবিউটরকে সবসময় ব্যস্ত রাখার পরিকল্পনা

বর্তমানে ডিস্ট্রিবিউটর শুধু refer করে কমিশন পায় — কোনো নিয়মিত কাজ নেই। এতে তারা active থাকে না, dropout বাড়ে। নিচে ৭টি কাজের ক্ষেত্র প্রস্তাব করছি, যেগুলো ডিস্ট্রিবিউটরকে daily/weekly ব্যস্ত রাখবে এবং business-এ value যোগ করবে।

---

## ১. Onboarding & User Support (Primary Duty)

ডিস্ট্রিবিউটর তার নিজের রেফার করা user-দের জন্য একজন **local mentor/support agent** হবে।

- **New user welcome call** — প্রতিটি নতুন referred user-কে ২৪ ঘণ্টার মধ্যে call/message করে welcome ও guide করা (checklist সহ)।
- **Package purchase assist** — যেসব referred user এখনো package কেনেনি (pending status), তাদের follow-up করা।
- **Task help** — user-রা যদি link task-এ আটকে যায়, ডিস্ট্রিবিউটর WhatsApp/call-এ সাহায্য করবে।

**Track:** Panel-এ "Pending Users" list — যারা package কেনেনি; "Inactive Users" list — যারা ৩ দিন login করেনি।

---

## ২. Daily Check-in / Attendance Task

প্রতিদিন login করে একটি ছোট task complete করলে **daily bonus** (৫–২০ টাকা)।

- Daily login streak
- ৩–৫টি নতুন lead contact log করা (নাম + phone + status: interested/not)
- ছোট quiz বা training video দেখা

**Impact:** habit তৈরি হবে, panel-এ প্রতিদিন আসবে।

---

## ৩. Lead CRM (নতুন Feature)

ডিস্ট্রিবিউটরের জন্য একটি mini-CRM যেখানে সে potential customer-দের track করবে:

```text
Lead Name | Phone | Source | Status         | Next Follow-up
Rahim     | 017.. | FB     | Interested     | কাল
Karim     | 018.. | Friend | Package Bought | —
```

- Status: New → Contacted → Interested → Converted → Dropped
- Follow-up reminder notification
- Converted lead auto-link হবে referral-এর সাথে

---

## ৪. Weekly Target & Leaderboard

- **Weekly target:** ৫ জন নতুন referral, ২ জনের package conversion
- Target complete করলে **bonus commission** (extra ২–৩%)
- District-wise / national leaderboard — top ১০ ডিস্ট্রিবিউটর দেখা যাবে
- Monthly winner পাবে extra reward (cash/gift)

---

## ৫. Content Sharing Task

প্রতিদিন/সপ্তাহে ২–৩টি ready-made content (poster, video, caption) admin panel থেকে dispatch হবে; ডিস্ট্রিবিউটর নিজের FB/WhatsApp-এ share করে screenshot upload করবে।

- Verified share = ছোট bonus (৫–১০ টাকা)
- Admin approve করবে (task_submissions-এর মতো flow)

---

## ৬. Training & Certification

- Weekly training video/PDF
- ছোট quiz — pass করলে "Certified Distributor" badge
- Level up system: Bronze → Silver → Gold → Platinum (commission rate বাড়বে)

---

## ৭. Local Community Building

- ডিস্ট্রিবিউটর তার district-এর user-দের নিয়ে WhatsApp group চালাবে
- Weekly report submit করবে (কতজন active, কী সমস্যা)
- District performance dashboard admin দেখতে পাবে

---

## Priority Roadmap (Phase-wise)

| Phase | Feature | Effort | Impact |
|---|---|---|---|
| **Phase 1** (সবচেয়ে জরুরি) | Pending/Inactive user list + follow-up tracking, Daily check-in bonus | মাঝারি | High |
| **Phase 2** | Lead CRM, Weekly target + leaderboard | বড় | High |
| **Phase 3** | Content sharing task, Training + certification | মাঝারি | Medium |
| **Phase 4** | Level-up system, District dashboard | বড় | Medium |

---

## Technical Overview (Phase 1 বাস্তবায়ন)

- **New tables:** `distributor_daily_checkins`, `distributor_leads`, `distributor_tasks`
- **New pages:**
  - `/distributor/leads` — CRM
  - `/distributor/tasks` — daily task + check-in
  - `/distributor/leaderboard`
- **New server functions:** lead CRUD, check-in claim, target progress
- **Notification:** pending user follow-up reminder (pg_cron daily)
- **Admin panel:** target config, content dispatch, task approval

---

## আপনার সিদ্ধান্ত দরকার

1. কোন Phase থেকে শুরু করব? (আমার সুপারিশ: **Phase 1** — quick win)
2. Daily check-in bonus কত রাখব? (৫/১০/২০ টাকা)
3. Weekly target complete-এ extra commission কত? (২%/৩%/৫%)
4. এই ৭টা idea-র মধ্যে কোনটা বাদ দিতে চান বা নতুন যোগ করতে চান?

আপনি সিদ্ধান্ত জানালে সেই অনুযায়ী detailed implementation plan দেব ও কোড লেখা শুরু করব।
