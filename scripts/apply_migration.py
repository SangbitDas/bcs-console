#!/usr/bin/env python3
"""Apply a SQL migration file to the Supabase Postgres database.

Usage:
    python scripts/apply_migration.py supabase/migrations/<file>.sql

Loads connection settings from the repo-root .env (SUPABASE_DB_URL or
SUPABASE_DB_PASSWORD). Migrations are written to be idempotent, so re-running
is safe. Requires: pip install -r scripts/requirements.txt (psycopg[binary]).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT_REF = "cbebidcjrijottcqlqpq"


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        return url
    pw = os.environ.get("SUPABASE_DB_PASSWORD")
    if not pw:
        raise SystemExit("SEED FAIL: set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD")
    ref = os.environ.get("SUPABASE_PROJECT_REF", PROJECT_REF)
    return (
        f"postgresql://postgres.{ref}:{pw}"
        f"@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/apply_migration.py <path/to/file.sql>")

    load_env()
    sql_path = (ROOT / sys.argv[1]).resolve()
    if not sql_path.exists():
        raise SystemExit(f"SEED FAIL: no such file: {sql_path}")

    sql = sql_path.read_text(encoding="utf-8")
    import psycopg  # noqa: PLC0415

    with psycopg.connect(db_url(), autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)

    print(f"APPLIED OK: {sql_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()