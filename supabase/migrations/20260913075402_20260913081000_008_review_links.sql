CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.review_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 action_count integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_links FROM anon, authenticated;
GRANT SELECT(id,asset_id,expires_at,revoked_at,created_by,created_at) ON public.review_links TO authenticated;
CREATE POLICY review_links_owner ON public.review_links FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.assets a WHERE a.id=asset_id AND public.is_project_designer_or_admin(a.project_id) IS TRUE));
ALTER TABLE public.threads ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.replies ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.decisions ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.threads ADD COLUMN review_link_id uuid REFERENCES public.review_links(id);
ALTER TABLE public.replies ADD COLUMN review_link_id uuid REFERENCES public.review_links(id);
ALTER TABLE public.decisions ADD COLUMN review_link_id uuid REFERENCES public.review_links(id);
CREATE INDEX review_links_asset ON public.review_links(asset_id);

CREATE OR REPLACE FUNCTION public.stamp_review_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.created_at := now();
 IF NEW.review_link_id IS NOT NULL THEN
   NEW.author_id := NULL;
   NEW.author_name := left(trim(NEW.author_name),80) || ' (guest)';
 ELSE
   NEW.author_id := auth.uid();
   IF NEW.author_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
   NEW.author_name := left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'),''),'Workspace member'),100);
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.create_review_link(p_asset_id uuid, p_days integer DEFAULT 7) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE project uuid; token text; link_id uuid; expiry timestamptz;
BEGIN
 SELECT project_id INTO project FROM public.assets WHERE id=p_asset_id;
 IF auth.uid() IS NULL OR public.is_project_designer_or_admin(project) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_days NOT BETWEEN 1 AND 30 OR p_days IS NULL THEN RAISE EXCEPTION 'Choose 1 to 30 days'; END IF;
 token := encode(extensions.gen_random_bytes(32),'hex'); expiry := now() + make_interval(days=>p_days);
 INSERT INTO public.review_links(asset_id,token_hash,expires_at) VALUES(p_asset_id,encode(extensions.digest(token,'sha256'),'hex'),expiry) RETURNING id INTO link_id;
 RETURN jsonb_build_object('id',link_id,'token',token,'expires_at',expiry);
END; $$;
CREATE OR REPLACE FUNCTION public.revoke_review_link(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE project uuid;
BEGIN
 SELECT a.project_id INTO project FROM public.review_links l JOIN public.assets a ON a.id=l.asset_id WHERE l.id=p_id;
 IF auth.uid() IS NULL OR public.is_project_designer_or_admin(project) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Access denied'; END IF;
 UPDATE public.review_links SET revoked_at=now() WHERE id=p_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_review_link(uuid,integer), public.revoke_review_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_review_link(uuid,integer), public.revoke_review_link(uuid) TO authenticated;

-- The edge service is the only caller of this endpoint. Each request revalidates scope and expiry.
CREATE OR REPLACE FUNCTION public.public_review(p_token text, p_action text DEFAULT 'read', p_version uuid DEFAULT NULL, p_name text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE link public.review_links%ROWTYPE; asset public.assets%ROWTYPE; snapshot jsonb; thread_version uuid;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Review link unavailable'; END IF;
 SELECT * INTO link FROM public.review_links WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
 IF link.id IS NULL OR link.revoked_at IS NOT NULL OR link.expires_at<=now() THEN RAISE EXCEPTION 'Review link unavailable or expired'; END IF;
 SELECT * INTO asset FROM public.assets WHERE id=link.asset_id;
 IF p_action = 'read' THEN
   SELECT jsonb_build_object(
    'asset',jsonb_build_object('id',asset.id,'name',asset.name,'subtitle',asset.subtitle),
    'expires_at',link.expires_at,
    'versions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'version_number',v.version_number,'storage_path',v.storage_path,'width',v.width,'height',v.height,'created_at',v.created_at) ORDER BY v.version_number) FROM public.asset_versions v WHERE v.asset_id=asset.id),'[]'::jsonb),
    'threads',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'version_id',t.version_id,'x',t.x,'y',t.y,'body',t.body,'author_name',t.author_name,'resolved',t.resolved,'created_at',t.created_at)) FROM public.threads t JOIN public.asset_versions v ON v.id=t.version_id WHERE v.asset_id=asset.id),'[]'::jsonb),
    'replies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'thread_id',r.thread_id,'body',r.body,'author_name',r.author_name,'created_at',r.created_at)) FROM public.replies r JOIN public.threads t ON t.id=r.thread_id JOIN public.asset_versions v ON v.id=t.version_id WHERE v.asset_id=asset.id),'[]'::jsonb),
    'decisions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'version_id',d.version_id,'status',d.status,'note',d.note,'author_name',d.author_name,'created_at',d.created_at)) FROM public.decisions d JOIN public.asset_versions v ON v.id=d.version_id WHERE v.asset_id=asset.id),'[]'::jsonb)
   ) INTO snapshot;
   RETURN snapshot;
 END IF;
 IF p_version IS NULL OR NOT EXISTS(SELECT 1 FROM public.asset_versions WHERE id=p_version AND asset_id=link.asset_id) THEN RAISE EXCEPTION 'Version unavailable'; END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Enter your name'; END IF;
 IF link.window_start < now()-interval '1 hour' THEN link.action_count:=0; link.window_start:=now(); END IF;
 IF link.action_count>=120 THEN RAISE EXCEPTION 'Review activity limit reached. Try later.'; END IF;
 UPDATE public.review_links SET action_count=link.action_count+1,window_start=link.window_start WHERE id=link.id;
 IF p_action='comment' THEN
   INSERT INTO public.threads(version_id,x,y,body,author_name,review_link_id) VALUES(p_version,(p_payload->>'x')::float8,(p_payload->>'y')::float8,trim(p_payload->>'body'),trim(p_name),link.id);
 ELSIF p_action='reply' THEN
   SELECT version_id INTO thread_version FROM public.threads WHERE id=(p_payload->>'thread_id')::uuid;
   IF thread_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Thread unavailable'; END IF;
   INSERT INTO public.replies(thread_id,body,author_name,review_link_id) VALUES((p_payload->>'thread_id')::uuid,trim(p_payload->>'body'),trim(p_name),link.id);
 ELSIF p_action='decision' THEN
   INSERT INTO public.decisions(version_id,status,note,author_name,review_link_id) VALUES(p_version,p_payload->>'status',coalesce(p_payload->>'note',''),trim(p_name),link.id);
 ELSE RAISE EXCEPTION 'Unsupported review action'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.public_review(text,text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_review(text,text,uuid,text,jsonb) TO service_role;