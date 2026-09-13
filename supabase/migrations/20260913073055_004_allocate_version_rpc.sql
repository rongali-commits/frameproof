/*
# FrameProof allocate_version RPC

## Purpose
Creates a SECURITY DEFINER function that atomically allocates the next version
number for an asset and inserts the asset_versions row. This serializes version
number allocation to prevent race conditions when two designers upload
concurrently.

## RPC Signature
  allocate_version(
    p_asset_id    uuid,
    p_storage_path text,
    p_width       integer,
    p_height      integer,
    p_original_name text
  ) RETURNS uuid

## Behavior
1. Looks up the asset and its parent project_id.
2. Checks that the calling user (auth.uid()) is a designer or admin on that
   project via is_project_designer_or_admin.
3. Validates input: width >= 1, height >= 1, storage_path and original_name
   non-empty and within length limits.
4. Atomically allocates the next version_number by finding MAX(version_number)
   + 1 within a locked transaction.
5. Inserts the asset_versions row with created_by = auth.uid().
6. Returns the new version id.

## Security
- SECURITY DEFINER with SET search_path = public.
- EXECUTE revoked from anon, granted to authenticated.
- The caller is derived from auth.uid(), never from a parameter.
- created_by is set from auth.uid() inside the function, not from client input.
- If the caller is not a designer or admin, raises an exception.

## Notes
1. This function bypasses RLS on asset_versions to perform the INSERT, which
   is the intended pattern for a SECURITY DEFINER function.
2. The UNIQUE(asset_id, version_number) constraint provides a backstop against
   duplicate version numbers even if the function is called concurrently.
3. The function does NOT upload the file to storage; the client uploads first,
   then calls this RPC to register the version. If the RPC fails, the client
   should clean up the uploaded file.
*/

CREATE OR REPLACE FUNCTION allocate_version(
  p_asset_id uuid,
  p_storage_path text,
  p_width integer,
  p_height integer,
  p_original_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_next_version integer;
  v_new_id uuid;
BEGIN
  -- Validate inputs
  IF p_width IS NULL OR p_width < 1 THEN
    RAISE EXCEPTION 'Invalid width: must be a positive integer';
  END IF;
  IF p_height IS NULL OR p_height < 1 THEN
    RAISE EXCEPTION 'Invalid height: must be a positive integer';
  END IF;
  IF p_storage_path IS NULL OR length(p_storage_path) < 1 OR length(p_storage_path) > 500 THEN
    RAISE EXCEPTION 'Invalid storage path: must be 1 to 500 characters';
  END IF;
  IF p_original_name IS NULL OR length(p_original_name) < 1 OR length(p_original_name) > 255 THEN
    RAISE EXCEPTION 'Invalid original name: must be 1 to 255 characters';
  END IF;

  -- Look up the asset's project
  SELECT a.project_id INTO v_project_id FROM assets a WHERE a.id = p_asset_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  -- Check caller is designer or admin
  IF NOT is_project_designer_or_admin(v_project_id) THEN
    RAISE EXCEPTION 'Not authorized: only designers and admins can upload versions';
  END IF;

  -- Atomically allocate next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM asset_versions
  WHERE asset_id = p_asset_id
  FOR UPDATE;

  -- Insert the new version
  INSERT INTO asset_versions (
    asset_id,
    version_number,
    storage_path,
    width,
    height,
    original_name,
    created_by
  )
  VALUES (
    p_asset_id,
    v_next_version,
    p_storage_path,
    p_width,
    p_height,
    p_original_name,
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION allocate_version(uuid, text, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION allocate_version(uuid, text, integer, integer, text) TO authenticated;
