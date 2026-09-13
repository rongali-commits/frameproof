/*
# FrameProof Core Schema

## Purpose
Creates the normalized database schema for FrameProof, a visual review workspace
for designers and creative teams. This migration establishes all workspace tables
with strict foreign keys, constraint enforcement, and server-defaulted timestamps.

## New Tables

### projects
- `id` (uuid, PK) - unique project identifier
- `owner_id` (uuid, NOT NULL, FK to auth.users) - the user who created and owns the project
- `name` (text, NOT NULL, 1..200 chars) - project display name
- `description` (text, max 2000 chars) - optional project description
- `created_at` (timestamptz, DEFAULT now()) - server timestamp

### project_members
- `id` (uuid, PK) - membership row identifier
- `project_id` (uuid, NOT NULL, FK to projects CASCADE) - parent project
- `user_id` (uuid, NOT NULL, FK to auth.users CASCADE) - member user
- `role` (text, NOT NULL, CHECK in 'admin','designer','reviewer') - member role
- `created_at` (timestamptz, DEFAULT now()) - when membership was established
- UNIQUE (project_id, user_id) - a user can only have one role per project

### assets
- `id` (uuid, PK) - asset identifier
- `project_id` (uuid, NOT NULL, FK to projects CASCADE) - parent project
- `name` (text, NOT NULL, 1..200 chars) - asset display name
- `subtitle` (text, max 500 chars) - optional subtitle/description
- `created_at` (timestamptz, DEFAULT now()) - server timestamp

### asset_versions
- `id` (uuid, PK) - version identifier
- `asset_id` (uuid, NOT NULL, FK to assets CASCADE) - parent asset
- `version_number` (integer, NOT NULL, >= 1) - sequential version number
- `storage_path` (text, NOT NULL, 1..500 chars) - path in storage bucket
- `width` (integer, NOT NULL, >= 1) - image width in pixels
- `height` (integer, NOT NULL, >= 1) - image height in pixels
- `original_name` (text, NOT NULL, 1..255 chars) - original uploaded filename
- `created_by` (uuid, NOT NULL, FK to auth.users) - who uploaded this version
- `created_at` (timestamptz, DEFAULT now()) - server timestamp
- UNIQUE (asset_id, version_number) - one version number per asset

### threads
- `id` (uuid, PK) - thread identifier
- `version_id` (uuid, NOT NULL, FK to asset_versions CASCADE) - parent version
- `x` (double precision, NOT NULL, CHECK 0..1) - normalized pin X coordinate
- `y` (double precision, NOT NULL, CHECK 0..1) - normalized pin Y coordinate
- `body` (text, NOT NULL, 1..2000 chars) - comment text
- `author_id` (uuid, NOT NULL, FK to auth.users) - comment author
- `author_name` (text, NOT NULL, 1..100 chars) - display name snapshot
- `resolved` (boolean, NOT NULL, DEFAULT false) - resolution state
- `created_at` (timestamptz, DEFAULT now()) - server timestamp

### replies
- `id` (uuid, PK) - reply identifier
- `thread_id` (uuid, NOT NULL, FK to threads CASCADE) - parent thread
- `body` (text, NOT NULL, 1..2000 chars) - reply text
- `author_id` (uuid, NOT NULL, FK to auth.users) - reply author
- `author_name` (text, NOT NULL, 1..100 chars) - display name snapshot
- `created_at` (timestamptz, DEFAULT now()) - server timestamp

### decisions
- `id` (uuid, PK) - decision identifier
- `version_id` (uuid, NOT NULL, FK to asset_versions CASCADE) - parent version
- `status` (text, NOT NULL, CHECK in 'pending','approved','changes_requested') - decision
- `note` (text, max 2000 chars) - optional reviewer note
- `author_id` (uuid, NOT NULL, FK to auth.users) - decision author
- `author_name` (text, NOT NULL, 1..100 chars) - display name snapshot
- `created_at` (timestamptz, DEFAULT now()) - server timestamp

## Security
- RLS is enabled on every table in the next migration.
- No policies are created here; the next migration adds them.
- Anonymous users will have no access to any workspace table.

## Notes
1. All timestamps use timestamptz with DEFAULT now() so the server sets them.
2. owner_id on projects has DEFAULT auth.uid() so client inserts omitting it succeed.
3. created_by on asset_versions has DEFAULT auth.uid() for the same reason.
4. author_id on threads, replies, and decisions has DEFAULT auth.uid() so the
   server derives the author from the session, not from client-supplied values.
5. Decisions are insert-only (no UPDATE or DELETE policies will be created).
6. Version numbers are allocated atomically via the allocate_version RPC in a
   later migration; the UNIQUE constraint prevents duplicates.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description text CHECK (length(description) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'designer', 'reviewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  subtitle text CHECK (length(subtitle) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number >= 1),
  storage_path text NOT NULL CHECK (length(storage_path) BETWEEN 1 AND 500),
  width integer NOT NULL CHECK (width >= 1),
  height integer NOT NULL CHECK (height >= 1),
  original_name text NOT NULL CHECK (length(original_name) BETWEEN 1 AND 255),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, version_number)
);

CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES asset_versions(id) ON DELETE CASCADE,
  x double precision NOT NULL CHECK (x >= 0 AND x <= 1),
  y double precision NOT NULL CHECK (y >= 0 AND y <= 1),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 100),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES asset_versions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'changes_requested')),
  note text CHECK (length(note) <= 2000),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_threads_version_id ON threads(version_id);
CREATE INDEX IF NOT EXISTS idx_replies_thread_id ON replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_decisions_version_id ON decisions(version_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
