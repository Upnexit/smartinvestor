# Smart Investor Admin — Build Plan

A premium, fully gradient-themed Bangla admin panel layered on top of the existing user app. Reuses the connected Supabase project, the already-built `admin_review_user_package` RPC, and the `has_role` gate. No SMS pages.

## 1. Database migration (one migration)

Additions only — keeps existing schema intact.

**New tables**
- `communities` (name, slug, description, active)
- `community_bans` (user_id, banned_by, reason, expires_at)
- `error_logs` (level, message, context jsonb, source)

**Column additions**
- `user_packages.screenshot_url` (text, nullable) — for receipts uploaded at checkout
- `withdrawals.note` (text), `withdrawals.reviewed_by`, `withdrawals.reviewed_at` (if missing)
- `link_tasks.category` (text), `link_tasks.daily_limit` (int)

**SECURITY DEFINER RPCs** (revoke from anon/authenticated, grant to service_role):
- `admin_update_user_profile(_actor, _user_id, _patch jsonb)` — whitelisted fields only
- `admin_delete_user_data(_actor, _user_id)` — cascading cleanup
- `admin_save_package(_actor, _id, _patch jsonb)` — insert or update
- `admin_toggle_package(_actor, _id, _active)`
- `admin_delete_package(_actor, _id)`
- `admin_review_withdrawal(_actor, _id, _action, _note)` — atomic balance debit/refund

**Triggers**
- `profiles` BEFORE UPDATE: block self-modification of `balance`, `locked_balance`, `status` unless caller has admin role or is `service_role`
- `task_submissions` AFTER UPDATE: when status flips to approved, credit reward to balance

**Storage buckets**: `payment-screenshots` (private), `package-images` (public), `payment-logos` (public), `avatars` (public)

## 2. Server functions (`src/lib/admin-*.functions.ts`)

All use `requireSupabaseAuth` + a server-side `has_role('admin')` check before doing anything. `supabaseAdmin` loaded via `await import` inside handlers.

- `admin-users.functions.ts` — list/search users, get detail, update, delete
- `admin-packages.functions.ts` — CRUD + toggle
- `admin-withdrawals.functions.ts` — list + review
- `admin-tasks.functions.ts` — CRUD link tasks
- `admin-settings.functions.ts` — read/write `site_settings` keys
- `admin-community.functions.ts` — delete message, ban user
- `admin-reports.functions.ts` — aggregated stats (revenue/signups/withdrawals)
- `admin-monitor.functions.ts` — health pings + error log read

Existing `checkout.functions.ts` already exposes `adminApprovePackage`, `adminRejectPackage`, `checkIsAdmin` — reuse as-is.

## 3. Design system extensions (`src/styles.css`)

- `@keyframes admin-pop` + `.animate-admin-pop`
- `.bg-app` cream gradient
- `.shadow-pop` / shimmer skeleton utility
- `ACCENTS` token map lives in `src/lib/admin-accents.ts` (12 named accents → `{bar, chip, glow, soft, gradient}` Tailwind class strings) so every page picks its color by name.

## 4. Shared admin shell (`src/components/admin/`)

- `AdminAuthGate.tsx` — calls `checkIsAdmin`, shows access-denied card otherwise
- `AdminLayout.tsx` — sidebar (desktop) + drawer (mobile) + top bar; nav array drives both
- `AdminTopBar.tsx` — search, bell badge, profile shortcut
- `AdminPageHeader.tsx`, `AdminCard.tsx`, `StatTile.tsx`, `AdminSectionTitle.tsx`, `GradientButton.tsx`, `ConfirmDeleteModal.tsx`, `Shimmer.tsx`
- `useAdminAutoRefresh.ts` hook + `src/lib/admin-refresh.ts` event bus

## 5. Routes (file-based, `ssr: false`, gated)

Use a pathless layout `src/routes/admin.tsx` so every `admin.*` route inherits the gate and shell.

```
admin.tsx                  layout + gate
admin.index.tsx            Dashboard
admin.users.tsx            User list
admin.users.$id.tsx        User detail
admin.withdrawals.tsx
admin.packages.tsx
admin.approvals.tsx        (move existing /admin/approvals here)
admin.payments.tsx         Gateway settings
admin.tasks.tsx
admin.community.tsx
admin.reports.tsx
admin.monitor.tsx
admin.settings.tsx         Homepage settings
admin.profile.tsx
```

The existing `_authenticated/admin/approvals.tsx` page is replaced by `admin.approvals.tsx` so the entire admin surface lives under one consistent layout (and works for admins who aren't necessarily routed through the user panel).

## 6. Realtime & data

- TanStack Query for every list; query keys include filters
- Supabase channels on `user_packages`, `withdrawals`, `community_messages`, `task_submissions` — call `emitAdminRefresh()` on change
- `useAdminAutoRefresh()` re-invalidates on route change + tab focus + bus events

## 7. Charts

Recharts (already in deps) with `<linearGradient>` fills. Two chart components shared across Dashboard and Reports: `<AreaTrend />`, `<BarTrend />`.

## 8. Out of scope (per spec)

- No `/admin/sms`, no SMS log/inbox/webhook UI
- No edits to existing user panel pages except adding an "Admin" entry point for admins

## 9. Order of operations

1. Submit the migration (single call) — wait for approval
2. Create storage buckets via tool
3. Write design tokens + shared admin shell + accents
4. Write all server functions
5. Write all 13 routes
6. Delete old `_authenticated/admin/approvals.tsx`
7. Build check + brief smoke test of `/admin`

This is a large surface — expect ~25 new files. I'll batch writes in parallel where safe.
