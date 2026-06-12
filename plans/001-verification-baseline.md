# Plan 001: Add `lint`, `typecheck`, and `format` npm scripts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 296a6e5..HEAD -- package.json tsconfig.json`
> If `package.json` has been modified since `296a6e5`, compare the "Current state" excerpts against the live file before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

The repo has **no one-command way to verify code health.** `package.json` currently exposes only `dev`, `build`, and `start`. `next build` catches type errors but is slow and runs the whole compilation; there is no fast `typecheck`, no `lint`, no `format` script. There is no committed ESLint or Prettier config. Every other plan in this directory needs a verification command to assert "I didn't break anything" — and right now none exists. Adding these scripts is the prerequisite that unblocks every later plan.

This plan does NOT add a test framework or write tests — that is intentionally scoped out (it would balloon to multi-day work and require runtime decisions). Tests are a follow-up.

## Current state

- `package.json:3-7` — only three scripts:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  ```
- `prettier: ^3.3.3` is already a devDependency at `package.json:36`. No `.prettierrc` exists.
- No `eslint*` config file exists (verify with `ls -la | grep eslint` from repo root — expect no matches).
- `next` is in dependencies (`package.json:34`). Next.js ships with `eslint-config-next` but it is not currently listed in devDependencies; Next has its own `next lint` command that auto-installs ESLint on first run, but we will be explicit and add it to devDependencies.
- `tsconfig.json` is present and configured for `--noEmit`; `npx tsc --noEmit` is sufficient for typecheck.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `npm install` | exit 0 |
| Typecheck (current) | `npx tsc --noEmit` | exit 0 — but expect existing errors; just confirm tsc runs |
| Lint (current) | `npx next lint` | will fail until configured |
| Build | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you may create or modify):
- `package.json`
- `.eslintrc.json` (create)
- `.prettierrc` (create)
- `.prettierignore` (create)

**Out of scope** (do NOT touch):
- Any file under `app/`, `components/`, `hooks/`, `lib/`, `utils/`. Do NOT run `npm run lint` followed by `--fix` to auto-fix code in this plan — that is plan 006's territory. The goal here is *adding the script*, not fixing what it reports.
- Adding a test framework, Jest/Vitest configs, or test files.
- Adding pre-commit hooks (Husky, lint-staged) — out of scope; can be a follow-up.

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Single commit acceptable; commit message style is freeform in this repo (see `git log --oneline -10`).
- Do NOT push or open a PR.

## Steps

### Step 1: Add `eslint-config-next` to devDependencies

Edit `package.json`. In the `devDependencies` block, add a new entry (preserve alphabetical position if other entries are alphabetical; otherwise append before the closing brace):

```json
"eslint": "^8.57.0",
"eslint-config-next": "15.1.6",
```

The version `15.1.6` matches the currently-resolved `next` version in `package-lock.json` (verified at plan-write time). If `npm install` reports a peer-dependency mismatch when you run it in step 4, adjust `eslint-config-next` to match whatever `next` is currently pinned to in `package-lock.json`.

**Verify**: `grep '"eslint"' package.json && grep '"eslint-config-next"' package.json` → both lines present.

### Step 2: Add the four scripts to `package.json`

Edit the `scripts` block in `package.json` to:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
},
```

**Verify**: `node -e "console.log(Object.keys(require('./package.json').scripts).sort().join(','))"` → `build,dev,format,format:check,lint,start,typecheck`

### Step 3: Create ESLint config

Create `.eslintrc.json` at repo root with this exact content:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "warn"
  }
}
```

Rationale: `next/core-web-vitals` is the standard Next.js preset. The two overrides keep the lint output usable on this codebase: `no-unescaped-entities` would flag every apostrophe in copy ("Freelancer's Pal"); `no-img-element` is downgraded to a warning because the codebase intentionally uses raw `<img>` tags (deferring migration to a separate plan).

**Verify**: `cat .eslintrc.json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"` → no output, exit 0 (valid JSON).

### Step 4: Create Prettier config

Create `.prettierrc` at repo root:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

These values match the dominant style observed in `app/actions.ts`, `app/layout.tsx`, etc. (double quotes, semicolons, 2-space indent). Do NOT change to `singleQuote: true` even though some files mix styles — picking the majority avoids a massive diff if anyone runs `format` later.

Create `.prettierignore` at repo root:

```
node_modules
.next
out
build
public
package-lock.json
*.md
```

`*.md` is in the ignore list because formatting markdown can re-flow the README in ways the author may not want — opt in later if desired.

**Verify**: `ls -la .prettierrc .prettierignore` → both files exist.

### Step 5: Install the new dev dependency

```bash
npm install
```

**Verify**: `ls node_modules/eslint-config-next/package.json` exists and `ls node_modules/eslint/package.json` exists.

### Step 6: Confirm the scripts work end-to-end

Run each script and record the result. The scripts must run *successfully as commands* — they may report errors in the codebase, and that is fine; the gate is "does the tool execute without crashing":

```bash
npm run typecheck
```
Expected: exits with errors OR exits 0. Either is acceptable. (Pre-existing type errors in the codebase do not block this plan — fixing them belongs to other plans.) What is NOT acceptable: a missing-command error, a missing-binary error, or a config-parse error.

```bash
npm run lint
```
Expected: same — runs to completion. The first run of `next lint` may prompt "Which framework?" if it can't detect the config; if prompted interactively, choose "Strict" (the default). If `next lint` runs non-interactively in CI mode and skips the prompt, that is also fine.

```bash
npm run format:check
```
Expected: exits with a list of files that would be reformatted. This is acceptable — we are not running `format` in this plan, only confirming `format:check` works.

If any of the three scripts fails with "command not found", "Cannot find module", or a syntax error in the config — STOP.

### Step 7: Update `plans/README.md` status row

Find the row for plan 001 in `plans/README.md` and change its Status column from `TODO` to `DONE`.

## Test plan

No new tests are written by this plan. The plan adds the *infrastructure* that future plans use to run their tests.

Verification at this layer is:
- `npm run lint` exits without crashing.
- `npm run typecheck` exits without crashing.
- `npm run format:check` exits without crashing.

## Done criteria

ALL must hold:

- [ ] `package.json` contains scripts `lint`, `typecheck`, `format`, `format:check`.
- [ ] `.eslintrc.json` exists and parses as valid JSON.
- [ ] `.prettierrc` exists and parses as valid JSON.
- [ ] `.prettierignore` exists.
- [ ] `npm install` exits 0 after the dependency additions.
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check` each run to completion (codebase errors allowed; tool errors not).
- [ ] No files outside the in-scope list are modified (`git status --short` shows only `package.json`, `package-lock.json`, `.eslintrc.json`, `.prettierrc`, `.prettierignore`).
- [ ] `plans/README.md` status row for 001 updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- The version of `next` in `package-lock.json` is no longer in the 15.1.x line and `eslint-config-next@15.1.6` is incompatible. (Report the actual version and ask which `eslint-config-next` to install.)
- `next lint` requires an interactive choice that cannot be answered non-interactively. (Report the prompt verbatim.)
- The `package.json` `scripts` block at the start of this plan does not match the "Current state" excerpt above — the codebase has drifted.
- Any script reports a real *tool* failure (not a codebase error) — e.g. "ESLint couldn't find a configuration file" after step 3.

## Maintenance notes

- Tests are a deliberate follow-up. When they are added, extend the `test` script and add it to the CI verification gate.
- If the team later decides to enforce these gates, add a pre-commit hook via Husky + lint-staged. This was deliberately scoped out of this plan.
- The `no-img-element` warning will fire on many files. Either migrate to `next/image` in a separate plan or accept the warnings; do not silence the rule globally.
- Reviewer should check: are any `node_modules/.bin/` scripts being shadowed? Does `next lint` print a deprecation warning in this Next version? (Next 15+ has begun migrating lint to a separate package.)
