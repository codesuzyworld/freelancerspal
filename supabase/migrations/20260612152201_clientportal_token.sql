-- Add per-project client-portal access token.
-- The shareable URL becomes /clientPortal/<projectID>?token=<clientPortalToken>.
-- Rotating the token on a project invalidates previous URLs for THAT project only.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "clientPortalToken" text;

COMMENT ON COLUMN projects."clientPortalToken" IS
  'Random token (UUID) required as ?token= query param on /clientPortal/<projectID>. NULL when client portal is private.';
