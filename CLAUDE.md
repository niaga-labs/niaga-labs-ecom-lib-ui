# lib-ui — Niaga shared React components

Shared UI library for the three Niaga frontends: primitives shared by all of them, plus per-frontend domain
components under `admin/`, `storefront/` and `warehouse/`. No app of its own — consumed via
`"@niaga/lib-ui": "file:../lib-ui"` from `frontend-admin`, `frontend-storefront` and `frontend-warehouse`.
Jira project **NIAGA** · GitHub `niaga-labs/niaga-labs-ecom-lib-ui` (part of the `niaga` workspace). Global
rules live in `~/.claude/`; this file only adds what is specific here.

## Orient here first

- `CHANGELOG.md` — what changed here and in which consuming frontend.
- `package.json`'s `exports` map — the actual public surface; a path not listed there is not importable
  from a frontend even if the file exists.

## Commands

| Task | Command |
|---|---|
| install | `npm ci` — `package-lock.json` is tracked (NIAGA-197). After changing `package.json`, regenerate it with `npm install` on npm 10 (the frontends' CI Node 20), or every frontend CI fails at `npm ci --prefix ../lib-ui` |
| type-check | `npm run type-check` (`tsc --noEmit`) — the only script this repo has; no test suite, no build step |

**Verified 2026-09-13:** `npm run type-check` — clean, 0 errors.

## Conventions that differ from the global rules

- **CI runs `npm run type-check` on every PR (NIAGA-19).** There is no lint script and no test yet, so the type check is the whole gate.
- **A `file:` dependency is a symlink holding an absolute path.** If this workspace folder is ever moved or
  renamed, every consuming frontend needs `npm install` re-run to relink it — `package-lock.json` is
  untouched, so the breakage is silent until something imports from here (NIAGA-167, the 2026-09-02 rename).
- No brand strings, no product copy: `brand.ts` holds the one constant every consumer reads, so "the old
  brand is still on screen" is a `brand.ts` bug, not a per-frontend one (NIAGA-109).
- Admin uses this library heavily; storefront barely does. A component that only storefront needs still
  goes under `storefront/`, never `admin/`, even if admin happens to import it later.

## Where things are

- `src/primitives/` — framework-agnostic building blocks, exported individually (`./primitives/*`).
- `src/admin/`, `src/storefront/`, `src/warehouse/` — one folder per consuming frontend's domain components.
- `src/styles/globals.css` + `src/styles/themes/*.css` — one theme file per frontend.
- `tailwind.preset.ts` — the shared Tailwind config every frontend extends.
