# FrameProof Backend Documentation

## Overview

FrameProof uses Supabase for data persistence, authentication, and file storage. The backend consists of seven workspace tables, a private storage bucket, and one server-side RPC function. All access control is enforced at the database level through Row Level Security (RLS) policies and SECURITY DEFINER helper functions.

## Tables

### projects

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| owner_id | uuid | NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE |
| name | text | NOT NULL, CHECK length 1..200 |
| description | text | CHECK length <= 2000 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- The user who creates a project is its owner. `owner_id` defaults to `auth.uid()`.
- The owner is implicitly an admin and does not need a `project_members` row.

### project_members

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| project_id | uuid | NOT NULL, FK to projects ON DELETE CASCADE |
| user_id | uuid | NOT NULL, FK to auth.users ON DELETE CASCADE |
| role | text | NOT NULL, CHECK in ('admin', 'designer', 'reviewer') |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- UNIQUE (project_id, user_id): one role per user per project.
- Role changes go through a SECURITY DEFINER function (future step), not direct UPDATE.
- The owner cannot be removed from a project.

### assets

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| project_id | uuid | NOT NULL, FK to projects ON DELETE CASCADE |
| name | text | NOT NULL, CHECK length 1..200 |
| subtitle | text | CHECK length <= 500 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

### asset_versions

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| asset_id | uuid | NOT NULL, FK to assets ON DELETE CASCADE |
| version_number | integer | NOT NULL, CHECK >= 1 |
| storage_path | text | NOT NULL, CHECK length 1..500 |
| width | integer | NOT NULL, CHECK >= 1 |
| height | integer | NOT NULL, CHECK >= 1 |
| original_name | text | NOT NULL, CHECK length 1..255 |
| created_by | uuid | NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE SET NULL |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- UNIQUE (asset_id, version_number): no duplicate version numbers per asset.
- Versions are append-only. No UPDATE policy exists. Earlier images are never overwritten.
- Direct INSERT is not allowed through RLS; use the `allocate_version` RPC.
- A new version has no prior decision. Decisions are scoped to one exact version.

### threads

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| version_id | uuid | NOT NULL, FK to asset_versions ON DELETE CASCADE |
| x | double precision | NOT NULL, CHECK 0..1 |
| y | double precision | NOT NULL, CHECK 0..1 |
| body | text | NOT NULL, CHECK length 1..2000 |
| author_id | uuid | NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE SET NULL |
| author_name | text | NOT NULL, CHECK length 1..100 |
| resolved | boolean | NOT NULL, DEFAULT false |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- x and y are normalized coordinates (0..1) so pins stay accurate at any display size.
- `author_id` defaults to `auth.uid()` and is not client-settable (column INSERT revoked).
- Only the author can update a thread (to resolve/reopen). Only `resolved` is updatable.

### replies

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| thread_id | uuid | NOT NULL, FK to threads ON DELETE CASCADE |
| body | text | NOT NULL, CHECK length 1..2000 |
| author_id | uuid | NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE SET NULL |
| author_name | text | NOT NULL, CHECK length 1..100 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- Replies are immutable after posting. No UPDATE policy.
- `author_id` defaults to `auth.uid()` and is not client-settable.

### decisions

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| version_id | uuid | NOT NULL, FK to asset_versions ON DELETE CASCADE |
| status | text | NOT NULL, CHECK in ('pending', 'approved', 'changes_requested') |
| note | text | CHECK length <= 2000 |
| author_id | uuid | NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE SET NULL |
| author_name | text | NOT NULL, CHECK length 1..100 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

- Decisions are immutable insert-only. No UPDATE or DELETE policy.
- Each decision belongs to one exact version. A new version starts with no decision.
- `author_id` defaults to `auth.uid()` and is not client-settable.

## RPC Signatures

### allocate_version(p_asset_id uuid, p_storage_path text, p_width integer, p_height integer, p_original_name text) RETURNS uuid

Atomically allocates the next version number and inserts an `asset_versions` row.

**Caller requirements:**
- Must be authenticated.
- Must be a designer or admin on the project that owns the asset.

**Input validation:**
- width >= 1, height >= 1
- storage_path: 1..500 chars
- original_name: 1..255 chars

**Returns:** The new `asset_versions.id` on success.

**Errors:**
- "Asset not found" if the asset does not exist.
- "Not authorized: only designers and admins can upload versions" if the caller lacks the role.
- Validation errors for invalid inputs.

**Frontend usage:**
```typescript
const { data, error } = await supabase.rpc("allocate_version", {
  p_asset_id: assetId,
  p_storage_path: `${projectId}/${assetId}/${filename}`,
  p_width: imageWidth,
  p_height: imageHeight,
  p_original_name: file.name,
});
```

## Security Helper Functions

All helpers are SECURITY DEFINER with `SET search_path = public`. EXECUTE revoked from anon.

| Function | Returns | Description |
|---|---|---|
| `get_user_role(project_id)` | text or NULL | Returns 'admin' if caller is project owner, otherwise the role from project_members, or NULL |
| `is_project_member(project_id)` | boolean | True if caller has any role on the project |
| `is_project_admin(project_id)` | boolean | True if caller is owner or admin |
| `is_project_designer_or_admin(project_id)` | boolean | True if caller is owner, admin, or designer |

These functions avoid RLS recursion by reading `project_members` directly (bypassing RLS via SECURITY DEFINER) rather than using subqueries in policies that would recurse.

## Storage

### Bucket: frameproof-assets

- **Public:** No (private bucket)
- **Allowed MIME types:** image/png, image/jpeg, image/webp
- **Max file size:** 10 MB (10,485,760 bytes)

### Path Contract

All uploaded files must use the path format:
```
{project_id}/{asset_id}/{random_filename}
```

- Segment 1 (project_id): validated against project membership.
- Segment 2 (asset_id): validated to belong to that project.
- Segment 3 (random_filename): client-generated unique filename.

### Storage Policies

| Operation | Who | Conditions |
|---|---|---|
| SELECT | Project members | bucket = frameproof-assets AND is_project_member(path[0]) |
| INSERT | Designers and admins | bucket = frameproof-assets AND is_project_designer_or_admin(path[0]) AND asset belongs to project AND MIME type is png/jpeg/webp |
| DELETE | Admins only | bucket = frameproof-assets AND is_project_admin(path[0]) |
| UPDATE | Not allowed | Versions are append-only |

Files are accessed via signed URLs, never public URLs.

## Role Checks and Frontend Mapping

### Role Hierarchy

| Role | Can view | Can comment | Can upload versions | Can manage members | Can delete |
|---|---|---|---|---|---|
| Owner (implicit admin) | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Designer | Yes | Yes | Yes | No | No |
| Reviewer | Yes | Yes | No | No | No |

### Frontend to RLS Mapping

| Frontend action | Table/Function | RLS check |
|---|---|---|
| Create project | projects INSERT | WITH CHECK owner_id = auth.uid() |
| View project list | projects SELECT | USING is_project_member(id) |
| Add member | project_members INSERT | WITH CHECK is_project_admin(project_id) |
| Remove member | project_members DELETE | USING is_project_admin AND user_id != owner |
| Create asset | assets INSERT | WITH CHECK is_project_designer_or_admin(project_id) |
| Upload version | allocate_version RPC | SECURITY DEFINER checks is_project_designer_or_admin |
| View versions | asset_versions SELECT | USING is_project_member via asset -> project |
| Add comment | threads INSERT | WITH CHECK is_project_member via version -> asset -> project |
| Resolve/reopen comment | threads UPDATE | USING author_id = auth.uid(), GRANT UPDATE (resolved) only |
| Reply to comment | replies INSERT | WITH CHECK is_project_member via thread -> version -> asset -> project |
| Submit decision | decisions INSERT | WITH CHECK is_project_member via version -> asset -> project |
| Upload file to storage | storage.objects INSERT | WITH CHECK is_project_designer_or_admin AND asset belongs to project AND valid MIME |
| Read file from storage | storage.objects SELECT | USING is_project_member |

### Author Identity

`author_name` is a display name snapshot stored at insert time. It is derived from the authenticated user's metadata, not from a client-supplied `author_id`. The `author_id` column defaults to `auth.uid()` and is not client-settable (column INSERT privilege revoked). The frontend should populate `author_name` from the session user's display name (bounded to 100 characters).

## Authentication

Supabase email/password authentication is configured with secure defaults:
- Email confirmation: OFF (per Bolt default)
- Session persistence: enabled
- Auto refresh token: enabled
- No magic links, social providers, or custom auth tables.
- Anonymous users have zero access to all workspace tables (no anon policies exist).

## Environment Variables

The frontend client reads:
- `VITE_SUPABASE_URL` - project URL
- `VITE_SUPABASE_ANON_KEY` - anon public key (safe for frontend)

The service role key is never used in frontend code or committed files.

## Migrations Applied

1. `001_core_schema` - All seven tables with constraints and indexes
2. `002_rls_helpers_and_policies` - RLS enable, helper functions, all policies, column grants
3. `003_storage_bucket_and_policies` - Private storage bucket and storage RLS policies
4. `004_allocate_version_rpc` - Atomic version allocation RPC
