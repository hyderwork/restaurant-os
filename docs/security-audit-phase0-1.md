# RestaurantOS — Step 0 Repository Analysis & Phase 0.1 Security Audit

Audit date: 2026-11-27  
Repository: `hyderwork/restaurant-os` (`main`)  
Supabase project: `jymoqdmeeiojinhqkxpn`

## 1. Repository reuse map

| Area | Existing implementation | Reuse decision |
|---|---|---|
| App framework | Next.js 16 App Router, React 19, TypeScript 5.8 strict, Tailwind 4 | Keep as-is |
| Supabase clients | `src/lib/supabase/client.ts`, `server.ts`; publishable key only | Keep; add server-only privileged modules only when a concrete server workflow requires them |
| Tenant resolution | `src/lib/auth/tenant.ts`; resolves authenticated user through active memberships | Extend for branch context; do not create a second tenant resolver |
| Route/session proxy | `src/proxy.ts`; refreshes Supabase session and matches `/admin/:path*` | Keep; expand deliberately for public rate-limited endpoints/custom host routing |
| Owner/admin workspace | `src/app/admin/**`, server actions in `src/app/admin/actions.ts` | Extend existing pages/actions |
| Staff workspace | `src/app/staff/**`, role checks in `src/app/staff/actions.ts` | Extend for branch-scoped staff and rider app |
| Platform administration | `src/app/superadmin/**`, guarded by `requirePlatformAdmin` | Reuse for tenant/branch/package/domain controls |
| Customer storefront | `src/app/menu/[slug]/page.tsx` and `public-menu-client.tsx` | Extend to branch-aware online storefront |
| Live updates | `src/components/realtime-sync.tsx`, kitchen realtime component, database broadcasts | Reuse; scope subscriptions by branch when branches exist |
| Database | Existing PostgreSQL tables, helper functions, triggers and RLS | Additive SQL migrations only |
| UI/validation libraries | GSAP, Lucide React, QRCode, Zod already installed | Keep; Zod is not consistently used in inspected server actions |

### Existing database assets

The live database has the established restaurant tenant model: `restaurants`, `memberships`, `restaurant_settings`, plans/subscriptions, floors/tables/QRs, menu categories/products, orders/items/status history, payments, audit logs, feedback, platform admins, and private pending owner invitations.

Existing private helper functions include `is_restaurant_member`, `has_restaurant_role`, `is_platform_admin`, and `enforce_restaurant_package_limits`. All identified application tables have RLS enabled.

### Important migration-source drift

Supabase reports 23 applied migrations, but the historical SQL files were not found under the repository's conventional `supabase/migrations/` path during this inspection. This makes a fresh environment/rebuild difficult to reproduce from Git alone. The new Phase 0.1 migration is now committed under that path; the prior 23 migration files still need to be recovered/exported and checked into source control before relying on CI or a second environment.

## 2. Phase 0.1 findings

### Fixed in this pass

| Severity | Finding | Remediation |
|---|---|---|
| High | Authenticated staff roles had a direct `orders` INSERT policy, allowing order creation outside the validated pricing RPC. | Removed `orders_staff_insert`; order creation must use existing transactional `create_staff_order` or public ordering RPCs. |
| High | Staff roles had broad `order_items` ALL access, allowing direct line-item mutation outside approved order workflows. | Removed `order_items_staff_write`; item writes remain through existing database RPC workflows. |
| High | The broad order UPDATE policy permitted status-authorized staff to submit changes to other order columns. | Added a trigger that restricts direct updates to `status` and `updated_at`; other changes must go through approved database RPCs. |
| High | The POS order RPC accepted arbitrary manual discounts from every role allowed to call it. | Added a database guard: manual discounts require OWNER/ADMIN. Delivery-fee overrides require OWNER/ADMIN/MANAGER until branch delivery rules are implemented. |
| High | Every active restaurant member could read the entire `restaurant_settings` row, including the stored `wifi_password`. | Replaced member-wide SELECT with OWNER/ADMIN-only SELECT; public menu still receives only the explicit branding fields returned by its RPC. |
| Medium | Menu price changes and staff membership access changes were not automatically written to `audit_logs`. | Added database audit triggers for product base-price changes and membership creation/role/status changes. |

Migration 1: `supabase/migrations/20261127075755_phase0_1_order_write_hardening.sql`  
Migration 2: `supabase/migrations/20261127080848_phase0_1_restrict_settings_access.sql`  
Both migrations were applied to the connected Supabase project.

### Verification performed

- RLS test as an authenticated Chef account: own tenant returned 18 orders and 19 products; another tenant returned 0 orders, 0 products and 0 restaurant rows.
- Direct update of an order's total as an authenticated Manager was rejected by the new database trigger.
- Status-only order update by an authenticated Manager remained allowed, preserving the existing staff workflow.
- Direct update of order items as an authenticated Manager affected 0 rows after the write policy was removed.
- Existing Owner POS `create_staff_order` RPC completed successfully inside a rolled-back test transaction.
- Manager discount override was rejected by the new database guard.
- Public takeaway menu RPC remained callable by `anon` and returned its expected JSON object.
- Full anonymous takeaway flow (create order → add items → cancel → tracking state) completed inside a rolled-back test transaction.
- Chef RLS test returned 0 `restaurant_settings` rows; Owner test returned 1 row.
- Product price audit trigger wrote an audit row in a rolled-back test transaction.
- Membership access-change audit trigger wrote an audit row in a rolled-back test transaction.
- Supabase Security Advisor was rerun. Remaining warnings are documented below; public customer RPCs were not blindly disabled because the QR/takeaway customer flow depends on anonymous access.

No production orders, prices, memberships or customer records were intentionally changed by the tests; mutation checks ran in transactions and were rolled back.

### Findings still open

| Severity | Finding | Required next action |
|---|---|---|
| High / launch blocker | Public menu/order/tracking RPCs are callable directly through Supabase PostgREST and no reliable shared IP-based rate limiter was found. | Route public mutations through a rate-limited server boundary or a trusted edge service. Do not rely on client-supplied IP headers. Preserve anonymous QR/takeaway checkout. |
| High / launch blocker | Public order creation RPCs do not accept an idempotency key. Repeated requests can create duplicate orders. | Add a backward-compatible idempotency key and unique tenant-scoped constraint to order creation RPCs. |
| Medium | Zod is installed, but inspected server actions currently use hand-written validation. | Apply shared Zod schemas to every server action and future route/RPC input boundary. |
| Medium | Public `restaurant-logos` bucket is intentionally public and upload policy is tenant-member scoped, but SVG is an allowed MIME type. | Remove SVG uploads or sanitize SVG server-side; retain public reads for logo rendering. |
| Medium | Historical migration files are missing from the repository's conventional migration directory. | Recover all applied SQL migrations into source control and verify order against Supabase migration history. |
| Medium | Tenant selection uses the first active membership in some layouts/resolvers. | Replace implicit first-membership selection with explicit active restaurant context before adding branches/multi-workspace switching. |
| Medium | No automated RLS/order-flow/webhook test suite was found in the inspected project paths. | Add repeatable SQL RLS tests and TypeScript integration/unit tests in CI. |

## 3. Detailed security review

### RLS and tenant isolation

- RLS is enabled on the identified public application tables.
- Existing policies use tenant membership/role helpers for the core restaurant-scoped entities.
- `order_items`, `order_status_history`, and `order_feedback` resolve tenant access through their parent order.
- `platform_admins` has a self-read policy; platform operations use `private.is_platform_admin()`.
- `private.pending_owner_invites` has RLS enabled and no policies. This is currently fail-closed: the private schema is not usable by `anon`, and `authenticated` has no SELECT privilege on that table. Privileged onboarding functions access it.
- The executed cross-tenant test confirmed the sample Chef cannot read another restaurant's orders, products or restaurant row.

### SECURITY DEFINER RPCs and public access

Supabase Security Advisor currently reports 8 anon-executable and 15 authenticated-executable SECURITY DEFINER functions. Public-facing functions include menu retrieval, QR/takeaway order placement, tracking, feedback, cancellation and add-items. Their anonymous execution is intentional for guest checkout/tracking, but it increases the importance of function-body validation, fixed search paths, token checks, and rate limiting.

Catalog verification found 29 SECURITY DEFINER functions across the public/private application schemas and 0 without an explicit `search_path`. The inspected high-impact functions use fixed `search_path` settings (`pg_catalog` or empty) and schema-qualified object references. Public QR menu/order RPCs validate restaurant slug plus the QR token hash. Customer tracking uses a random tracking token whose SHA-256 hash is stored on the order; the order UUID alone is insufficient to retrieve tracking data. Staff/platform RPCs inspected perform role checks in the database.

Do not revoke anonymous execution from customer-facing RPCs without replacing the public flow with an authenticated server boundary.

### Auth, invites and platform admin

- Server and browser clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no service-role client module was found in the inspected paths.
- `.env.example` contains only the Supabase URL, publishable key and app URL.
- `requirePlatformAdmin` checks the active platform-admin row server-side; Super Admin layout and privileged RPCs also check platform-admin status.
- Pending owner invitations are stored in the private schema and are not directly readable by anon/authenticated table grants.
- Staff provisioning currently uses the publishable key for Supabase Auth sign-up/reset flows, not the service-role key.

### Routes and public endpoints

- `src/proxy.ts` refreshes sessions and matches `/admin/:path*`.
- Staff and Super Admin layouts perform server-side authorization using `requireStaff` / `requirePlatformAdmin`.
- The public menu client invokes Supabase RPCs directly; no conventional `src/app/api/**` route-handler directory was found in the inspected paths.
- No shared IP-based rate limiter was found. Public RPC abuse protection remains a launch blocker.

### Storage

- Bucket: `restaurant-logos`, public read enabled, 3 MB limit.
- Upload policy restricts writes to a UUID restaurant folder and active OWNER/ADMIN/MANAGER memberships.
- No Storage UPDATE or DELETE policy was found; replacing/deleting existing objects through client upsert may not be supported.
- SVG is currently allowed and should be removed or sanitized.

## 4. Roadmap reuse/gap analysis

| Roadmap area | Existing foundation | Gap |
|---|---|---|
| Phase 0.1 Security | RLS, role helpers, tokenized public RPCs, server auth, audit log | Rate limiting, idempotency, consistent Zod validation, test suite, migration history recovery |
| Phase 0.2 Branches | Restaurant tenant ID, memberships, floors/tables/orders/settings | No branches table, branch assignment, branch context, branch price/availability overrides |
| Phase 1 Online ordering | Branded QR menu, takeaway, cart, guest ordering, tracking, server-side subtotal/tax/service calculation | Delivery checkout, zones, saved addresses, scheduling, modifiers/combos, website builder, domains, gateway, notification queue, delivery statuses |
| Phase 2 Delivery/CRM | Basic delivery fields, customer directory, feedback, order realtime | Rider role/PWA, assignment, tracking, zones, coupons, loyalty ledger, campaigns/opt-outs |
| Phase 3 Inventory | Product ingredients/allergen fields only | Stock ledger, suppliers, purchase orders, recipes, costing, expenses, closing reports |
| Phase 4 Channels/Analytics/Billing | POS, reports, subscription plans/status, Super Admin, realtime | Kiosk, digital menu boards, advanced analytics, automated subscription payments/invoices/dunning, split bills, shift reconciliation, offline sync |

## 5. Phased implementation estimate

Estimates are rough reviewable change sizes, not delivery promises. Existing pages/components should be extended instead of duplicated.

| Phase | Main work | Estimated impact |
|---|---|---|
| 0.1 Security completion | Rate-limited public mutation boundary, order idempotency, Zod schemas, storage SVG restriction, RLS/flow tests, recover migration history | 3–6 SQL migrations, 8–14 TS/TSX files, 2–4 test/docs files |
| 0.2 Branches | Branch schema/backfill, branch memberships, branch-aware resolver, package limits, branch switcher, POS/KDS/menu/report updates | 2–4 SQL migrations, 12–20 TS/TSX files, RLS tests |
| 1 Online ordering/websites | Storefront/checkout, saved addresses, zones, modifiers, website builder, domains, payment provider, notification queue, tracking states | 8–12 SQL migrations, 20–35 TS/TSX files, provider/env setup |
| 2 Delivery/CRM | Rider app, dispatch/assignment, tracking, coupons, loyalty ledger, customer segments/campaigns | 8–12 SQL migrations, 20–35 TS/TSX files |
| 3 Inventory/costing | Ingredients, units, suppliers, purchase/stock ledgers, recipes, costing, expenses | 6–10 SQL migrations, 15–25 TS/TSX files |
| 4 Channels/analytics/billing | Kiosk, menu boards, analytics, subscription invoices/billing/dunning, POS shift/split/offline work | 8–12 SQL migrations, 20–35 TS/TSX files |

## 6. Explicit assumptions

- One restaurant remains the tenant; branches are subordinate operating locations, not separate tenants.
- Existing PKR numeric money columns are retained during backward-safe rollout. Converting all existing monetary fields to paisa is a separate migration and requires reconciliation tests.
- Existing QR and takeaway customer flows remain anonymous; public RPCs are not disabled until a replacement boundary is tested.
- Branch defaults will be backfilled from each restaurant's current floors/tables/orders before branch-aware reads become mandatory.
- No payment gateway is selected yet; provider choice remains a blocking decision in Phase 1.6.
- Phase 0.2 will not begin until the owner reviews and approves the Phase 0.1 findings.
