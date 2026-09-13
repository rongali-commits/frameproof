-- Correct nullable authorization, lock allocation and immutable ownership.
CREATE OR REPLACE FUNCTION public.allocate_version(p_asset_id uuid, p_storage_path text, p_width integer, p_height integer, p_original_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project uuid; next_number integer; result uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT project_id INTO project FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF project IS NULL OR public.is_project_designer_or_admin(project) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF p_width IS NULL OR p_height IS NULL OR p_width NOT BETWEEN 1 AND 12000 OR p_height NOT BETWEEN 1 AND 12000 OR p_width::bigint * p_height > 40000000 THEN RAISE EXCEPTION 'Invalid image dimensions'; END IF;
  IF p_original_name IS NULL OR length(trim(p_original_name)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Invalid filename'; END IF;
  IF p_storage_path IS NULL OR split_part(p_storage_path,'/',1) <> project::text OR split_part(p_storage_path,'/',2) <> p_asset_id::text OR array_length(string_to_array(p_storage_path,'/'),1) <> 3 THEN RAISE EXCEPTION 'Invalid storage path'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'frameproof-assets' AND name = p_storage_path) THEN RAISE EXCEPTION 'Upload the image before registering a revision'; END IF;
  IF EXISTS (SELECT 1 FROM public.asset_versions WHERE storage_path = p_storage_path) THEN RAISE EXCEPTION 'This image is already registered'; END IF;
  SELECT coalesce(max(version_number),0)+1 INTO next_number FROM public.asset_versions WHERE asset_id = p_asset_id;
  INSERT INTO public.asset_versions(asset_id,version_number,storage_path,width,height,original_name,created_by) VALUES(p_asset_id,next_number,p_storage_path,p_width,p_height,p_original_name,auth.uid()) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.allocate_version(uuid,text,integer,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_version(uuid,text,integer,integer,text) TO authenticated;

REVOKE UPDATE ON public.projects FROM authenticated;
GRANT UPDATE(name,description) ON public.projects TO authenticated;
REVOKE UPDATE ON public.assets FROM authenticated;
GRANT UPDATE(name,subtitle) ON public.assets TO authenticated;
REVOKE INSERT ON public.projects FROM authenticated;
GRANT INSERT(name,description) ON public.projects TO authenticated;
REVOKE INSERT ON public.assets FROM authenticated;
GRANT INSERT(project_id,name,subtitle) ON public.assets TO authenticated;

-- Metadata MIME keys vary by storage version; the bucket independently enforces allowed MIME types.
DROP POLICY IF EXISTS storage_insert_designer_or_admin ON storage.objects;
CREATE POLICY storage_insert_designer_or_admin ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'frameproof-assets'
  AND public.is_project_designer_or_admin((storage.foldername(name))[1]::uuid) IS TRUE
  AND EXISTS(SELECT 1 FROM public.assets a WHERE a.id = (storage.foldername(name))[2]::uuid AND a.project_id = (storage.foldername(name))[1]::uuid)
);
-- Failed registrations can remove their own unreferenced uploads, but never registered artwork.
DROP POLICY IF EXISTS storage_delete_admin ON storage.objects;
CREATE POLICY storage_delete_unregistered ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'frameproof-assets' AND public.is_project_designer_or_admin((storage.foldername(name))[1]::uuid) IS TRUE
  AND NOT EXISTS(SELECT 1 FROM public.asset_versions v WHERE v.storage_path = name)
);
DROP POLICY IF EXISTS versions_delete_admin ON public.asset_versions;
DROP POLICY IF EXISTS threads_update_author ON public.threads;
CREATE POLICY threads_update_member ON public.threads FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id=v.asset_id WHERE v.id=threads.version_id AND public.is_project_member(a.project_id) IS TRUE AND (threads.author_id=auth.uid() OR public.is_project_designer_or_admin(a.project_id) IS TRUE))
) WITH CHECK (
  EXISTS(SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id=v.asset_id WHERE v.id=threads.version_id AND public.is_project_member(a.project_id) IS TRUE)
);

CREATE OR REPLACE FUNCTION public.stamp_review_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  NEW.author_id := auth.uid();
  NEW.author_name := left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'),''),'Workspace member'),100);
  RETURN NEW;
END; $$;
CREATE TRIGGER stamp_thread BEFORE INSERT ON public.threads FOR EACH ROW EXECUTE FUNCTION public.stamp_review_identity();
CREATE TRIGGER stamp_reply BEFORE INSERT ON public.replies FOR EACH ROW EXECUTE FUNCTION public.stamp_review_identity();
CREATE TRIGGER stamp_decision BEFORE INSERT ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.stamp_review_identity();
REVOKE ALL ON FUNCTION public.stamp_review_identity() FROM PUBLIC,anon,authenticated;