# Plan 006: Quick-win cleanups (deps, configs, dead code, README)

> **Executor instructions**: Follow this plan step by step. Each step is independent — if a step fails, you may skip it and continue, but mark it BLOCKED in the per-step checklist below. Run every verification command. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- package.json tsconfig.json README.md app/test-auth/ components/tutorial/ components/sidebar/app-sidebar.tsx utils/supabase/check-env-vars.ts`
> If any of these have moved or changed materially, re-read before applying.

## Status

- **Priority**: P3
- **Effort**: S (each step is minutes; total a few hours)
- **Risk**: LOW
- **Depends on**: 001 (verification baseline) — strongly recommended so each step can be verified
- **Category**: tech-debt / dx
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

Eight small findings, each individually too small to justify a plan, but together a meaningful tidy-up. Lumping them lets one focused branch knock them all out, and each step is independently verifiable so a partial landing is fine.

The findings bundled here, from the audit:

- **#11** — missing `.env.example`
- **#12** — unused `@fortawesome/*` packages
- **#14** — `tsconfig target: "es5"` is outdated
- **#15** — React 18 with `@types/react: 19` drift
- **#16** — `next`, `@supabase/ssr`, `@supabase/supabase-js` pinned to `"latest"`
- **#18** — tutorial / stub files still on the critical render path
- **#19** — `README.md` says `npm run i`
- **#20** — `AppSidebar` has dead `recentProjects` state and a commented-out `<NavProjects>`

Each step is independent. The order is chosen so easier wins come first; pause if a step turns out non-trivial and convert it to its own plan.

## Current state

Relevant file references at `296a6e5`:

- `.env.example` — does **not** exist (verify: `ls .env*` from repo root).
- `package.json:9-11` — three FontAwesome packages; grep confirms zero usages in app code.
- `tsconfig.json:3` — `"target": "es5"` with `"lib": ["dom", "dom.iterable", "esnext"]`.
- `package.json:37-50` — `react: ^18.2.0`, `react-dom: ^18.2.0`, `@types/react: ^19.0.2`, `@types/react-dom: 19.0.2`.
- `package.json:26, 27, 34` — `"@supabase/ssr": "latest"`, `"@supabase/supabase-js": "latest"`, `"next": "latest"`.
- `components/tutorial/` — 5 files (`fetch-data-steps.tsx`, `tutorial-step.tsx`, `sign-up-user-steps.tsx`, `connect-supabase-steps.tsx`, `code-block.tsx`).
- `app/protected/page.tsx` — Supabase template scaffold; not load-bearing.
- `app/test-auth/page.tsx` — debug page (also covered by finding #8 / SEC-07, partially overlaps here).
- `app/page.tsx:5` — imports `hasEnvVars` from `@/utils/supabase/check-env-vars` (but doesn't use it because the body is unconditional `redirect('/project')`).
- `app/(main)/layout.tsx:7, 28` — uses `EnvVarWarning` based on `hasEnvVars`.
- `utils/supabase/check-env-vars.ts:1-2` — `// This check can be removed / it is just for tutorial purposes`.
- `README.md:44` — `npm run i` (invalid).
- `README.md:39` — "contact CodeSuzy".
- `components/sidebar/app-sidebar.tsx:15, 30, 70-71, 97` — `NavProjects` imported but commented out; `recentProjects` useState and the unused `supabase` client.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Audit before/after dep changes | `npm audit --omit=dev` | resolves cleanly |
| Install | `npm install` | exit 0 |
| Typecheck | `npm run typecheck` | no new errors |
| Lint | `npm run lint` | no new warnings |
| Build | `npm run build` | exit 0 |
| Smoke test | `npm run dev` | loads `/sign-in` and `/project` |

## Scope

**In scope** (file by step — out of scope of any one step is in scope of the plan as a whole):

| Step | Files touched |
|---|---|
| A. Create `.env.example` | `.env.example` (create), optionally `README.md` |
| B. Remove FontAwesome deps | `package.json`, `package-lock.json` |
| C. Update `tsconfig` target | `tsconfig.json` |
| D. Align React type/runtime | `package.json`, `package-lock.json` |
| E. Pin "latest" tags | `package.json`, `package-lock.json` |
| F. Remove tutorial / stub files | `components/tutorial/` (delete), `app/protected/` (delete or gate), `utils/supabase/check-env-vars.ts` (delete), `app/(main)/layout.tsx` (remove EnvVarWarning), `components/env-var-warning.tsx` (delete), `app/page.tsx` (remove unused import), `app/test-auth/` (delete) |
| G. README typo + setup | `README.md` |
| H. Clean dead state in `AppSidebar` | `components/sidebar/app-sidebar.tsx` |

**Out of scope** (do NOT touch in this plan):
- Lucide-react or unplugin-icons — they are actively used.
- Any other source file under `app/` beyond `app/(main)/layout.tsx`, `app/page.tsx`, `app/protected/`, `app/test-auth/`.
- Migration of the auth-js CVE (handled in plan 002 / can be a follow-up).

## Git workflow

- Branch: `advisor/006-quick-win-cleanups`
- One commit per step is recommended (8 commits) — each is independently revertable. Bundling all 8 into one commit is also acceptable if every step verified clean.
- Suggested commit message style: `cleanup: <one-line description>` to match the informal repo style.
- Do NOT push or open a PR.

## Steps

Each step has its own `**Verify**` and produces an independent checklist row. Mark each as DONE in your local notes before moving to the next.

### Step A: Create `.env.example`

Create `.env.example` at repo root with this exact content:

```
# Required by the Supabase clients in utils/supabase/*.ts.
# Both are public-by-design (they ship in the browser bundle); do not put
# the service-role key here.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Also confirm `.env*.local` and `.env` are in `.gitignore` (they already are at lines 34-35 of `.gitignore` per recon).

**Verify**: `ls .env.example` shows the file. `cat .env.example` shows the two variables. `grep -n "^.env" .gitignore` confirms `.env*.local` and `.env` are gitignored.

### Step B: Remove unused FontAwesome packages

Confirm zero imports first:
```bash
grep -rn "@fortawesome" --include="*.ts" --include="*.tsx" app/ components/ hooks/ lib/ utils/
```
Expected: no matches. If matches exist, STOP this step — investigate before removing.

If clean, remove the three packages:
```bash
npm uninstall @fortawesome/fontawesome-svg-core @fortawesome/free-brands-svg-icons @fortawesome/react-fontawesome
```

**Verify**:
- `grep '"@fortawesome' package.json` → no matches.
- `npm run build` exits 0.

### Step C: Update `tsconfig.json` target

Edit `tsconfig.json:3`. Change:
```json
"target": "es5",
```
to:
```json
"target": "es2020",
```

(Not `esnext` — pin to a known target so generated output is deterministic across TS versions. `es2020` covers all modern browsers and is the Next.js recommended floor.)

**Verify**: `npm run typecheck` exits with the same baseline as before. `npm run build` exits 0.

### Step D: Align React types with React runtime

Two options. Choose ONE:

**Option D1 (recommended, safer): pin `@types/react` to 18.x.**

Edit `package.json`:
```json
"@types/react": "^18.3.0",
"@types/react-dom": "^18.3.0",
```

Then `npm install`. This matches the actual React 18.2 runtime.

**Option D2 (only if intentionally moving to React 19): bump `react` and `react-dom`.**

Edit `package.json`:
```json
"react": "^19.0.0",
"react-dom": "^19.0.0",
```

Then `npm install`. **Run a full smoke test of every page** — React 19 has subtle behavioral changes (use() unwrapping, ref-as-prop, etc.).

**Default: D1.** Only choose D2 if the maintainer has explicitly stated they want React 19.

**Verify**:
```bash
node -e "const p = require('./package.json'); console.log('react:', p.dependencies.react, '@types/react:', p.devDependencies['@types/react']);"
```
Both majors should match.
`npm run typecheck` clean. `npm run build` exits 0. `npm run dev` and load a few pages.

### Step E: Replace `"latest"` pins with explicit versions

Read current resolved versions from `package-lock.json`:
```bash
node -e "const l = require('./package-lock.json').packages; console.log('next:', l['node_modules/next'].version); console.log('@supabase/ssr:', l['node_modules/@supabase/ssr'].version); console.log('@supabase/supabase-js:', l['node_modules/@supabase/supabase-js'].version);"
```

Suppose this prints `next: 15.1.9`, `@supabase/ssr: 0.5.2`, `@supabase/supabase-js: 2.48.1` (your actual values may differ; plan 002 may have changed `next`).

Edit `package.json`:
- Replace `"next": "latest"` with the printed version, exact pin: e.g. `"next": "15.1.9"`. (If plan 002 already did this, skip.)
- Replace `"@supabase/ssr": "latest"` with `"@supabase/ssr": "^0.5.2"` (caret OK on Supabase libs — they follow semver, and the audit's low-severity advisory was fixed in a later version which a `^` floor allows).
- Replace `"@supabase/supabase-js": "latest"` with `"@supabase/supabase-js": "^2.48.1"`.

Then:
```bash
npm install
```
to refresh the lockfile.

**Verify**:
```bash
grep -E '"(next|@supabase/(ssr|supabase-js))"' package.json
```
No `"latest"` should remain in the output.
`npm run build` exits 0.

### Step F: Delete tutorial / stub files

This step has the biggest blast radius — go slowly and verify after each substep.

**F.1** Remove the `EnvVarWarning` usage from `app/(main)/layout.tsx`:
- Open `app/(main)/layout.tsx`.
- Remove the import `import { EnvVarWarning } from "@/components/env-var-warning";` (line 5).
- Remove the import `import { hasEnvVars } from "@/utils/supabase/check-env-vars";` (line 7).
- Find the ternary `{!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}` (line 28) and replace with just `<HeaderAuth />`.

**F.2** Remove the unused import from `app/page.tsx`:
- Open `app/page.tsx`.
- The file currently does `redirect('/project')` and has all original JSX commented out. Delete the imports of `Hero`, `ConnectSupabaseSteps`, `SignUpUserSteps`, `hasEnvVars` (lines 1-4). Keep the `redirect` import. The file should be ~5 lines after editing.

**F.3** Delete files now safely unused:
```bash
rm -r components/tutorial
rm components/env-var-warning.tsx
rm utils/supabase/check-env-vars.ts
rm -r app/protected     # this deletes the demo /protected route AND /protected/reset-password
rm -r app/test-auth
```

**Important caveat on `app/protected`**: it contains `app/protected/reset-password/page.tsx`, which is the **real** password-reset page linked from `app/actions.ts:69-70` (`resetPasswordAction` redirects to `/protected/reset-password`). DO NOT delete that.

Adjusted command:
```bash
rm app/protected/page.tsx   # delete only the demo top-level page; keep the reset-password subroute
```

If `app/protected/page.tsx` is the only file in the protected directory besides `reset-password/`, it stays under `app/protected/reset-password/`.

**F.4** Sweep for orphan references:
```bash
grep -rn "EnvVarWarning\|hasEnvVars\|env-var-warning\|check-env-vars\|tutorial\|test-auth\|FetchDataSteps\|ConnectSupabaseSteps\|SignUpUserSteps" app/ components/ hooks/ lib/ utils/
```
Expected: zero matches in `app/`, `components/`, `hooks/`, `lib/`, `utils/`. Each match in `node_modules/` is acceptable (ignore).

**Verify**: `npm run build` exits 0. `npm run dev`, visit `/`, `/sign-in`, `/forgot-password`, then go through the password-reset email flow to confirm `/protected/reset-password` still renders.

### Step G: Fix the README setup

Edit `README.md`:
- Line 44: change `npm run i` to `npm install`. The block should read:
  ```bash
  npm install
  npm run dev
  ```
- Line 39: change "Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be obtained by contacting CodeSuzy" to:
  ```
  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be obtained from your Supabase project dashboard at https://supabase.com/dashboard → Project Settings → API. See `.env.example` for the format.
  ```
- Line 32: confirm it now references the `.env.example` file created in step A. If line 32 says "Rename `.env.example` to `.env.local`", that's now accurate; if it phrased it differently, update to say "Copy `.env.example` to `.env.local`" (copy, not rename — keeps the example in version control).

**Verify**: `grep -n "npm run i\|contacting CodeSuzy" README.md` returns zero. `grep -n ".env.example" README.md` returns at least one match.

### Step H: Remove dead state in `AppSidebar`

Edit `components/sidebar/app-sidebar.tsx`:
- Line 15: `import { NavProjects } from "@/components/sidebar/nav-projects"` — DELETE (the component is commented out at line 97 and is not used anywhere else; verify with `grep -rn "NavProjects" --include="*.tsx" --include="*.ts" .` — should only show `components/sidebar/nav-projects.tsx` definition and `app-sidebar.tsx` itself).
- Line 30: `import { createClient } from "@/utils/supabase/client"` — DELETE (used only by the dead `supabase` variable).
- Line 64-66: the `projects: []` block in the `data` object — DELETE.
- Line 70: `const [recentProjects, setRecentProjects] = useState([]);` — DELETE.
- Line 71: `const supabase = createClient();` — DELETE.
- Line 97: the commented-out `{/* <NavProjects projects={data.projects} /> */}` — DELETE the entire commented line.

(Note: if the maintainer wants to actually build the Recent Projects feature, plan 009 covers that path. This step assumes the decision is "remove the dead code now, build later if needed.")

**Verify**:
- `grep -n "NavProjects\|recentProjects\|createClient" components/sidebar/app-sidebar.tsx` — zero matches.
- `npm run build` exits 0.
- `npm run dev` — sidebar still renders the navMain and navSecondary sections; no console errors.

### Step I: Final pass

```bash
npm run typecheck
npm run lint
npm run build
```

All three should exit cleanly (or with no NEW errors / warnings compared to the post-001 baseline).

### Step J: Update `plans/README.md`

Change the 006 row's Status from `TODO` to `DONE`. In the body, list which sub-steps (A-H) actually landed; mark any that were skipped as BLOCKED with a one-line reason.

## Test plan

This plan does not add automated tests. Verification is the build + smoke test:

- `/` redirects to `/project` (logged out → bounces to `/sign-in`, logged in → renders the project list).
- `/sign-in` renders.
- `/forgot-password` → password-reset email → `/protected/reset-password` renders.
- A project detail page renders.
- Sidebar renders without the Recent Projects section.

## Done criteria

ALL must hold (each step is independent; partial completion is acceptable but each completed step must individually verify clean):

- [ ] `.env.example` exists with both required vars.
- [ ] `package.json` has no `"@fortawesome/..."` entries.
- [ ] `tsconfig.json` target is `es2020` (or `esnext` if explicitly chosen).
- [ ] React types match React runtime (both 18.x OR both 19.x).
- [ ] `package.json` has no `"latest"` pins for `next`, `@supabase/ssr`, `@supabase/supabase-js`.
- [ ] `components/tutorial/`, `components/env-var-warning.tsx`, `utils/supabase/check-env-vars.ts`, `app/test-auth/` no longer exist.
- [ ] `app/protected/reset-password/` is preserved.
- [ ] README has no `npm run i` and references `.env.example`.
- [ ] `AppSidebar` has no dead `recentProjects` state or commented-out `<NavProjects>`.
- [ ] `npm run build` exits 0 after every step.
- [ ] Manual smoke test of the listed routes passes.
- [ ] `plans/README.md` status row for 006 updated to DONE.

## STOP conditions

- Any step's verification fails twice after a reasonable fix attempt — record which step, skip it, mark BLOCKED in the plan README, and continue with the next step.
- Step F deletes a file that turns out to still be referenced (grep in step F.4 finds matches you missed) — restore the file and report.
- Step D-Option-D2 (React 19 bump) causes any page in the smoke test to break — revert that step, document, and stick with Option D1 (or commission a separate plan for the React 19 migration).
- `npm install` fails with peer-dep conflicts during step D or E that require `--legacy-peer-deps` to resolve — STOP; don't force.

## Maintenance notes

- These eight cleanups together remove a meaningful amount of "Supabase tutorial inheritance" from the codebase. Reviewer should scrutinize the diff for any cross-cutting reference missed by the grep in F.4.
- The Recent Projects sidebar feature (plan 009) is the natural follow-up if the team wants the feature; if not, step H makes it cleanly deletable.
- The `"latest"` pin pattern is the root cause of plan 002. Step E generalizes the fix; consider adding Dependabot/Renovate so it doesn't drift back.
- Once `.env.example` exists, future contributors stop needing to "contact CodeSuzy."
