## Distributor Panel Upgrade — Header, Notifications, Withdrawal Access

### 1. New Distributor Top Header (matches Admin UX)

Add a sticky top header inside `DistributorLayout` (`src/components/distributor/DistributorLayout.tsx`) for both mobile and desktop, containing:

- **Live Search** — a `DistributorLiveSearch` component that searches only the distributor's own users (`profiles` where `distributor_id = me`), own leads, and own withdrawals. Same UX as `AdminLiveSearch` (debounced input, dropdown results, keyboard nav).
- **Support button** — quick link to `/distributor/support` with icon.
- **Notification bell** — new `DistributorNotificationBell` component (scoped to distributor).
- **Profile shortcut** — link to `/distributor/profile`.

Header will render:
- Desktop: on the sticky top bar (currently unused in the layout).
- Mobile: inline in the existing mobile header (replacing the plain menu button row).

### 2. Distributor Notification Bell

New component `src/components/distributor/DistributorNotificationBell.tsx` — visually identical (indigo/violet gradient) to admin bell, but scoped:

- New users assigned to the distributor (`profiles.distributor_id = me`)
- Withdrawal requests from their users — via a new server fn `distributorListNotifications` (RLS-safe)
- New leads (`distributor_leads` where `distributor_id = me`)
- Own commission/earnings events (`distributor_earnings` new rows)
- If withdrawal-access is enabled (see #3), also show admin-wide pending withdrawals

Realtime via Supabase channel filtered to relevant tables.

### 3. Withdrawal Request Management for Distributors

**Database (migration):**
- Add column `distributors.can_manage_withdrawals boolean NOT NULL DEFAULT false`.
- Add SECURITY DEFINER function `public.distributor_can_manage_withdrawals(_uid uuid) returns boolean` — used by RLS.
- Update `withdrawals` RLS to allow SELECT/UPDATE by distributors where `can_manage_withdrawals = true` (mirroring admin abilities). Admin path unchanged.
- Optional: a helper RPC `distributor_review_withdrawal(_id, _decision, _note)` that verifies the flag and performs the same balance/status logic as `admin_review_withdrawal`. Reuses existing admin logic where possible.

**Server functions** — new `src/lib/distributor-withdrawals.functions.ts`:
- `distributorListWithdrawals({ filter, q })` — gated by `can_manage_withdrawals` flag, returns same shape as admin.
- `distributorReviewWithdrawal({ id, decision, note })` — approve/reject/paid, gated by flag.
- `distributorGetWithdrawalDetail({ id })` — user profile + history + stats (same as admin).

**New route** `src/routes/distributor.withdrawals.tsx` (new file — replaces the current placeholder or coexists as the management view; current `/distributor/withdraw` is the distributor's own withdrawal request page, so this becomes `/distributor/withdrawals` — the management page). Copy the admin withdrawals UI (`admin.withdrawals.tsx`) as-is, wire to the new distributor server fns. Route guard: redirect to `/distributor` if `can_manage_withdrawals` is false.

**Sidebar entry** — add "উইথড্র রিকোয়েস্ট (ম্যানেজ)" to `DistributorLayout` NAV, but only rendered client-side when the current distributor's `can_manage_withdrawals = true` (fetched via `distributorGetMe`).

**Admin toggle** — in `src/routes/admin.distributors.$id.tsx` and `DistributorFormModal`, add a checkbox "উইথড্র রিকোয়েস্ট ম্যানেজ করার অনুমতি" that writes `can_manage_withdrawals` via existing `admin_upsert_distributor` RPC (patch field). The RPC already accepts arbitrary `_patch jsonb` so no RPC change needed — just include the field in the patch object.

### Technical Notes

- All new server fns use `.middleware([requireSupabaseAuth])` + `assertDistributor` helper; withdrawal-review fns additionally check `can_manage_withdrawals`.
- `withdrawals` RLS: add a policy `distributor_manage_withdrawals` FOR SELECT/UPDATE USING `public.distributor_can_manage_withdrawals(auth.uid())`.
- No changes to admin flow — admin retains full control.
- Notification bell reuses styling; scoped queries only.

### Files Touched

- Migration (new column + RLS + optional RPC)
- `src/components/distributor/DistributorLayout.tsx` (header + conditional nav)
- `src/components/distributor/DistributorNotificationBell.tsx` (new)
- `src/components/distributor/DistributorLiveSearch.tsx` (new)
- `src/lib/distributor-withdrawals.functions.ts` (new)
- `src/routes/distributor.withdrawals.tsx` (new)
- `src/components/admin/DistributorFormModal.tsx` + `src/routes/admin.distributors.$id.tsx` (toggle checkbox)
- `src/hooks/use-distributor-me.ts` (small hook to cache `distributorGetMe` for gating UI)

Shall I proceed?