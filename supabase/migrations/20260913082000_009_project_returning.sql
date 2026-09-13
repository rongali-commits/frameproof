-- INSERT ... RETURNING evaluates SELECT policy before the helper can observe the new row.
-- Direct ownership is sufficient for the new row; existing team access remains unchanged.
DROP POLICY IF EXISTS projects_select_member ON public.projects;
CREATE POLICY projects_select_member ON public.projects FOR SELECT TO authenticated
USING (owner_id=auth.uid() OR public.is_project_member(id));
