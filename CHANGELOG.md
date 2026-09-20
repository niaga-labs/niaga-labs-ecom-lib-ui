# Changelog

All notable changes to `lib-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed — the admin read types are camelCase, the way the rest of the frontend already is (NIAGA-389)

- The house direction is *backend serialises snake_case, frontend consumes camelCase*, with the admin BFF
  proxy converting responses. NIAGA-377 moved frontend-admin's own types across; three shapes could not
  follow, because **this repo owns them and declared them in snake_case** — so frontend-admin had to map
  *towards* snake_case for `Banner`, `Collection` and `MarketplaceConnection`, the opposite of every other
  mapper in the codebase and a trap for the next reader.
- Flipped here: `Banner` (18 fields), `Collection`, `CollectionSummary`, `CategoryInCollection`
  (13 fields) and `MarketplaceConnection` (6 fields), with `BannerForm`, `CollectionForm` and
  `ConnectionCard` following.
- **`CollectionFormData` is deliberately NOT flipped, and there is a comment saying so.** It is the
  *request body* for create/update collection, and request bodies are forwarded verbatim —
  service-catalog binds snake_case, so a camelCase key there would be silently dropped under a 200
  (NIAGA-365). `collections.ts` now holds a camelCase read type next to a snake_case write type on
  purpose; the same split appears inside `CollectionForm`, where `initialData` is read in camelCase and
  `InternalFormState` stays snake_case because it feeds the body.
- Consumers move in the same change set: frontend-admin inverts its three mappers (NIAGA-389, second PR).


### Fixed — `package-lock.json` is tracked, so installs are reproducible (NIAGA-197)

- Commit 8a742ad untracked the lockfile, on the grounds that the consumers' lockfiles cover lib-ui. They
  do not: lib-ui ships `.tsx` source, and Node resolves its imports from lib-ui's own location, so lib-ui
  needs its own `node_modules` (found in NIAGA-194). The `.gitignore` line is removed and says why.
- The lockfile was generated on `node:20` / npm 10.8.2, the `NODE_VERSION` the frontend workflows pin.
  lockfileVersion 3, 227 entries; 199 packages install on linux, most of them auto-installed peers.
- Proof on `node:20`, from two fresh copies: `npm ci --ignore-scripts` exit 0 both times, and
  `npm ls --all --parseable --long` gave identical 200-line listings (same sha256). A `package.json` edited
  without the lockfile makes `npm ci` fail with EUSAGE ("not in sync"), which is the point.
  `tsc --noEmit` exit 0 on the installed copy.
- The frontends' CI switches `npm install --prefix ../lib-ui` to `npm ci` in their own PRs.

### Changed — React 19 / Next 15 compatible (NIAGA-314)

- `peerDependencies` now accept both lines: `next` `^14.2.33 || ^15.5.24`, `react` / `react-dom`
  `^18.3.1 || ^19.0.0`. The frontends are moving to Next 15 one at a time.
- `devDependencies` `@types/react` / `@types/react-dom` → `^19.3.0`. A consumer's `tsc` checks lib-ui's
  source against lib-ui's own `node_modules/@types/react`. With the 18 types there, frontend-warehouse on
  React 19 failed: `React.ReactNode` from 19 is not assignable to 18's `ReactNode` (the `bigint` member).
- `primitives/collapsible.tsx`: the `asChild` clone types the child's props, because React 19's
  `isValidElement` narrows them to `unknown`. `npm run type-check` exits 0.

### Added — Claude Code layer (NIAGA-273)

- `CLAUDE.md` at the repo root (product, Jira key, the `file:` symlink gotcha, the brand-constant
  convention) plus `.claude/` (memory, resume point, settings). Verified: `npm run type-check` — clean,
  0 errors.

### Removed — the orphaned `src/agent` module and its exports (NIAGA-132)

- Deleted `src/agent/**` (**32 files** across six subdirectories — commissions, customers, dashboard, layout,
  orders, performance) and `src/hooks/useAgent.ts`, and removed their entries from `package.json`.
  **Exports 42 → 32.**
- **It can be restored from git if the agent portal returns** — `git log --diff-filter=D -- src/agent` finds
  this commit, and nothing about the deletion is lossy. The storefront agent portal is NIAGA-140, still To Do;
  if it is built, these components are a `git checkout` away rather than a rewrite.
- **The export count was 10, not the 9 the ticket and my first pass both said.** The tenth is
  `"./hooks/useAgent"`, missed because a case-sensitive `grep agent` does not match `useAgent`. Caught by an
  assertion in the edit script rather than by reading — the script refused to run when the key count did not
  match what it had been told to expect, which is the only reason the hook's export would not have been left
  dangling behind a deleted file.

#### Confirming it was really orphaned — and one search that proved nothing

The ticket asks for zero importers across the three frontends. The first pass searched
`frontend-*/src` and found none anywhere, which was **wrong for one of them**:

| repo | ts/tsx files | `@niaga/lib-ui` imports (control) | agent-module hits |
|---|---|---|---|
| frontend-admin | 230 | 319 | **0** |
| frontend-storefront | 272 | 3 | **0** |
| frontend-warehouse | 24 | 12 | **0** |

- **`frontend-storefront` has no `src/` directory at all.** Its 272 files live in `app/`, `components/`,
  `lib/` and `hooks/`. So the original `frontend-storefront/src` search matched nothing because there was
  nothing there to match — a zero that looked exactly like an answer. Re-run against the real tree, its
  control finds 3 real lib-ui imports and still 0 agent hits.
- **Every row above carries a non-zero control on purpose.** A search that finds no agent imports is only
  evidence if the same search finds the imports that *are* there; otherwise it is indistinguishable from a
  search that did no work.
- Widening from `src/` to the whole repo also moved admin's control from 313 to **319**, so six of its lib-ui
  imports live outside `src/` too.
- Nothing inside `lib-ui` itself referenced `src/agent` or `useAgent` either, so no internal import dangles.

- Checks: `npm run type-check` **exit 0** in lib-ui, unchanged from the baseline taken before the deletion ·
  `npm install` in lib-ui, then **all three frontends built: `npm run build` exit 0 and "Compiled
  successfully" for `frontend-admin`, `frontend-storefront` and `frontend-warehouse`**, which is this ticket's
  done-when · all three frontend trees left clean.

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
- **THIS ACTIVELY BREAKS `frontend-admin`'s COMPILE UNTIL THE COMPANION LANDS — it does not merely fail to
  fix it.** An earlier draft of this entry said "this alone does not fix the page", which undersold it.
  `frontend-admin` links this package as `"@niaga/lib-ui": "file:../lib-ui"`, so the change is live in its
  tree the moment this branch exists: `npx tsc --noEmit` there now fails with
  `TS2741: Property 'id' is missing … but required in type 'PendingPayment'` at
  `payments/pending/page.tsx:21`. Review found it; I reproduced it before writing this.
- **That makes the merge ORDER load-bearing, not just conventional.** `frontend-admin`'s CI clones lib-ui
  from **`main`** (NIAGA-194), so its build cannot go green until this merges — and its `main` is red from
  the moment this lands until the companion does. The window is real and unavoidable in this direction;
  it is kept to minutes by merging the two back to back, libs first. **Making `id` optional to dodge it was
  considered and rejected:** an optional field lets the wrong uuid keep flowing silently, which is the
  entire bug.
- `frontend-admin` still calls the wrong paths with the wrong verbs and the wrong body field names; that
  half is the same ticket and lands immediately after this one.

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
