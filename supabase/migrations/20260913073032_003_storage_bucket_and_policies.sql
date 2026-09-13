/*
# FrameProof Storage Bucket and Policies

## Purpose
Creates a private storage bucket for artwork image uploads and enforces
access control through storage RLS policies.

## Storage Bucket
- Name: frameproof-assets
- Public: false (private bucket, access via signed URLs only)
- Allowed MIME types: image/png, image/jpeg, image/webp
- Max file size: 10 MB (enforced via bucket file_size_limit and client validation)

## Storage Path Contract
All uploaded files must follow the path format:
  {project_id}/{asset_id}/{random_filename}

This allows storage policies to verify that the uploading user has membership
in the project identified by the first path segment, and that the asset
belongs to that project.

## Storage Policies

### SELECT (read)
Authenticated users can read objects only if they are a member of the project
identified by the first path segment (project_id). Files are served via signed
URLs, not public URLs.

### INSERT (upload)
Authenticated users can upload only if:
1. The bucket is frameproof-assets
2. The first path segment matches a project where the user is a designer or admin
3. The second path segment matches an asset in that project
4. The MIME type in metadata is image/png, image/jpeg, or image/webp

### UPDATE
Not allowed (versions are append-only; old images are never overwritten).

### DELETE
Only project admins can delete objects.

## Security Notes
1. The bucket is private - no public read access.
2. Path segments are validated against actual project/asset membership.
3. MIME type is enforced at the policy level via metadata.content_type.
4. File size limit is enforced by the bucket configuration (10 MB).
5. Only designers and admins can upload, not reviewers.
6. The first path segment (project_id) is checked via is_project_designer_or_admin.
7. The second path segment (asset_id) is checked to belong to that project.
*/

-- Create the private storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'frameproof-assets',
  'frameproof-assets',
  false,
  10485760, -- 10 MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- SELECT: project members can read (for signed URL access)
DROP POLICY IF EXISTS "storage_select_project_member" ON storage.objects;
CREATE POLICY "storage_select_project_member" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'frameproof-assets'
    AND is_project_member((storage.foldername(name))[1]::uuid)
  );

-- INSERT: designers and admins can upload to their project's asset folder
-- MIME type is checked from metadata->>content_type (set by Supabase storage)
DROP POLICY IF EXISTS "storage_insert_designer_or_admin" ON storage.objects;
CREATE POLICY "storage_insert_designer_or_admin" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'frameproof-assets'
    AND is_project_designer_or_admin((storage.foldername(name))[1]::uuid)
    AND EXISTS (
      SELECT 1 FROM assets a
      WHERE a.id = (storage.foldername(name))[2]::uuid
      AND a.project_id = (storage.foldername(name))[1]::uuid
    )
    AND COALESCE(
      metadata->>'content_type' = 'image/png',
      metadata->>'content_type' = 'image/jpeg',
      metadata->>'content_type' = 'image/webp',
      false
    )
  );

-- DELETE: only admins can delete objects
DROP POLICY IF EXISTS "storage_delete_admin" ON storage.objects;
CREATE POLICY "storage_delete_admin" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'frameproof-assets'
    AND is_project_admin((storage.foldername(name))[1]::uuid)
  );
