"""
BCS Console — Update English Questions in Live Supabase PostgreSQL
Updates the 48 corrected English questions in the live Supabase database.
"""

import os
import sys
import json
from pathlib import Path
import psycopg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
MERGED_JSON = ROOT / "dataset" / "bcs_preliminary_question_bank.json"
ENV_FILE = ROOT / ".env"

# 48 target keys
TARGET_KEYS = {
    # 32 Underline fixes
    '14th_bcs:6', '14th_bcs:7', '14th_bcs:9', '14th_bcs:10',
    '25th_bcs:80', '28th_bcs:32', '32nd_bcs:29',
    '35th_bcs:45', '35th_bcs:54', '35th_bcs:56', '35th_bcs:57', '35th_bcs:62', '35th_bcs:67', '35th_bcs:68',
    '37th_bcs:51', '38th_bcs:43', '38th_bcs:59', '40th_bcs:52',
    '41st_bcs:153', '41st_bcs:160', '43rd_bcs:146', '44th_bcs:75',
    '45th_bcs:15', '46th_bcs:43', '46th_bcs:44', '46th_bcs:47', '46th_bcs:49', '46th_bcs:50',
    '47th_bcs:48', '48th_bcs:34', '49th_bcs:60', '50th_bcs:132',
    # 11 Blank fixes
    '10th_bcs:19', '13rd_bcs:83', '25th_bcs:84',
    '26th_bcs:44', '26th_bcs:47', '26th_bcs:57', '26th_bcs:58', '26th_bcs:72',
    '30th_bcs:39', '34th_bcs:35', '43rd_bcs:160',
    # 5 Duplicate option fixes
    '10th_bcs:23', '42nd_bcs:63', '44th_bcs:69', '44th_bcs:72', '45th_bcs:4'
}

def load_env():
    if ENV_FILE.exists():
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

def get_db_url():
    load_env()
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        return url
    pw = os.environ.get("SUPABASE_DB_PASSWORD")
    ref = os.environ.get("SUPABASE_PROJECT_REF", "cbebidcjrijottcqlqpq")
    if not pw:
        raise ValueError("Missing SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env")
    return f"postgresql://postgres.{ref}:{pw}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

def main():
    print("=" * 70)
    print(" BCS Console — Supabase English Questions Updater")
    print("=" * 70)

    # 1. Load patched JSON data
    with open(MERGED_JSON, encoding="utf-8") as f:
        data = json.load(f)

    questions_to_update = []
    for q in data["questions"]:
        key = f"{q['exam_slug']}:{q['question_number']}"
        if key in TARGET_KEYS:
            questions_to_update.append(q)

    print(f"Loaded {len(questions_to_update)} questions to update from canonical JSON.")
    assert len(questions_to_update) == 48, f"Expected 48, got {len(questions_to_update)}"

    # 2. Connect to Supabase PostgreSQL
    db_url = get_db_url()
    print("Connecting to Supabase PostgreSQL...")

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # Check pre-state
            cur.execute("SELECT count(*) FROM questions;")
            initial_count = cur.fetchone()[0]
            print(f"Initial questions count in DB: {initial_count}")

            updated_count = 0
            for q in questions_to_update:
                slug = q["exam_slug"]
                q_num = q["question_number"]

                cur.execute("""
                    UPDATE questions
                    SET question = %s,
                        option_a = %s,
                        option_b = %s,
                        option_c = %s,
                        option_d = %s,
                        solve_note = %s
                    WHERE exam_slug = %s AND question_number = %s;
                """, (
                    q["question"],
                    q["option_a"],
                    q["option_b"],
                    q["option_c"],
                    q["option_d"],
                    q["solve_note"],
                    slug,
                    q_num
                ))
                if cur.rowcount == 1:
                    updated_count += 1
                else:
                    print(f"WARNING: Row not found for {slug} #{q_num} (rowcount={cur.rowcount})")

            conn.commit()
            print(f"\nSuccessfully committed {updated_count} question updates.")

            # 3. Post-update verification
            print("\n=== Post-Update Verifications ===")
            cur.execute("SELECT count(*) FROM questions;")
            final_count = cur.fetchone()[0]
            assert final_count == 5350, f"Expected 5350 rows, found {final_count}"
            print(f"✓ Total questions in DB: {final_count} (unchanged)")

            # Check defective blank rows
            cur.execute("""
                SELECT exam_slug, question_number, correct_answer
                FROM questions
                WHERE (exam_slug = '25th_bcs' AND question_number = 65)
                   OR (exam_slug = '26th_bcs' AND question_number = 91)
                   OR (exam_slug = '34th_bcs' AND question_number = 100)
                   OR (exam_slug = '36th_bcs' AND question_number = 113)
                   OR (exam_slug = '36th_bcs' AND question_number = 120)
                   OR (exam_slug = '38th_bcs' AND question_number = 83)
                   OR (exam_slug = '39th_bcs' AND question_number = 76)
                   OR (exam_slug = '47th_bcs' AND question_number = 110);
            """)
            blank_rows = cur.fetchall()
            for r in blank_rows:
                assert r[2] is None or r[2] == '', f"Defective answer altered in DB: {r}"
            print(f"✓ All {len(blank_rows)} defective answer rows remain NULL in DB.")

            # Spot-check some updated rows in DB
            cur.execute("""
                SELECT exam_slug, question_number, question, option_c, option_d
                FROM questions
                WHERE (exam_slug = '14th_bcs' AND question_number = 6)
                   OR (exam_slug = '10th_bcs' AND question_number = 23)
                   OR (exam_slug = '44th_bcs' AND question_number = 69)
                   OR (exam_slug = '45th_bcs' AND question_number = 4)
                   OR (exam_slug = '26th_bcs' AND question_number = 44);
            """)
            sample_rows = cur.fetchall()
            print("\nSample updated rows from DB:")
            for r in sample_rows:
                print(f"  [{r[0]} #{r[1]}] Question: {r[2][:60]}... | Opt C: {r[3]} | Opt D: {r[4]}")

    print("\n======================================================================")
    print(" Supabase Database Update Complete & Verified!")
    print("======================================================================")

if __name__ == "__main__":
    main()
