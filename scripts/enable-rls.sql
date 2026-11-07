-- ============================================================================
-- Supabase Security Remediation: Enable Row Level Security (RLS) on Public Tables
-- Resolves:
--   1. Supabase Linter 0013: rls_disabled_in_public
--   2. Supabase Linter 0024: rls_policy_always_true (overly permissive policies)
-- ============================================================================

-- 1. Enable RLS on previously unshielded tables
ALTER TABLE IF EXISTS public.admin_site_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_content_planner ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_month_links ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly permissive "Allow full access" policies that bypassed RLS for PostgREST
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.workspace_moodboards;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.workspace_projects;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.workspace_tasks;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.workspace_team;

-- Verification queries:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT * FROM pg_policies WHERE schemaname = 'public';


