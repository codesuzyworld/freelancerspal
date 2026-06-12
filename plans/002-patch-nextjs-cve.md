# Plan 002: Patch the critical Next.js RCE CVE (GHSA-9qr9-h5gf-34mp)

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result. If anything in "STOP conditions" occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 296a6e5..HEAD -- package.json package-lock.json`
> If either file has been modified since `296a6e5`, run `npm audit --omit=dev` against current state. If the `next` advisory has already been resolved (severity downgraded or fixAvailable reports the installed version is safe), STOP — this plan is no longer needed; mark it `REJECTED — fixed elsewhere` in `plans/README.md`.

## Status

- **Priority**: P0
- **Effort**: S
- **Risk**: LOW (within-15.x patch)
- **Depends on**: none (can run in parallel with 001)
- **Category**: security / migration
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

`npm audit --omit=dev` against this repo at SHA `296a6e5` reports a **critical CVE in Next.js**:

- **GHSA-9qr9-h5gf-34mp** — "Next.js is vulnerable to RCE in React flight protocol" — CVSS 10.0 — affected range `>=15.1.0-canary.0 <15.1.9`. The installed version (resolved via the `"latest"` tag in `package.json:34`) is `15.1.6`, which is squarely in the affected range.

Four other advisories in the same audit run are moderate-or-lower and resolved by upgrading to the same fix line. The minimum safe version on the 15.1 line is `15.1.9`; npm reports `fixAvailable: 16.2.9` but a cross-major upgrade is out of scope here — we want the smallest possible change that closes the critical CVE.

`package.json` currently pins `"next": "latest"`. Leaving the pin as `"latest"` after the fix means the next `npm install` could regress; this plan also pins the version explicitly.

## Current state

- `package.json:34` — `"next": "latest"`
- `package-lock.json` resolves `next` to `15.1.6`.
- `npm audit --omit=dev` output (at plan-write time):
  - 1 critical (the RCE)
  - 0 high
  - 2 moderate
  - 2 low
- The repo has only `dev/build/start` npm scripts as of `296a6e5`. If plan 001 has merged first, `lint`/`typecheck` are also available — use them; otherwise rely on `next build`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Audit before | `npm audit --omit=dev` | shows critical Next advisory |
| Install | `npm install` | exit 0 |
| Build | `npm run build` | exit 0 |
| Typecheck (if 001 landed) | `npm run typecheck` | exit 0 or pre-existing errors only |
| Audit after | `npm audit --omit=dev` | no `next` advisories ≥ moderate |

## Scope

**In scope:**
- `package.json` — change the `next` pin.
- `package-lock.json` — regenerated automatically by `npm install`.

**Out of scope** (do NOT touch even though they appear related):
- `@supabase/ssr` and `@supabase/supabase-js` `"latest"` pins. The audit shows a LOW-severity advisory in `@supabase/auth-js@<=2.69.1` that's currently resolved by upgrading supabase-js to 2.108.1 — a major-ish jump on a load-bearing dependency. That is plan 006 territory.
- `eslint-config-next` if it was added by plan 001 — only touch it if step 4 below requires it.
- Any source file under `app/`, `components/`, `hooks/`, `lib/`, `utils/`. Next 15.1.6 → 15.1.9 is a patch within the same minor; no source changes should be required. If they ARE required, that triggers a STOP condition.

## Git workflow

- Branch: `advisor/002-patch-nextjs-cve`
- Single commit. Suggested message: `bump next to 15.1.9 to patch GHSA-9qr9-h5gf-34mp (critical RCE)`
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the vulnerable version is what is installed

```bash
node -e "console.log(require('./package-lock.json').packages['node_modules/next'].version)"
```

Expected: `15.1.6` (or any version in `15.0.0` through `15.1.8` inclusive).

If the printed version is `15.1.9` or higher: STOP — the CVE has already been patched and this plan is not needed.

If the printed version is `>=16.0.0`: STOP — the codebase has moved to a different major Next version since this plan was written; re-evaluate before proceeding.

### Step 2: Update the pin

Edit `package.json:34` (or wherever `"next":` lives in the `dependencies` block). Replace:

```json
"next": "latest",
```

with:

```json
"next": "15.1.9",
```

(Pin the exact patch version. Do not use `^15.1.9` — the explicit pin is intentional given the prior `"latest"` regression risk.)

**Verify**: `node -e "console.log(require('./package.json').dependencies.next)"` → `15.1.9`

### Step 3: Install

```bash
npm install
```

This regenerates `package-lock.json` for the new `next` version. Expected: exit 0. Some `npm warn deprecated` lines are acceptable; an `npm ERR!` is not.

**Verify**: `node -e "console.log(require('./package-lock.json').packages['node_modules/next'].version)"` → `15.1.9`

### Step 4: Confirm `eslint-config-next` peer dep still matches

If plan 001 has landed and `eslint-config-next` is in devDependencies pinned to `15.1.6`, bump it to `15.1.9` to match:

```bash
grep '"eslint-config-next"' package.json
```

If the line shows `"eslint-config-next": "15.1.6"`, edit it to `"eslint-config-next": "15.1.9"` and re-run `npm install`. If `eslint-config-next` is not present, skip this step.

### Step 5: Build to confirm no source changes are required

```bash
npm run build
```

Expected: exit 0. Some lint warnings are acceptable. A real type error or compile error means the patch broke something — STOP and report.

If plan 001 has landed:
```bash
npm run typecheck
```
Expected: same set of pre-existing errors as before the bump (no new ones introduced by Next).

### Step 6: Audit after

```bash
npm audit --omit=dev
```

Expected: the `next` line in the output should no longer list `GHSA-9qr9-h5gf-34mp`. Other advisories (Supabase low, postcss moderate, etc.) may remain — those are plan 006.

To confirm machine-readably:
```bash
npm audit --omit=dev --json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const n=d.vulnerabilities?.next; console.log('next severity:', n?.severity ?? 'none', 'advisories:', n?.via?.length ?? 0);"
```
Expected: `next severity: none` (or `next severity: low` if a lower-severity advisory remains; the explicit critical `9qr9-h5gf-34mp` must be gone).

### Step 7: Smoke-test the dev server briefly

Run `npm run dev` in one terminal and (in another, or via curl) visit `http://localhost:3000/sign-in`. Confirm the page renders (HTTP 200, HTML output present). Stop the dev server.

This is a sanity check that the Next bump didn't break the runtime; a thorough QA pass is out of scope.

### Step 8: Update `plans/README.md` status row

Change the 002 row's Status from `TODO` to `DONE`.

## Test plan

No new tests are written. The plan's verification is the npm audit output. Once test infrastructure exists (a future plan), the regression test for this fix is: keep `npm audit --omit=dev` in CI, fail the build on `critical`.

## Done criteria

ALL must hold:

- [ ] `package.json` pins `"next": "15.1.9"` (exact version, not `^15.1.9` and not `latest`).
- [ ] `package-lock.json` resolves `node_modules/next` to `15.1.9`.
- [ ] `npm run build` exits 0.
- [ ] `npm audit --omit=dev --json` no longer lists `GHSA-9qr9-h5gf-34mp` under `vulnerabilities.next`.
- [ ] No files outside `package.json` / `package-lock.json` are modified — `git status --short` shows only those two (plus `plans/README.md`).
- [ ] `plans/README.md` status row for 002 updated to DONE.

## STOP conditions

- The installed `next` is already `>=15.1.9` (CVE already patched — mark plan REJECTED).
- The installed `next` is `>=16.0.0` (cross-major drift — re-plan).
- `npm install` fails with an unresolvable peer-dep conflict — capture the full error and stop. Do not pass `--legacy-peer-deps` or `--force` to push through.
- `npm run build` introduces NEW errors that did not exist before the bump (existing errors are fine; new ones are not).
- Source files (anything under `app/`, `components/`, etc.) would need to change to make the bump work. The 15.1.6 → 15.1.9 step should be invisible to source.

## Maintenance notes

- The `"next": "latest"` pattern is the root cause that made this CVE hit the running system. Plan 006 generalizes the fix by replacing all `"latest"` pins.
- A real fix for the broader posture is GitHub Dependabot or Renovate watching the lockfile; flag for the maintainer.
- Reviewer should scrutinize: (1) the exact `next` version in `package-lock.json` after install, (2) that no source files were touched, (3) that the build still succeeds without new errors.
- Next.js 16 is available and is the long-term destination; that's a separate planned migration.
