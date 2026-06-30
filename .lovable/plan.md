## Distributor System — Plan

A new role-based panel for regional distributors/agents who manage users in their territory. Distributors log in via the same login page and are auto-routed to their own panel.

### 1. Database (one migration)

**Extend `app_role` enum** — add `'distributor'`.

**New table `public.distributors`** (1:1 with auth user):
- `user_id` (PK, FK → auth.users), `full_name`, `email`, `phone`
- `payment_method` (bkash/nagad/rocket), `payment_number`
- `district`, `thana` (upazila), `address`
- `commission_rate` (default 5%), `total_users`, `total_earned`, `balance`
- `status` (active/suspended), `notes`, `created_by` (admin uuid)
- GRANT to authenticated + service_role; RLS: distributors read own row, admins manage all.

**Extend `profiles`** — add `distributor_id uuid` (nullable, FK → distributors.user_id) so each user belongs to one distributor.

**RPCs (SECURITY DEFINER, admin-only):**
- `admin_create_distributor(email, password, full_name, phone, payment_method, payment_number, district, thana, commission_rate)` — uses `auth.admin.create_user` via service role (called from server fn, not RPC) — actually: do auth creation in server fn, then RPC `admin_upsert_distributor` to insert distributors row + grant `distributor` role in `user_roles`.
- `admin_update_distributor(_actor, _user_id, _patch)`
- `admin_delete_distributor(_actor, _user_id)` — remove role + row; profiles.distributor_id set null.
- `distributor_my_users(_user_id)` — returns users where `profiles.distributor_id = _user_id` (only accessible to that distributor or admin).
- `distributor_stats(_user_id)` — counts, total deposit, total withdrawal, active packages under their tree.

### 2. Server functions (`src/lib/distributor.functions.ts`)

Admin-only:
- `adminListDistributors({ q, limit })`
- `adminCreateDistributor({ email, password, ...fields })` — uses `supabaseAdmin.auth.admin.createUser` (email-confirmed), then upserts distributors row + assigns `distributor` role.
- `adminUpdateDistributor({ userId, patch })`
- `adminDeleteDistributor({ userId })` — best-effort delete from auth + clean tables.
- `adminToggleDistributorStatus({ userId, status })`

Distributor self (uses `requireSupabaseAuth` + role check):
- `distributorGetMe()` — profile + stats
- `distributorListMyUsers({ q })`
- `distributorGetUser({ userId })` — only if that user's `distributor_id = me`
- `distributorListSupportTickets()` — support_messages from their users

### 3. Routing

**Login routing logic** (`auth.tsx`): after sign-in, check role priority: admin → `/admin`, distributor → `/distributor`, else → `/dashboard`.

**New route tree `src/routes/distributor.tsx`** (layout with `DistributorAuthGate`) + children:
- `distributor.index.tsx` — Dashboard: stat tiles (total users, active packages, monthly earnings, support open), recent signups under them, quick links.
- `distributor.users.tsx` — list of users under them with search, balance, package, last activity.
- `distributor.users.$id.tsx` — single user view (read-only profile + activity).
- `distributor.support.tsx` — support chat with their users (reuses support_messages).
- `distributor.earnings.tsx` — commission history + withdrawal request.
- `distributor.profile.tsx` — edit own contact info, payment number.

Visual language: vibrant gradient (indigo/violet) to distinguish from admin (orange) and user panel (amber/emerald).

### 4. Admin panel additions

**Sidebar link**: "ডিস্ট্রিবিউটর" (Distributors) — between Users and Packages.

**`admin.distributors.tsx`**:
- Header with gradient tiles: Total Distributors, Active, Total Users Managed, Total Commission Paid.
- Data table: name, email, phone, district, users count, balance, status, actions (Edit, Suspend, Delete).
- Search + filter by district.
- "Add New Distributor" button → modal with form:
  - Full name, email, password (auto-suggest + show)
  - Phone, payment method (bkash/nagad/rocket), payment number
  - District (dropdown of 64 BD districts), Thana (text)
  - Commission rate %, Notes
  - Submit → creates auth user (email-confirmed) + distributor row + role.

**`admin.distributors.$id.tsx`** (optional drill-down): view distributor + their referred users + recent activity.

### 5. Auth gate for distributor panel

`src/routes/distributor.tsx`:
- `ssr: false`, `beforeLoad` redirects to `/auth` if no session.
- Component checks `has_role(uid, 'distributor')`; if not, redirects to `/dashboard` or `/admin`.
- Renders `DistributorLayout` (sidebar + topbar + Outlet).

### 6. UI components

- `src/components/distributor/DistributorLayout.tsx` — sidebar with logo, nav links, logout.
- `src/components/admin/DistributorFormModal.tsx` — create/edit form with BD district dropdown.
- Reuse `GradientButton`, AdminUI primitives for consistency.

### 7. Files created/changed

**New:**
- `supabase/migrations/<ts>_distributor_system.sql`
- `src/lib/distributor.functions.ts`
- `src/lib/bd-districts.ts` (64 districts constant)
- `src/components/distributor/DistributorLayout.tsx`
- `src/components/admin/DistributorFormModal.tsx`
- `src/routes/distributor.tsx`
- `src/routes/distributor.index.tsx`
- `src/routes/distributor.users.tsx`
- `src/routes/distributor.users.$id.tsx`
- `src/routes/distributor.support.tsx`
- `src/routes/distributor.earnings.tsx`
- `src/routes/distributor.profile.tsx`
- `src/routes/admin.distributors.tsx`

**Modified:**
- `src/components/admin/AdminLayout.tsx` — add Distributors nav link
- `src/routes/auth.tsx` — role-based post-login redirect

### Technical notes

- Distributor creation uses `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` — must be called inside server fn handler with dynamic import of `client.server`.
- Existing `handle_new_user` trigger will create a profile row; we then upsert distributor row + role + clear referral defaults (no signup bonus for distributors — handled by conditionally deleting/skipping).
- Use Bengali district names with English value codes for searchability.
