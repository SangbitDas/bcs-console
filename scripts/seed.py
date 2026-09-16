#!/usr/bin/env python3
"""BCS Console — idempotent seed: dataset JSON -> Supabase Postgres + Storage.

Sources : dataset/bcs_preliminary_question_bank.json (canonical, 41 exams / 5,350 q)
          dataset_manifest.json (verified counts — seed aborts on mismatch)
          image_manifest.csv    (799-key upload allow-list; orphans auto-skipped)
Binaries: clone the dataset repo's images/ dir and point --images-dir at it
          (e.g. --images-dir ../bcs-dataset/images). Binaries are NOT in this repo.

Modes:
  --validate-only   offline pre-seed checks only (no network)
  --db-only         validate + upsert subjects/exams/questions/images metadata, skip binary upload
  --images-only     upload binaries for already-seeded rows (requires keys + images dir)
  --full            validate + DB seed + binary upload (default)

Env:
  SUPABASE_DB_URL            full psycopg URL, or built from the next two:
  SUPABASE_DB_PASSWORD       postgres password for db.<ref>.supabase.co
  SUPABASE_URL               https://<ref>.supabase.co  (needed for public URLs + upload)
  SUPABASE_SERVICE_ROLE_KEY  service_role key (Storage upload only; never commit)

Idempotency: subjects/exams/questions upserted on PK/unique keys;
question_images upserted on (question_id, storage_path); Storage uploads use
upsert. Re-running converges. correct_answer '' -> NULL (the 8 defective rows).

Usage:
  python scripts/seed.py --validate-only
  python scripts/seed.py --db-only
  python scripts/seed.py --full --images-dir ../bcs-dataset/images
"""
from __future__ import annotations

import argparse
import csv
import json
import mimetypes
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MERGED = ROOT / "dataset" / "bcs_preliminary_question_bank.json"
MANIFEST = ROOT / "dataset_manifest.json"
IMAGE_MANIFEST = ROOT / "image_manifest.csv"

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "cbebidcjrijottcqlqpq")
BUCKET = "bcs-images"
SLUG_RE = re.compile(r"^\d+(st|nd|rd|th)_bcs$")
MOJIBAKE = ["à¦", "à§", "â€", "Â", "\ufffd"]
CHUNK = 500


def fail(msg: str) -> "NoReturn":
    print(f"SEED FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load_inputs():
    try:
        data = json.loads(MERGED.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot parse {MERGED}: {e}")
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as e:
        fail(f"cannot parse {MANIFEST}: {e}")
    allow = set()
    try:
        with IMAGE_MANIFEST.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                allow.add(row["storage_key"].strip())
    except Exception as e:
        fail(f"cannot parse {IMAGE_MANIFEST}: {e}")
    orphans = set(manifest.get("orphan_images_ignored", []))
    return data, manifest, allow, orphans


def validate(data, manifest, allow, orphans) -> list[dict]:
    """Offline pre-seed checks (AGENTS.md §6). Returns flat question list."""
    if len(data.get("exams", [])) != manifest["total_exams"]:
        fail(f"exams {len(data['exams'])} != manifest {manifest['total_exams']}")
    if len(data.get("questions", [])) != manifest["total_questions"]:
        fail(f"questions {len(data['questions'])} != manifest {manifest['total_questions']}")

    tax = {t["id"]: (t["subject_en"], t["subject_bn"]) for t in data.get("taxonomy", [])}
    if set(tax) != set(range(1, 11)):
        fail(f"taxonomy ids != 1..10: {sorted(tax)}")

    counts: dict[str, int] = {}
    blanks = []
    refs: set[str] = set()
    per_exam_seen: dict[str, set[int]] = {}
    for q in data["questions"]:
        slug = q.get("exam_slug", "")
        if not SLUG_RE.match(slug):
            fail(f"bad exam_slug {slug!r}")
        n = q.get("question_number")
        seen = per_exam_seen.setdefault(slug, set())
        if not isinstance(n, int) or n in seen:
            fail(f"bad/duplicate question_number {n!r} in {slug}")
        seen.add(n)
        counts[slug] = counts.get(slug, 0) + 1

        sid = q.get("subject_id")
        if sid not in tax or (q.get("subject_en"), q.get("subject_bn")) != tax[sid]:
            fail(f"taxonomy mismatch {slug} q{n}: sid={sid!r}")
        ca = q.get("correct_answer")
        if ca not in ("A", "B", "C", "D", ""):
            fail(f"bad correct_answer {ca!r} {slug} q{n}")
        if ca == "":
            blanks.append((slug, n))

        qp = q.get("question_image_paths", [])
        sp = q.get("solve_note_image_paths", [])
        if bool(q.get("question")) is False and not qp:
            fail(f"empty question text without question image {slug} q{n}")
        if not q.get("solve_note") and not sp:
            pass  # allowed: no solution in source (warning-level in dataset)
        if bool(q.get("has_question_image")) != bool(qp):
            fail(f"has_question_image mismatch {slug} q{n}")
        if bool(q.get("has_solve_note_image")) != bool(sp):
            fail(f"has_solve_note_image mismatch {slug} q{n}")
        if bool(q.get("has_image")) != bool(qp or sp):
            fail(f"has_image mismatch {slug} q{n}")
        refs.update(qp)
        refs.update(sp)

        blob = " ".join(str(q.get(k, "")) for k in
                        ("question", "option_a", "option_b", "option_c",
                         "option_d", "solve_note", "subject_en", "subject_bn"))
        if any(m in blob for m in MOJIBAKE):
            fail(f"mojibake in {slug} q{n}")

    for slug, exp in manifest["per_exam_counts"].items():
        if counts.get(slug, 0) != exp:
            fail(f"per-exam {slug}: {counts.get(slug, 0)} != manifest {exp}")
    for exam in data["exams"]:
        if exam["total_questions"] != counts.get(exam["slug"], 0):
            fail(f"exam.total_questions != len(questions) for {exam['slug']}")

    manifest_blanks = {(b["exam_slug"], b["question_number"]) for b in manifest["blank_correct_answers"]}
    if set(blanks) != manifest_blanks:
        fail(f"blank-answer set drifted: {sorted(set(blanks) ^ manifest_blanks)}")

    if refs != allow:
        fail(f"referenced paths != image_manifest.csv "
             f"(missing={sorted(allow - refs)[:3]} extra={sorted(refs - allow)[:3]})")
    if refs & orphans:
        fail(f"orphan referenced: {sorted(refs & orphans)[:3]}")
    print(f"VALIDATE OK: 41 exams, {len(data['questions'])} questions, "
          f"{len(refs)} refs == manifest, {len(blanks)} blanks, 0 mojibake")
    return data["questions"]


def db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        return url
    pw = os.environ.get("SUPABASE_DB_PASSWORD")
    if not pw:
        fail("set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD")
    # Supavisor session-mode pooler (db.* host may not resolve everywhere; keep ?options via env override)
    return (f"postgresql://postgres.{PROJECT_REF}:{pw}@"
            f"aws-0-ap-south-1.pooler.supabase.com:5432/postgres")


def seed_db(questions, exams):
    import psycopg  # noqa: PLC0415 (pip: scripts/requirements.txt)

    with psycopg.connect(db_url()) as conn:
        with conn.cursor() as cur:
            # exams upsert (subjects already seeded by migration 1)
            cur.executemany(
                """insert into exams (slug, title, exam_date, total_marks, set_code, total_questions)
                   values (%(slug)s, %(title)s, %(date)s, %(total_marks)s, %(set_code)s, %(total_questions)s)
                   on conflict (slug) do update set
                     title = excluded.title, exam_date = excluded.exam_date,
                     total_marks = excluded.total_marks, set_code = excluded.set_code,
                     total_questions = excluded.total_questions""",
                [dict(e, date=e.get("date") or None) for e in exams],
            )
            # questions upsert in chunks; capture ids for image rows
            for i in range(0, len(questions), CHUNK):
                batch = questions[i:i + CHUNK]
                cur.executemany(
                    """insert into questions
                       (exam_slug, question_number, subject_id, question,
                        option_a, option_b, option_c, option_d,
                        correct_answer, solve_note,
                        has_question_image, has_solve_note_image)
                       values (%(exam_slug)s, %(question_number)s, %(subject_id)s, %(question)s,
                               %(option_a)s, %(option_b)s, %(option_c)s, %(option_d)s,
                               %(correct_answer)s, %(solve_note)s,
                               %(has_question_image)s, %(has_solve_note_image)s)
                       on conflict (exam_slug, question_number) do update set
                         subject_id = excluded.subject_id, question = excluded.question,
                         option_a = excluded.option_a, option_b = excluded.option_b,
                         option_c = excluded.option_c, option_d = excluded.option_d,
                         correct_answer = excluded.correct_answer, solve_note = excluded.solve_note,
                         has_question_image = excluded.has_question_image,
                         has_solve_note_image = excluded.has_solve_note_image""",
                    [dict(
                        exam_slug=q["exam_slug"], question_number=q["question_number"],
                        subject_id=q["subject_id"], question=q.get("question", ""),
                        option_a=q.get("option_a", ""), option_b=q.get("option_b", ""),
                        option_c=q.get("option_c", ""), option_d=q.get("option_d", ""),
                        correct_answer=q.get("correct_answer") or None,  # '' -> NULL (8 defective rows)
                        solve_note=q.get("solve_note", ""),
                        has_question_image=bool(q.get("has_question_image")),
                        has_solve_note_image=bool(q.get("has_solve_note_image")),
                    ) for q in batch],
                )
            conn.commit()

            # image metadata rows (storage_path == local key 1:1; URLs deterministic)
            base = os.environ.get("SUPABASE_URL", f"https://{PROJECT_REF}.supabase.co").rstrip("/")
            rows = []
            for q in questions:
                cur.execute(
                    "select id from questions where exam_slug = %s and question_number = %s",
                    (q["exam_slug"], q["question_number"]),
                )
                qid = cur.fetchone()[0]
                for p in q.get("question_image_paths", []):
                    rows.append((qid, "question", p, f"{base}/storage/v1/object/public/{BUCKET}/{p}"))
                for p in q.get("solve_note_image_paths", []):
                    rows.append((qid, "solve", p, f"{base}/storage/v1/object/public/{BUCKET}/{p}"))
            for i in range(0, len(rows), CHUNK):
                cur.executemany(
                    """insert into question_images (question_id, image_type, storage_path, public_url)
                       values (%s, %s, %s, %s)
                       on conflict (question_id, storage_path) do update set
                         image_type = excluded.image_type, public_url = excluded.public_url""",
                    rows[i:i + CHUNK],
                )
            conn.commit()
            cur.execute("select count(*) from questions")
            nq = cur.fetchone()[0]
            cur.execute("select count(*) from question_images")
            ni = cur.fetchone()[0]
    print(f"DB SEED OK: questions={nq} image_rows={ni}")
    return nq, ni


def upload_images(allow, images_dir: Path):
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        fail("set SUPABASE_SERVICE_ROLE_KEY (Storage upload needs service_role)")
    base = os.environ.get("SUPABASE_URL", f"https://{PROJECT_REF}.supabase.co").rstrip("/")
    if not images_dir.is_dir():
        fail(f"images dir missing: {images_dir} (clone the dataset repo's images/)")

    ok, miss = 0, []
    for storage_key in sorted(allow):
        # storage_key is like images/10th_bcs/q6_img1.jpg; accept --images-dir
        # pointing at either the dataset repo root or its images/ dir.
        cands = [images_dir / storage_key,
                 images_dir / "/".join(storage_key.split("/")[-2:])]
        src = next((c for c in cands if c.is_file()), None)
        if src is None:
            miss.append(storage_key)
            continue
        ctype, _ = mimetypes.guess_type(src.name)
        req = urllib.request.Request(
            f"{base}/storage/v1/object/{BUCKET}/{storage_key}",
            data=src.read_bytes(),
            headers={"apikey": key, "Authorization": f"Bearer {key}",
                     "Content-Type": ctype or "application/octet-stream",
                     "x-upsert": "true", "Cache-Control": "public, max-age=31536000, immutable"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                ok += 1 if r.status in (200, 201) else 0
        except Exception as e:  # noqa: BLE001 — report and continue; rerun converges
            miss.append(f"{storage_key} :: {e}")
    print(f"UPLOAD DONE: ok={ok} missing/failed={len(miss)}")
    for m in miss[:10]:
        print(f"  MISS: {m}")
    if miss:
        raise SystemExit(2)


def main() -> None:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--validate-only", action="store_true")
    g.add_argument("--db-only", action="store_true")
    g.add_argument("--images-only", action="store_true")
    g.add_argument("--full", action="store_true",
                   help="validate + DB seed + binary upload (default when no mode given)")
    ap.add_argument("--images-dir", default="images",
                    help="dataset repo images/ dir (default: ./images)")
    args = ap.parse_args()
    if not (args.validate_only or args.db_only or args.images_only or args.full):
        args.full = True

    data, manifest, allow, orphans = load_inputs()
    questions = validate(data, manifest, allow, orphans)
    if args.validate_only:
        return
    if args.db_only or args.full:
        seed_db(questions, data["exams"])
    if args.images_only or args.full:
        upload_images(allow, ROOT / args.images_dir if not Path(args.images_dir).is_absolute()
                      else Path(args.images_dir))


if __name__ == "__main__":
    main()
