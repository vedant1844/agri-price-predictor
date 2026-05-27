-- =============================================================
-- Supabase Data API Grants for agri-price-predictor
-- =============================================================
-- 
-- WHY: Starting May 30, 2026, new Supabase projects no longer
-- auto-expose public tables to the Data API (PostgREST,
-- supabase-js, GraphQL). Existing projects are enforced from
-- October 30, 2026. These GRANT statements ensure our tables
-- remain accessible through the Supabase APIs.
--
-- SECURITY: RLS is enabled so that public API users can only
-- READ data. All writes happen through the backend (postgres role)
-- which bypasses RLS.
--
-- HOW TO RUN:
--   Option 1: Supabase Dashboard -> SQL Editor -> paste & run
--   Option 2: python scripts/apply_supabase_grants.py
--   Option 3: Automatically applied on backend startup (main.py)
--
-- REFERENCE: https://supabase.com/changelog
-- =============================================================

-- ─── 1. GRANT: Schema & Table Access ────────────────────────

-- Grant schema usage to API roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant read access on the prices table
-- (our frontend only reads data; writes happen via backend/scripts)
GRANT SELECT ON prices TO anon;
GRANT SELECT ON prices TO authenticated;

-- If you later need write access through supabase-js, uncomment:
-- GRANT INSERT, UPDATE, DELETE ON prices TO authenticated;

-- ─── 2. RLS: Row-Level Security ─────────────────────────────

-- Enable RLS (blocks all access by default, then policies allow specific access)
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon & authenticated) to read all price data
DROP POLICY IF EXISTS prices_public_read ON prices;
CREATE POLICY prices_public_read ON prices
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- NOTE: No INSERT/UPDATE/DELETE policies are created.
-- This means the Data API cannot modify data — only the backend
-- (which connects as 'postgres' and bypasses RLS) can write.

-- ─── 3. Future Tables ───────────────────────────────────────
-- If you add more tables, add GRANT + RLS lines here:
-- GRANT SELECT ON <new_table> TO anon;
-- GRANT SELECT ON <new_table> TO authenticated;
-- ALTER TABLE <new_table> ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY <new_table>_public_read ON <new_table>
--     FOR SELECT TO anon, authenticated USING (true);
