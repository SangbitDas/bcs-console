"""
BCS Console — Database Inspector
Prints all tables, columns, data types, and row counts from live Supabase PostgreSQL.
Usage: python scripts/inspect_db.py
"""

import os
import sys
from pathlib import Path
import psycopg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    root_dir = Path(__file__).resolve().parent.parent
    env_file = root_dir / ".env"

    if env_file.exists():
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        pw = os.environ.get("SUPABASE_DB_PASSWORD")
        ref = os.environ.get("SUPABASE_PROJECT_REF", "cbebidcjrijottcqlqpq")
        db_url = f"postgresql://postgres.{ref}:{pw}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

    print("=" * 70)
    print(" BCS Console — Supabase Database Inspector")
    print("=" * 70)

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # 1. Fetch public tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cur.fetchall()]

            print(f"\nFound {len(tables)} tables in 'public' schema:\n")

            for t in tables:
                # Row count
                try:
                    cur.execute(f'SELECT count(*) FROM public."{t}";')
                    cnt = cur.fetchone()[0]
                except Exception:
                    cnt = "N/A"

                print(f"▶ Table: {t} (Total rows: {cnt})")

                # Columns
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = %s
                    ORDER BY ordinal_position;
                """, (t,))
                columns = cur.fetchall()
                for c in columns:
                    nullable = "NULL" if c[2] == "YES" else "NOT NULL"
                    print(f"   ├─ {c[0]:<25} : {c[1]:<20} ({nullable})")
                print()

    print("=" * 70)
    print(" Inspection complete!")
    print("=" * 70)

if __name__ == "__main__":
    main()
