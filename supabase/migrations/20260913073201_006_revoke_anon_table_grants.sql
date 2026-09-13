/*
# Revoke anon table grants on all workspace tables

## Purpose
The security posture report showed that the anon role still has
SELECT/INSERT/UPDATE/DELETE grants on all workspace tables. While RLS
policies only target authenticated (no TO anon policies exist), the
underlying table grants are broader than needed. This migration revokes
all table-level grants from anon to ensure defense in depth: even if a
policy were accidentally added for anon, the table grant would still block
access.

## Tables affected
- projects
- project_members
- assets
- asset_versions
- threads
- replies
- decisions

## Security
After this, anon has zero grants on all workspace tables. Only authenticated
retains grants, and those are narrowed by column-level privileges where
appropriate (set in migration 002).
*/

REVOKE ALL ON projects FROM anon;
REVOKE ALL ON project_members FROM anon;
REVOKE ALL ON assets FROM anon;
REVOKE ALL ON asset_versions FROM anon;
REVOKE ALL ON threads FROM anon;
REVOKE ALL ON replies FROM anon;
REVOKE ALL ON decisions FROM anon;
