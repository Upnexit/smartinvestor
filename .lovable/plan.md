
# ডিস্ট্রিবিউটর — Revised Detailed Plan

আপনার সিদ্ধান্ত অনুযায়ী তিনটি মূল feature বাস্তবায়ন হবে:

1. **Distributor Task Management** (AI দিয়ে task generate — admin-এর মতো panel + customization)
2. **Lead CRM** (Phase 2-এর দ্বিতীয় অংশ)
3. **Withdrawal Tax Commission** (তার under user withdraw দিলে ২% tax auto distributor-এর balance-এ)

---

## ১. Distributor Task Management System

### কী কী থাকবে

ডিস্ট্রিবিউটরের নিজস্ব task panel (admin-এর task page-এর mirror + customization):

- **Task Generator (AI)**
  - Lovable AI (Gemini) দিয়ে Facebook page-based link task generate হবে
  - Distributor "Generate" button-এ click করলে একসাথে N টা task তৈরি হবে (N = তার daily limit)
  - প্রতিটি task-এ: FB page link, action type (like/comment/follow/share), reward amount, instruction
  
- **Daily Task Limit Customization**
  - Distributor নিজে select করবে সে প্রতিদিন কতগুলো task তার referred user-দের দেবে (৩ / ৫ / ১০ / ১৫)
  - এটি তার settings-এ save হবে

- **Manual Verification & Auto-Regenerate**
  - Distributor প্রতিটি generated task-এর FB page manual verify করবে (link খুলে দেখবে page live আছে কিনা)
  - যদি page বন্ধ/deleted থাকে → "Delete & Regenerate" button; AI নতুন task generate করে replace করবে
  - Verified tasks-ই তার referred user-দের daily task pool-এ যাবে

- **Instruction Manual Button**
  - Distributor panel-এ prominent "📖 Manual/Instruction" button
  - Click করলে detailed guide (কীভাবে task generate, verify, publish করবে — Bangla-তে)

- **Active Users View**
  - তার referred user-দের মধ্যে যারা active package holder — শুধু তাদের ID/user_code দেখাবে (privacy: full details না)
  - সে বুঝবে কতজনের জন্য task publish করতে হবে

### Task Flow

```text
Distributor → [Generate 10 tasks (AI)] → Verify each FB page manually
   ↓                                          ↓
Delete broken → Auto regenerate           Publish to referred users' daily pool
```

### Database

**New table:** `distributor_tasks`
- id, distributor_id, title, fb_page_url, action_type, reward, instruction
- status: `draft` | `verified` | `published` | `rejected`
- created_at, verified_at, published_at

**New column on `link_tasks`:** `created_by_distributor uuid null` — যাতে distributor-generated task track হয় ও তার referred user-দের কাছে scope করা যায়।

**New column on `distributors`:** `daily_task_limit int default 5`

### Server Functions (`src/lib/distributor-tasks.functions.ts`)

- `generateTasks({ count })` — AI call → returns draft tasks (কিন্তু save হবে distributor_tasks table-এ)
- `verifyTask({ id })` — mark verified
- `deleteAndRegenerate({ id })` — delete + generate 1 new
- `publishTask({ id })` — distributor_tasks → link_tasks (with `created_by_distributor` + audience filter)

---

## ২. Lead CRM

Distributor-এর জন্য mini-CRM যেখানে potential lead track করবে।

### Database

**New table:** `distributor_leads`
- id, distributor_id, name, phone, source (FB/friend/etc.), status (`new`|`contacted`|`interested`|`converted`|`dropped`)
- next_followup_at, notes, converted_user_id (nullable — reference to profiles when they sign up)
- created_at, updated_at

### Pages/Server Functions

- `/distributor/leads` — list + add + edit + status change + follow-up reminder
- Server fns: `leadCreate`, `leadUpdate`, `leadDelete`, `leadList`

### UI

Simple table: Name | Phone | Source | Status badge | Next follow-up | Actions

---

## ৩. Withdrawal Tax Commission (২%)

### কীভাবে কাজ করবে

বর্তমান system-এ user withdraw request দিলে ২% withdrawal tax কাটা হয় (existing `withdrawals` table-এ `tax_amount` বা similar থাকে)। এখন থেকে:

- User withdrawal **approved** হলে → যদি user-এর একজন distributor থাকে (`profiles.distributor_id`), তাহলে সেই ২% tax amount **automatic** distributor-এর balance-এ যোগ হবে
- আলাদা track: একটি নতুন earning source (`withdrawal_tax`)

### Database

**New table:** `distributor_earnings`
- id, distributor_id, source (`withdrawal_tax` | `weekly_target` | `manual`)
- amount, related_user_id, related_withdrawal_id
- created_at

**Trigger update:** `admin_review_withdrawal` function-এ approve শাখায় একটি extra block:

```sql
-- inside approve branch, after debiting user balance
SELECT distributor_id INTO v_dist FROM profiles WHERE id = v_row.user_id;
IF v_dist IS NOT NULL AND COALESCE(v_row.tax_amount, 0) > 0 THEN
  INSERT INTO distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
  VALUES (v_dist, 'withdrawal_tax', v_row.tax_amount, v_row.user_id, v_row.id);
  UPDATE distributors SET balance = balance + v_row.tax_amount,
                          total_earned = total_earned + v_row.tax_amount
  WHERE user_id = v_dist;
END IF;
```

### UI

- Distributor panel dashboard-এ নতুন card: **"Withdrawal Tax Commission — ৳X"**
- আলাদা tab: withdrawal tax history (কার withdraw থেকে কত পেলাম)
- Existing distributor earnings card থেকে আলাদা করে show হবে

---

## ৪. Weekly Target +২% Extra Commission (Bonus Phase)

আপনি +২% approve করেছেন — এটি Phase 2 hisebe implement হবে (Task + CRM + Withdrawal Tax deploy হওয়ার পর):
- Weekly window: প্রতি Sunday reset
- Target: ৫ নতুন referral + ২ conversion
- Achieve করলে সেই week-এর সব referral-এ extra 2% (5% → 7%)

---

## Implementation Order (এই turn-এ)

1. **Migration** — নতুন ৩টি table + `distributors.daily_task_limit` column + trigger update on `admin_review_withdrawal`
2. **Server functions:**
   - `distributor-tasks.functions.ts` (generate/verify/regenerate/publish)
   - `distributor-leads.functions.ts` (CRUD)
   - `distributor-earnings.functions.ts` (list + summary)
3. **UI pages:**
   - `/distributor/tasks` — task generator + verification panel + manual modal
   - `/distributor/leads` — CRM
   - `/distributor/earnings` — updated to show withdrawal tax breakdown
4. **DistributorLayout sidebar** — নতুন menu items add

---

## প্রশ্ন (implementation শুরুর আগে)

1. **AI দিয়ে task generation** — Facebook page link কি AI নিজে generate করবে (random real-looking pages), নাকি distributor একটি seed keyword দেবে (যেমন "Bangladesh food pages") এবং AI সেই topic-এর pages suggest করবে?
   - **আমার সুপারিশ:** Keyword-based — AI real page URL guarantee করতে পারে না, তাই distributor manual verify করবে ও broken গুলো regenerate হবে (আপনার described flow অনুযায়ী)।

2. **Withdrawal tax percent** — এখন কি withdraw amount-এর ২% tax কাটা হচ্ছে? আমি existing `withdrawals.tax_amount` (বা equivalent) column ব্যবহার করব — যদি না থাকে migration-এ যোগ করব।

উত্তর দিলে code implementation শুরু করব।
