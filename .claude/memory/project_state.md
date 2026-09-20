---
name: project_state
description: The resume point for this repo — current checkpoint (sha, environment, open units table, recommended next unit) at the top, earlier checkpoints below. Read first in every session; rewritten by /recap.
metadata:
  type: project
---

## 2026-09-21 state (resume here) — NIAGA-389

- **The admin read types are camelCase now**: `Banner`, `Collection`, `CollectionSummary`,
  `CategoryInCollection`, `MarketplaceConnection`, plus `BannerForm`, `CollectionForm`, `ConnectionCard`.
  frontend-admin no longer has to map backwards.
- **`CollectionFormData` stays snake_case on purpose**, with a comment. It is the request body, and
  request bodies are forwarded verbatim to a backend that binds snake_case (NIAGA-365). **Read types and
  write types cross the same boundary in opposite directions** — `collections.ts` holds one of each, and
  so does `CollectionForm` (`initialData` camelCase, `InternalFormState` snake_case).
- **This repo has NO build script** — `npm run type-check` (`tsc --noEmit`) is the only one, and
  `main`/`types` point at `src/index.ts`, so consumers compile the source. NIAGA-389's Testing line asked
  for `npm run build`; that script does not exist. The real verification is the consumers' builds.
- Verified 2026-09-21: `npm run type-check` clean, exit 0.
- **Next**: nothing outstanding here from this unit.

## 2026-09-13 state (resume here)

- **Repo:** the Claude Code layer added (CLAUDE.md, memory, this file) — NIAGA-273 (HQ-58's umbrella).
  Check `git log -1` for the current sha; this note goes stale the moment the PR merges.
- **Environment:** `npm run type-check` — clean, 0 errors.
- **Open units**

| Unit / ticket | State | Blocked on | Note |
|---|---|---|---|
| NIAGA-273 | In Progress | — | umbrella for adding CLAUDE.md to the 8 repos without one; this repo done |

- **Recommended next unit:** none open in this repo specifically.
- **Waiting on Luqman:** none.

## Earlier checkpoints

(none yet)
