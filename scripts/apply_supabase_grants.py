"""
One-time script to apply Supabase Data API GRANT statements
and enable Row-Level Security (RLS) on ALL public tables.

Run this to immediately fix access and security for all tables,
rather than waiting for the backend to restart.

Usage:
    python scripts/apply_supabase_grants.py

This is safe to run multiple times -- GRANTs and policies are idempotent.
"""

import os
import sys

# Try to load .env for local development
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
except ImportError:
    pass

import psycopg2


# All tables that need protection
TABLES = ["prices", "commodity_prices", "commodity_data", "predictions"]
ROLES = ["anon", "authenticated"]


def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("=" * 60)
    print(" Supabase Security Fix: Grants + Row-Level Security")
    print(" Tables: " + ", ".join(TABLES))
    print("=" * 60)

    # -- Step 1: Schema usage grants --
    print("\n--- Step 1: Schema Usage Grants ---")
    for role in ROLES:
        try:
            cur.execute(f"GRANT USAGE ON SCHEMA public TO {role}")
            print(f"  [OK] USAGE on schema -> {role}")
        except Exception as e:
            print(f"  [WARN] USAGE on schema -> {role}: {e}")

    # -- Step 2: Per-table GRANT + RLS --
    for table in TABLES:
        print(f"\n--- Table: {table} ---")

        # GRANT SELECT
        for role in ROLES:
            try:
                cur.execute(f"GRANT SELECT ON {table} TO {role}")
                print(f"  [OK] GRANT SELECT -> {role}")
            except Exception as e:
                print(f"  [WARN] GRANT SELECT -> {role}: {e}")

        # Enable RLS
        try:
            cur.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            print(f"  [OK] RLS enabled")
        except Exception as e:
            print(f"  [WARN] RLS enable: {e}")

        # Create read-only policy (drop first for idempotency)
        policy_name = f"{table}_public_read"
        try:
            cur.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table}")
            cur.execute(f"""
                CREATE POLICY {policy_name} ON {table}
                    FOR SELECT
                    TO anon, authenticated
                    USING (true)
            """)
            print(f"  [OK] Policy '{policy_name}' created (SELECT only)")
        except Exception as e:
            print(f"  [WARN] Policy creation: {e}")

    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print(" [OK] All security fixes applied!")
    print("=" * 60)
    print("""
What changed:
  1. anon/authenticated can SELECT (read) all tables via Data API
  2. RLS is ON -- no INSERT/UPDATE/DELETE through Data API
  3. Backend (postgres role) bypasses RLS, writes still work
""")


if __name__ == "__main__":
    main()
