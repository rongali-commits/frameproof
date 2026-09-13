/*
# FrameProof RLS Helpers and Policies

## Purpose
Enables Row Level Security on all workspace tables and creates secure helper
functions to check project membership and role without recursion. Then applies
per-table policies that enforce the role-based access model.

## Security Helper Functions

### get_user_role(p_project_id uuid) RETURNS text
SECURITY DEFINER function that checks whether the calling user (auth.uid()) is
the project owner or a member of project_members, and returns their effective
role. Returns NULL if the user has no access. The project owner is implicitly
'admin' without needing a project_members row. Uses SET search_path = public to
prevent search path injection.

### is_project_member(p_project_id uuid) RETURNS boolean
Returns true if the calling user has any role on the project (owner or member).

### is_project_admin(p_project_id uuid) RETURNS boolean
Returns true if the calling user is owner or admin.

### is_project_designer_or_admin(p_project_id uuid) RETURNS boolean
Returns true if the calling user is owner, admin, or designer.

## RLS Policy Summary

### projects
- SELECT: owner or any project member can read
- INSERT: any authenticated user can create a project (owner_id defaults to auth.uid())
- UPDATE: only owner or admin
- DELETE: only owner or admin

### project_members
- SELECT: owner or any member can read the member list
- INSERT: only owner or admin (role must be valid)
- DELETE: only owner or admin (cannot remove the owner)
- UPDATE: disabled (no policy) - role changes go through a SECURITY DEFINER function

### assets
- SELECT: any member can read
- INSERT: designer or admin only
- UPDATE: designer or admin only
- DELETE: admin only

### asset_versions
- SELECT: any member can read
- INSERT: only through allocate_version RPC (no direct INSERT policy)
- UPDATE: no policy (versions are append-only, never modified)
- DELETE: admin only

### threads
- SELECT: any member can read
- INSERT: any member (reviewers, designers, admins)
- UPDATE: only author can update (e.g., resolve/reopen)
- DELETE: admin only

### replies
- SELECT: any member can read
- INSERT: any member
- UPDATE: no policy (replies are immutable after posting)
- DELETE: admin only

### decisions
- SELECT: any member can read
- INSERT: any member (reviewers, designers, admins)
- UPDATE: no policy (decisions are immutable insert-only)
- DELETE: no policy (decisions are immutable insert-only)

## Security Notes
1. All helper functions are SECURITY DEFINER with SET search_path = public.
2. EXECUTE is revoked from anon on all helper functions.
3. No policy uses USING (true) - every predicate checks membership or ownership.
4. project_members RLS avoids recursion by using SECURITY DEFINER helpers that
   read project_members directly (bypassing RLS) rather than using subqueries in
   policies that would recurse.
5. Anonymous users have zero access to all workspace tables.
6. The project owner is implicitly an admin even without a project_members row.
*/

-- ============================================================
-- Security Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_role text;
BEGIN
  SELECT owner_id INTO v_owner_id FROM projects WHERE id = p_project_id;
  IF v_owner_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_owner_id = auth.uid() THEN
    RETURN 'admin';
  END IF;
  SELECT role INTO v_role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid();
  RETURN v_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_user_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_user_role(p_project_id) IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION is_project_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION is_project_admin(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_user_role(p_project_id) IN ('admin');
$$;

REVOKE EXECUTE ON FUNCTION is_project_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION is_project_designer_or_admin(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_user_role(p_project_id) IN ('admin', 'designer');
$$;

REVOKE EXECUTE ON FUNCTION is_project_designer_or_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_designer_or_admin(uuid) TO authenticated;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Projects policies
-- ============================================================

DROP POLICY IF EXISTS "projects_select_member" ON projects;
CREATE POLICY "projects_select_member" ON projects FOR SELECT
  TO authenticated
  USING (is_project_member(id));

DROP POLICY IF EXISTS "projects_insert_owner" ON projects;
CREATE POLICY "projects_insert_owner" ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "projects_update_admin" ON projects;
CREATE POLICY "projects_update_admin" ON projects FOR UPDATE
  TO authenticated
  USING (is_project_admin(id))
  WITH CHECK (is_project_admin(id));

DROP POLICY IF EXISTS "projects_delete_admin" ON projects;
CREATE POLICY "projects_delete_admin" ON projects FOR DELETE
  TO authenticated
  USING (is_project_admin(id));

-- ============================================================
-- Project_members policies
-- ============================================================

DROP POLICY IF EXISTS "members_select_member" ON project_members;
CREATE POLICY "members_select_member" ON project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

DROP POLICY IF EXISTS "members_insert_admin" ON project_members;
CREATE POLICY "members_insert_admin" ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id));

DROP POLICY IF EXISTS "members_delete_admin" ON project_members;
CREATE POLICY "members_delete_admin" ON project_members FOR DELETE
  TO authenticated
  USING (is_project_admin(project_id) AND user_id <> (SELECT owner_id FROM projects WHERE id = project_id));

-- ============================================================
-- Assets policies
-- ============================================================

DROP POLICY IF EXISTS "assets_select_member" ON assets;
CREATE POLICY "assets_select_member" ON assets FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

DROP POLICY IF EXISTS "assets_insert_designer" ON assets;
CREATE POLICY "assets_insert_designer" ON assets FOR INSERT
  TO authenticated
  WITH CHECK (is_project_designer_or_admin(project_id));

DROP POLICY IF EXISTS "assets_update_designer" ON assets;
CREATE POLICY "assets_update_designer" ON assets FOR UPDATE
  TO authenticated
  USING (is_project_designer_or_admin(project_id))
  WITH CHECK (is_project_designer_or_admin(project_id));

DROP POLICY IF EXISTS "assets_delete_admin" ON assets;
CREATE POLICY "assets_delete_admin" ON assets FOR DELETE
  TO authenticated
  USING (is_project_admin(project_id));

-- ============================================================
-- Asset_versions policies (append-only, no direct INSERT)
-- ============================================================

DROP POLICY IF EXISTS "versions_select_member" ON asset_versions;
CREATE POLICY "versions_select_member" ON asset_versions FOR SELECT
  TO authenticated
  USING (
    is_project_member(
      (SELECT a.project_id FROM assets a WHERE a.id = asset_versions.asset_id)
    )
  );

DROP POLICY IF EXISTS "versions_delete_admin" ON asset_versions;
CREATE POLICY "versions_delete_admin" ON asset_versions FOR DELETE
  TO authenticated
  USING (
    is_project_admin(
      (SELECT a.project_id FROM assets a WHERE a.id = asset_versions.asset_id)
    )
  );

-- ============================================================
-- Threads policies
-- ============================================================

DROP POLICY IF EXISTS "threads_select_member" ON threads;
CREATE POLICY "threads_select_member" ON threads FOR SELECT
  TO authenticated
  USING (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       WHERE av.id = threads.version_id)
    )
  );

DROP POLICY IF EXISTS "threads_insert_member" ON threads;
CREATE POLICY "threads_insert_member" ON threads FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       WHERE av.id = threads.version_id)
    )
  );

DROP POLICY IF EXISTS "threads_update_author" ON threads;
CREATE POLICY "threads_update_author" ON threads FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "threads_delete_admin" ON threads;
CREATE POLICY "threads_delete_admin" ON threads FOR DELETE
  TO authenticated
  USING (
    is_project_admin(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       WHERE av.id = threads.version_id)
    )
  );

-- ============================================================
-- Replies policies
-- ============================================================

DROP POLICY IF EXISTS "replies_select_member" ON replies;
CREATE POLICY "replies_select_member" ON replies FOR SELECT
  TO authenticated
  USING (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       JOIN threads t ON t.version_id = av.id
       WHERE t.id = replies.thread_id)
    )
  );

DROP POLICY IF EXISTS "replies_insert_member" ON replies;
CREATE POLICY "replies_insert_member" ON replies FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       JOIN threads t ON t.version_id = av.id
       WHERE t.id = replies.thread_id)
    )
  );

DROP POLICY IF EXISTS "replies_delete_admin" ON replies;
CREATE POLICY "replies_delete_admin" ON replies FOR DELETE
  TO authenticated
  USING (
    is_project_admin(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       JOIN threads t ON t.version_id = av.id
       WHERE t.id = replies.thread_id)
    )
  );

-- ============================================================
-- Decisions policies (insert-only, immutable)
-- ============================================================

DROP POLICY IF EXISTS "decisions_select_member" ON decisions;
CREATE POLICY "decisions_select_member" ON decisions FOR SELECT
  TO authenticated
  USING (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       WHERE av.id = decisions.version_id)
    )
  );

DROP POLICY IF EXISTS "decisions_insert_member" ON decisions;
CREATE POLICY "decisions_insert_member" ON decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_member(
      (SELECT a.project_id FROM assets a
       JOIN asset_versions av ON av.asset_id = a.id
       WHERE av.id = decisions.version_id)
    )
  );

-- ============================================================
-- Column-level privileges: prevent client from setting
-- ownership/author columns that should come from the session
-- ============================================================

-- Prevent clients from setting arbitrary owner_id on projects
-- (DEFAULT auth.uid() handles it, and WITH CHECK enforces it)
-- No additional column grant needed: projects has no narrowed columns beyond owner_id.

-- Prevent clients from setting created_by on asset_versions
REVOKE INSERT ON asset_versions FROM authenticated;
-- (INSERT is only through allocate_version RPC, so no direct grant needed)

-- Prevent clients from setting author_id on threads
REVOKE INSERT ON threads FROM authenticated;
GRANT INSERT (version_id, x, y, body, author_name, resolved) ON threads TO authenticated;

-- Prevent clients from setting author_id on replies
REVOKE INSERT ON replies FROM authenticated;
GRANT INSERT (thread_id, body, author_name) ON replies TO authenticated;

-- Prevent clients from setting author_id on decisions
REVOKE INSERT ON decisions FROM authenticated;
GRANT INSERT (version_id, status, note, author_name) ON decisions TO authenticated;

-- Prevent clients from updating resolved on threads via column grant
REVOKE UPDATE ON threads FROM authenticated;
GRANT UPDATE (resolved) ON threads TO authenticated;
