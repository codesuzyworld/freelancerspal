# Plan 010: Token-gated access for the client portal

> **Executor instructions**: Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report — do not improvise. This plan touches the database schema; the executor produces a SQL migration file but does NOT apply it to the live Supabase project — the maintainer applies it after review.
>
> **Drift check**: `git diff --stat 296a6e5..HEAD -- 'app/clientPortal/**' 'components/ui/ClientPortalToggle.tsx' 'components/clientPortal/**' 'app/(main)/project/[id]/page.tsx'`

## Status

- **Priority**: P2
- **Effort**: M (1 day)
- **Risk**: MED — schema change, security-sensitive logic
- **Depends on**: 001 (verification baseline), 003 (null-deref guards — the page being modified has them)
- **Category**: security
- **Planned at**: commit `296a6e5`, 2026-06-12

## Why this matters

The client portal at `app/clientPortal/[id]/page.tsx` is publicly accessible: anyone with the URL `/clientPortal/<projectID>` can view a project when its `clientPortal` flag is `true`. Access control is binary — the toggle is either on or off, and the project's UUID is the only "secret."

Two problems with that model:

1. **No revocation.** Once a client shares the URL (forwarded email, screenshot, browser-history sync), that person has access forever. The only way to revoke is to delete the project or flip the toggle off — both of which affect *every* viewer of that link, not the one whose access you want to cut.
2. **The URL is the secret.** UUIDs are unguessable from outside, but they leak constantly via logs, referrers, history, share buttons. Once leaked, there's no rekey path.

The fix is the same pattern Google Docs / Calendly / Linear "anyone with the link" sharing uses: the link IS the secret, but the secret is **per-project and rotatable**. Add a `clientPortalToken` column on `projects`. The shareable URL becomes `/clientPortal/<projectID>?token=<random>`. A "Regenerate link" button on the toggle invalidates the old token without affecting any other project.

This is small in scope (one column, one server action, one query param check, one regenerate button) and gives real access control. It is NOT a full auth-per-viewer system — that would be plan 011 if ever needed; this plan is the 80/20 cut.

## Current state

### Files to modify

**`app/clientPortal/[id]/page.tsx`** — the public page. Current access check (lines 48-58):
```tsx
const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .eq("clientPortal", true)  // ← the only gate
  .single();

if (projectError || !projects) {
    return redirect("/sign-in");
}
```

**`components/ui/ClientPortalToggle.tsx`** — controls the boolean. Current toggle handler (lines 35-59):
```tsx
const handleToggle = async () => {
  const projectVisibility = !isPublic
  const { error } = await supabase
    .from('projects')
    .update({ clientPortal: projectVisibility })
    .eq('projectID', projectID)
  // ...toast, setIsPublic...
}
```

**`components/clientPortal/clientPortalBtn.tsx`** — the navigate-to-portal button shown on the project detail page. Current shape (lines 13-25):
```tsx
export default function AddTaskBtn({ projectID }: ClientPortalProps) {
  const router = useRouter();
  return (
    <Button ... onClick={() => router.push(`/clientPortal/${projectID}`)}>
      <Globe className="h-4 w-4" />
      <span className="hidden md:inline">Client Portal</span>
    </Button>
  );
}
```
(Yes, the function name is `AddTaskBtn` — copy-paste artifact; leave the name unless renaming naturally falls out of the edits.)

**`app/(main)/project/[id]/page.tsx`** — passes `projectID` to both `<ClientPortalToggle>` and `<ClientPortalBtn>` (lines 189-190). After this plan, these components also need the token (or the toggle owns the token state).

### What's NOT in scope of this plan

- Token-protecting Storage URLs (`projectPhoto`, `filePath`). Files served via `supabase.storage.from(...).getPublicUrl(...)` are public by URL; truly locking them down means signed URLs, which is a separate larger effort.
- Per-viewer auth (each client logs in). Out of scope; this plan deliberately stops at "anyone with the link" semantics.
- Token expiry. The token rotates on demand; no automatic time-based expiry. Add later if desired.
- Server-side rate limiting on the public route. Worth doing eventually, not now.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | no NEW warnings |
| Build | `npm run build` | exit 0 (or pre-existing env failure only) |

## Scope

**In scope** — create + modify:
- `supabase/migrations/<timestamp>_clientportal_token.sql` (create)
- `app/(main)/project/[id]/actions.ts` (create — server action for toggle/regenerate)
- `app/clientPortal/[id]/page.tsx` (modify — token check)
- `components/ui/ClientPortalToggle.tsx` (modify — use server action; show URL + regenerate)
- `components/clientPortal/clientPortalBtn.tsx` (modify — accept token prop, include in URL)
- `app/(main)/project/[id]/page.tsx` (modify — fetch token, pass to children)

**Out of scope** (do NOT touch):
- Any other page or component.
- Adding a new client-portal-specific route.
- Renaming `AddTaskBtn` inside `clientPortalBtn.tsx` (cosmetic; not this plan's job).
- Storage URLs for files / photos (deferred — separate plan).
- Adding lib-level token utilities beyond what's strictly needed.

## Git workflow

- Branch: `advisor/010-client-portal-token`
- Single commit OR one per concern (migration / server action / page / components). Match the repo's informal style.
- Do NOT push or open a PR.

## Steps

### Step 1: Write the database migration

Create `supabase/migrations/$(date +%Y%m%d%H%M%S)_clientportal_token.sql`. Use whatever timestamp the executor's environment produces; format: `YYYYMMDDHHMMSS_clientportal_token.sql`.

Content:

```sql
-- Add per-project client-portal access token.
-- The shareable URL becomes /clientPortal/<projectID>?token=<clientPortalToken>.
-- Rotating the token on a project invalidates previous URLs for THAT project only.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "clientPortalToken" text;

COMMENT ON COLUMN projects."clientPortalToken" IS
  'Random token (UUID) required as ?token= query param on /clientPortal/<projectID>. NULL when client portal is private.';
```

Note the double-quoted identifier: the existing column convention in this codebase is camelCase (`projectID`, `clientPortal`), and Postgres requires double-quoting to preserve case. Match the convention.

**Verify**: file exists; content matches above.

**IMPORTANT**: This plan does NOT apply the migration to the live Supabase project. The maintainer must run it themselves via either:
- The Supabase Studio SQL editor (paste contents, run).
- `supabase db push` if the Supabase CLI is configured.

The reviewer should confirm the column was added before the rest of the plan's runtime changes are merged to a branch that production traffic hits.

### Step 2: Create the server action

Create `app/(main)/project/[id]/actions.ts`. (If a file at this path already exists from plan 004's spike, append to it instead of overwriting. Match its existing style.)

```ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

type Result =
  | { ok: true; clientPortal: boolean; token: string | null }
  | { ok: false; error: string };

/**
 * Enable / disable / regenerate a project's client-portal access.
 *
 * - When `enabled` is true, a fresh random token is generated and stored,
 *   replacing any previous token. The caller receives the new token to
 *   build the shareable URL.
 * - When `enabled` is false, the token is cleared and the flag set to false.
 *
 * Ownership: the caller must be the project owner OR an admin.
 */
export async function setClientPortalAccess(
  projectID: string,
  enabled: boolean
): Promise<Result> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Ownership/admin check (mirror the pattern in app/(main)/project/[id]/page.tsx).
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("userID")
    .eq("projectID", projectID)
    .single();
  if (projectError || !project) {
    return { ok: false, error: "Project not found" };
  }

  if (project.userID !== user.id) {
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminCheck) {
      return { ok: false, error: "Forbidden" };
    }
  }

  const newToken = enabled ? randomUUID() : null;

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      clientPortal: enabled,
      clientPortalToken: newToken,
    })
    .eq("projectID", projectID);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/project/${projectID}`);
  return { ok: true, clientPortal: enabled, token: newToken };
}
```

Notes:
- `randomUUID()` from Node's `crypto` is available in the Node runtime Next.js uses for server actions. Don't use `crypto.randomBytes` — `randomUUID()` is simpler and produces 128 bits of entropy.
- The `revalidatePath` ensures the parent project page re-renders with the new token after toggle/regenerate.
- Ownership check uses the same `userID = user.id OR adminCheck` pattern as the project page (a defense-in-depth check; RLS should ALSO enforce it on the server, but we don't rely on that).

**Verify**: `npm run typecheck` clean.

### Step 3: Update the public page to check the token

Edit `app/clientPortal/[id]/page.tsx`.

Change the signature to accept `searchParams`:

```tsx
interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function ProjectDetails({ params, searchParams }: ProjectPageProps) {
  const supabase = await createClient();
  const { id } = await params;
  const sp = await searchParams;
  const providedToken = typeof sp.token === "string" ? sp.token : Array.isArray(sp.token) ? sp.token[0] : undefined;

  // ...
```

Then modify the project query (current lines 48-58). Replace:
```tsx
const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .eq("clientPortal", true)
  .single();

if (projectError || !projects) {
    return redirect("/sign-in");
}
```
with:
```tsx
const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select()
  .eq("projectID", id)
  .eq("clientPortal", true)
  .single();

if (projectError || !projects) {
  return redirect("/sign-in");
}

// Constant-time-ish comparison: require an exact match. If no token is set
// on the project OR no token is provided OR they don't match — reject.
if (!projects.clientPortalToken || !providedToken || projects.clientPortalToken !== providedToken) {
  return redirect("/sign-in");
}
```

Comment on the redirect target: `/sign-in` is what the current code redirects to. Keep it. Discussion: redirecting an anonymous client portal viewer to the freelancer's sign-in page is mildly odd UX — a dedicated "this link is invalid or expired" page would be better. That is a follow-up; do not invent one here.

**Verify**: `npm run typecheck` clean.

### Step 4: Update the toggle component to use the server action

Edit `components/ui/ClientPortalToggle.tsx`. Replace the entire file with:

```tsx
"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { setClientPortalAccess } from "@/app/(main)/project/[id]/actions";

interface ClientPortalToggleProps {
  projectID: string;
  initialState?: boolean;
  initialToken?: string | null;
}

export function ClientPortalToggle({
  projectID,
  initialState = false,
  initialToken = null,
}: ClientPortalToggleProps) {
  const [isPublic, setIsPublic] = React.useState(initialState);
  const [token, setToken] = React.useState<string | null>(initialToken);
  const [isPending, startTransition] = React.useTransition();
  const supabase = createClient();

  // Keep an initial fetch in case the parent didn't pass props (back-compat).
  React.useEffect(() => {
    if (initialToken !== null || initialState) return;
    let cancelled = false;
    async function fetchInitialState() {
      const { data, error } = await supabase
        .from("projects")
        .select("clientPortal, clientPortalToken")
        .eq("projectID", projectID)
        .single();
      if (cancelled) return;
      if (!error && data) {
        setIsPublic(!!data.clientPortal);
        setToken(data.clientPortalToken ?? null);
      }
    }
    fetchInitialState();
    return () => { cancelled = true; };
  }, [projectID]);

  const callAction = (enabled: boolean) => {
    startTransition(async () => {
      const result = await setClientPortalAccess(projectID, enabled);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setIsPublic(result.clientPortal);
      setToken(result.token);
      toast({
        title: "Success",
        description: result.clientPortal
          ? "Client portal enabled with a fresh link"
          : "Client portal disabled",
      });
    });
  };

  const handleToggle = () => callAction(!isPublic);
  const handleRegenerate = () => callAction(true);

  const shareUrl =
    typeof window !== "undefined" && isPublic && token
      ? `${window.location.origin}/clientPortal/${projectID}?token=${token}`
      : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Copied", description: "Client portal link copied to clipboard" });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch checked={isPublic} onCheckedChange={handleToggle} disabled={isPending} />
        <span className="text-sm text-muted-foreground">
          {isPublic ? "Public" : "Private"}
        </span>
      </div>

      {isPublic && token && (
        <div className="flex flex-col gap-1 max-w-full">
          <div className="text-xs text-muted-foreground">Shareable link</div>
          <div className="flex items-center gap-2 max-w-full">
            <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1" title={shareUrl ?? ""}>
              {shareUrl ?? "Loading..."}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              disabled={!shareUrl || isPending}
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRegenerate}
              disabled={isPending}
              title="Regenerate link (invalidates the current URL)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Notes:
- Uses the server action; no direct anon-key writes from the client.
- Shows the shareable URL and a copy button when public.
- A regenerate button (the `RefreshCw` icon) rotates the token without changing the toggle state.
- `useEffect` initial fetch is preserved as a fallback (some call sites may not pass `initialToken`); but the parent passing it avoids the round-trip.

**Verify**: `npm run typecheck` clean.

### Step 5: Update the navigate-to-portal button

Edit `components/clientPortal/clientPortalBtn.tsx`. Add a `token` prop and include it in the URL:

```tsx
'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientPortalProps {
  projectID: string;
  token: string | null;
}

export default function ClientPortalBtn({ projectID, token }: ClientPortalProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!token) {
      toast({
        title: "Client portal is private",
        description: "Enable the client portal to get a shareable link.",
        variant: "destructive",
      });
      return;
    }
    router.push(`/clientPortal/${projectID}?token=${token}`);
  };

  return (
    <Button
      className="bg-secondary text-white hover:bg-accent/50"
      onClick={handleClick}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden md:inline">Client Portal</span>
    </Button>
  );
}
```

(Renaming the export from `AddTaskBtn` to `ClientPortalBtn` is the right thing to do here because the call site already imports it as `ClientPortalBtn` — change the function declaration to match. This is the one cosmetic rename allowed by this plan.)

### Step 6: Pass the token from the project page

Edit `app/(main)/project/[id]/page.tsx`. The project page already fetches the full project row at line 66-70. After plan 003 it also has a null guard. The row will now include `clientPortalToken` (because `.select()` with no args returns all columns).

Find the call site of `<ClientPortalBtn>` and `<ClientPortalToggle>` (around lines 189-190). Change:

```tsx
<ClientPortalBtn projectID={projects.projectID}/>
<ClientPortalToggle projectID={projects.projectID}/>
```

to:

```tsx
<ClientPortalBtn projectID={projects.projectID} token={projects.clientPortalToken ?? null}/>
<ClientPortalToggle
  projectID={projects.projectID}
  initialState={!!projects.clientPortal}
  initialToken={projects.clientPortalToken ?? null}
/>
```

Note: `initialState` was already supported by the toggle (defaults to false); passing the value from the server saves the round-trip. `initialToken` is new.

**Verify**: `npm run typecheck` clean.

### Step 7: Smoke test (requires env vars)

If the executor has `.env.local` and the migration has been applied to the linked Supabase project:

1. `npm run dev`.
2. Log in. Open a project's detail page. Toggle client portal ON.
3. Confirm the shareable URL appears, including a token. Copy it.
4. Open the URL in an incognito window. Confirm the project renders.
5. In the toggle UI, click "Regenerate". Confirm the URL changes (new token).
6. Reload the OLD URL in incognito. Confirm it redirects to `/sign-in`.
7. Toggle OFF. Confirm the URL no longer works even with the previously-valid token.
8. Confirm the "Client Portal" button on the project detail page navigates to the working URL (with current token).

If no env vars are available: skip the smoke test; rely on typecheck. Report this in NOTES.

### Step 8: Update `plans/README.md`

(SKIP if running as a dispatched executor — reviewer maintains the index.)

If running standalone, mark row 010 DONE.

## Test plan

No automated tests in this plan. Smoke test in step 7 is the gate when an env exists.

Future tests should:
- For `setClientPortalAccess`: assert ownership rejection (wrong user), assert token is generated and persisted on enable, assert token is null on disable, assert regenerate produces a different token from the previous one.
- For the `clientPortal/[id]` page: assert redirect when `?token=` missing, when token mismatches, when project's `clientPortalToken` is null. Assert render when token matches.

## Done criteria

ALL must hold:

- [ ] `supabase/migrations/<timestamp>_clientportal_token.sql` exists with the `ALTER TABLE` SQL.
- [ ] `app/(main)/project/[id]/actions.ts` exists and exports `setClientPortalAccess` with ownership check.
- [ ] `app/clientPortal/[id]/page.tsx` rejects requests with missing or mismatched `?token=`.
- [ ] `components/ui/ClientPortalToggle.tsx` uses the server action and shows the shareable URL + regenerate button when public.
- [ ] `components/clientPortal/clientPortalBtn.tsx` accepts and uses a `token` prop.
- [ ] `app/(main)/project/[id]/page.tsx` passes `clientPortalToken` from the fetched project row to both children.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0 with no NEW warnings.
- [ ] `npm run build` exits 0 OR fails only with the pre-existing env error.
- [ ] No files outside the in-scope list are modified.

## STOP conditions

- The SQL `ALTER TABLE` would fail because the `projects` table or `clientPortal` column has been renamed since `296a6e5`. (Diff check; if so, re-plan.)
- Step 3's `searchParams` shape doesn't match what Next.js 15 expects in this codebase's version. (Other pages in the repo use `searchParams: Promise<...>` — e.g. `app/(main)/project/page.tsx`; copy that pattern.)
- The server action's `revalidatePath` errors because the path is wrong — verify with `grep -rn "revalidatePath" app/` for an existing example, or remove the call (the toggle's `startTransition` will handle the visual update either way; `revalidatePath` is a nicety, not a hard requirement).
- The smoke test reveals that the migration was not applied (the new column doesn't exist) — STOP, ask the maintainer to apply the migration before continuing the runtime changes.
- Browser console shows "navigator.clipboard is undefined" — this happens on non-HTTPS contexts other than `localhost`. Acceptable on `localhost`; document as a known issue if it surfaces.

## Maintenance notes

- This plan deliberately uses "anyone with the link" semantics, not per-viewer auth. If the team later wants individual client logins, that is a separate plan that will likely use the token as a one-time onboarding signal.
- File storage (`projectFiles` bucket) is NOT token-protected. A client portal viewer with the right token can see the project page, and any `file.filePath` or `project.projectPhoto` URL is a Supabase public URL that anyone can fetch directly. If file privacy matters, follow up with signed-URL plumbing.
- The token is stored in plaintext in the DB. That is fine — it's a bearer URL, not a credential the user types. If RLS policies are tightened later (plan 004), make sure the `clientPortalToken` column is NOT exposed via SELECT to anon (otherwise an anonymous viewer with one valid token could enumerate tokens). The select in step 3 reads the column server-side via the cookie-bound session; on a public-portal request (no cookie), that select still works because... wait, this is a design question. (See open question below.)
- **Open question for the maintainer (RLS overlap)**: the public client portal page reads from `projects` using the anon Supabase client with no cookies. For that read to succeed, RLS must allow anon `SELECT` on `projects` rows where `clientPortal=true`. That existing policy is what the current code relies on. The new code additionally reads `clientPortalToken`. Either: (a) the anon SELECT policy returns the token to the page, where it's compared in JS — the token is therefore visible to anyone who can read the row, which is fine because they're providing it; or (b) move the check into a Postgres function / RLS predicate that compares the provided token to the stored token before returning the row. (a) is simpler; (b) is stronger. Pick (a) for now; document this tradeoff in `docs/SECURITY.md` (plan 004's artifact).
- Reviewer should scrutinize: (1) the server action's ownership check, (2) the page's token check happens BEFORE rendering anything, (3) no path bypasses the check (e.g. a future addition that exposes the project via another route), (4) the migration uses the exact column name expected by the JS code (`clientPortalToken`, camelCase, double-quoted in SQL).
