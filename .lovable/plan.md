# Admin Task Management Restructure

## 1. Task list page (`/admin/tasks`)

Restructure into two zones:

**Top zone — Search + Overview**
- Real-time search box (title/URL/reward)
- Filter chips: সব / আজকের / আগামীকালের / active / inactive
- Live task count and today's total reward

**Bottom zone — Package buttons**
- Each active package renders as a large button card showing: package name, price, daily_tasks, today's task count, active/inactive badge
- Click → navigates to `/admin/tasks/package/$packageId` (new page)

## 2. Package task page (`/admin/tasks/package/$packageId`)

For the selected package (e.g. Crazy Package):
- Header: package info + daily_tasks × reward = per-user daily amount
- Date picker (default: today, can pick tomorrow to pre-create)
- Action bar:
  - "AI দিয়ে random FB link generate করুন" button
  - "নতুন task manually add" button
  - Active/Inactive toggle for the whole day's batch
- Task list for that package × selected date: each row = link, title, reward, status (draft/active), edit/delete
- Bulk verify: admin can preview each AI-generated link (open in new tab), edit URL if broken, then bulk-activate

## 3. AI random task generator

Server function `generateTasksForPackage({ packageId, date, count })`:
- Uses Lovable AI Gateway (google/gemini-3-flash-preview) with structured output
- Prompt: generate `daily_tasks` random plausible public Facebook page/post URLs (like/follow/share tasks in Bengali)
- Returns array of `{ title, url, action_type, reward }`
- Inserts into `link_tasks` with `status='draft'`, `scheduled_date=<date>`, `package_id=<id>`
- Admin reviews → clicks activate → status becomes `active` and visible to users from midnight of `scheduled_date`

## 4. Database migration

Add to `link_tasks`:
- `package_id uuid references packages(id)` — which package this task belongs to
- `scheduled_date date` — which day it runs
- `is_draft boolean default true` — admin verify gate

Auto-activation: a cron / on-read check activates draft tasks when `scheduled_date <= today` AND admin has clicked "activate batch".

Fetching for users: `tasks.tsx` (user) filters by user's active package + `scheduled_date = today` + `is_draft = false`.

## 5. Files

- `supabase/migrations/*` — schema change
- `src/lib/admin-tasks.functions.ts` — `generateTasksForPackage`, `activateTaskBatch`, `listTasksByPackageDate`
- `src/routes/admin.tasks.tsx` — restructured list + package button grid
- `src/routes/admin.tasks.package.$packageId.tsx` — new per-package management page
- `src/routes/_authenticated/tasks.tsx` — update user filter to package + scheduled_date

## Notes
- AI generates plausible URLs but does NOT guarantee they resolve — that's why admin verify step exists before activation
- Pre-creating tomorrow's tasks tonight works because `scheduled_date` gates visibility, not `created_at`
