/*
# Revoke anon EXECUTE on all SECURITY DEFINER functions

## Purpose
The security advisor found that all 5 SECURITY DEFINER functions were still
executable by the anon role. This is because PostgreSQL grants EXECUTE to
PUBLIC by default on new functions. REVOKE FROM anon alone does not override
a PUBLIC grant. This migration revokes from both PUBLIC and anon to ensure
anonymous users cannot call any of these functions.

## Functions affected
- get_user_role(uuid)
- is_project_member(uuid)
- is_project_admin(uuid)
- is_project_designer_or_admin(uuid)
- allocate_version(uuid, text, integer, integer, text)

## Security
After this migration, only authenticated users can call these functions.
*/

REVOKE EXECUTE ON FUNCTION get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION is_project_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_project_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION is_project_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_project_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION is_project_designer_or_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_project_designer_or_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_project_designer_or_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION allocate_version(uuid, text, integer, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION allocate_version(uuid, text, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION allocate_version(uuid, text, integer, integer, text) TO authenticated;
