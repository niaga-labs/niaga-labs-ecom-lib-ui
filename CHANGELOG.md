# Changelog

All notable changes to `lib-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed — `PendingPayment` gains the receipt id, and the verify/reject callbacks hand back that (NIAGA-245)

- **BREAKING for consumers of `@niaga/lib-ui/admin/payments/PendingPaymentsTable`**, of which there is
  exactly one: `frontend-admin`'s `payments/pending` page. Verified by grep across `frontend-admin/src` and
  `frontend-storefront` before changing the interface.
- `PendingPayment` gains **`id`** — the **receipt's** own id, not the order's — and `onVerify` / `onReject`
  now receive **that** id instead of `orderId`. The table's row `key` follows.
- **Why: the old shape could not have worked.** `service-order`'s endpoints are
  `PUT /api/v1/admin/payments/:id/{verify,reject}` and parse `:id` as the payment-receipt uuid, looking it
  up with `GetReceiptByID`. The table handed over `orderId`. Both are uuids, so it would parse cleanly and
  then find nothing — a lookup miss, not a validation error.
- The interface carries that reasoning as a doc comment on the field, so the next person to wire this table
  does not have to re-derive which uuid the backend wants.
- `tsc --noEmit` **0 errors**. lib-ui has no CI (it has no workflows at all — see the workspace
  `ci-known-red.txt`), so that is the whole of the automated check available here.
- **This alone does not fix the page.** `frontend-admin` still calls the wrong paths with the wrong verbs and
  the wrong body field names; that half is the same ticket, landing next in the cross-repo order
  libs → frontends.

### Changed — the brand lives in one constant, not four components (NIAGA-109)

- **`src/brand.ts` is new and exported as `@niaga/lib-ui/brand`.** It holds `BRAND_NAME` (`Niaga`) and the
  two derived surfaces, `BRAND_ADMIN` and `BRAND_WAREHOUSE`. Four components typed the name out themselves;
  now each takes it as a **prop defaulting to the constant**, so a consumer can override per app without
  lib-ui growing a config system (this ticket's explicit "do not"):
  - `admin/polaris/PolarisLayout` — `PolarisSidebar` and `PolarisAdminLayout` take `brand`, default `BRAND_ADMIN`
  - `agent/layout/AgentSidebar` — takes `brand`, default `BRAND_NAME`
  - `agent/orders/OrderSuccess` — takes `brand`, default `BRAND_NAME`, used in the WhatsApp message
  - `warehouse/layout/WarehouseLayout` — `title` now defaults to `BRAND_WAREHOUSE` instead of a literal
- All four props are optional additions, so every existing call site keeps compiling and rendering the same
  strings. **Precisely: there is one live call site**, `frontend-warehouse/src/components/WarehouseShell.tsx`
  → `WarehouseLayout`, and it now passes no `title` at all. The Polaris layout is unused (frontend-admin has
  its own local `AdminLayout`) and both agent components are unused because the storefront agent portal is
  unbuilt (NIAGA-140). So the compatibility claim is true but nearly vacuous, and worth stating that way.

#### The old brand was still on screen

`AgentSidebar`'s logo badge read **`DM`** — Desa Murni, the brand this product stopped using on 2026-09-02
(NIAGA-99). It is now derived from `brand` (first letters of the first two words), so the badge cannot drift
away from the wordmark next to it again.

That is the argument for this ticket in one line: a brand string with no single home survives a rename. The
old name is still present in **18 of the 19 repos** as of 2026-09-05 — measured, not recalled. Some of those
hits are now deliberate historical mentions in a CHANGELOG (including this one), so NIAGA-110's sweep has to
separate "still calls the product Desa Murni" from "records that it used to".

#### Premise corrected

NIAGA-109 said lib-ui had **5** files matching `Niaga` under `src`. It is **4**: `PolarisLayout.tsx`,
`AgentSidebar.tsx`, `OrderSuccess.tsx`, `WarehouseLayout.tsx` — six occurrences between them. Counted
whole-repo rather than by an assumed directory, after a count taken that way was wrong earlier the same day.

### Added — a type-check script, so CI can run the step it already calls (NIAGA-134)

- `package.json` gains `"type-check": "tsc --noEmit"`. Three frontend workflows have been running
  `npm run type-check` for months against a script **no repo declared**, so every frontend CI run failed on a
  missing script before it reached anything real.
- It passes: `tsc --noEmit` reports **0 errors** here today.

### Fixed - six exports subpaths were shadowed by their own wildcard (NIAGA-168)

- Six exact `exports` keys were listed **after** the wildcard covering the same directory, so a resolver
  taking the first match hit the wildcard, mapped to a `.tsx` file that does not exist, and failed:

  | Exact key | maps to | wildcard would hit |
  |---|---|---|
  | `./admin/categories/categories` | `categories.ts` | `categories.tsx` (absent) |
  | `./admin/collections/collections` | `collections.ts` | `collections.tsx` (absent) |
  | `./admin/content/banners` | `banners.ts` | `banners.tsx` (absent) |
  | `./admin/marketplace/marketplace` | `marketplace.ts` | `marketplace.tsx` (absent) |
  | `./admin/products/products` | `products.ts` | `products.tsx` (absent) |
  | `./admin/users/users` | `users.ts` | `users.tsx` (absent) |

- Each exact key now precedes its wildcard, which is what `./warehouse` and `./agent/dashboard` already did -
  this makes the file consistent with its own convention rather than inventing one.
- **All six have real importers** in `frontend-admin/src` (14 in total). Only `products` had surfaced,
  because `frontend-admin`'s build stopped at the first one.
- The failure was invisible in TypeScript: `tsc` honours exact-before-wildcard, so type-checking passed.
  Only webpack's resolver disagreed, and it did not fail the compile - it emitted a **throwing stub**
  (`Error("Cannot find module ...")` with `code = "MODULE_NOT_FOUND"`) into the server chunk, deferring the
  error to prerender.

### Notes

- Linked into the frontends as `file:../lib-ui`, which npm symlinks rather than copies.
- **`npm install` must be run here before either frontend will build.** `tailwind.preset.ts` does `require("tailwindcss-animate")`, and Node resolves that from this directory — outside the frontend's `node_modules` — so the frontend's CSS build fails with `Cannot find module 'tailwindcss-animate'` until this repo is installed. Written up in `infra-platform/docs/LOCAL_DEV.md` (DMB-7).
