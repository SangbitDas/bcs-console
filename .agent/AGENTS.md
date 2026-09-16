# BCS → Supabase Migration — Agent Instructions

> Scope: migrate the BCS Preliminary Question Bank (10th–50th) from local JSON
> into Supabase Postgres + Storage. This file is the migration authority.
> Extraction/scraping docs under `dataset/` are reference-only — do not re-scrape,
> do not re-run any pipeline.

## 1. Repo map (pruned for migration — what stayed and why)

```
dataset/bcs_preliminary_question_bank.json  # CANONICAL seed source (merged, 41 exams)
dataset/data/processed/json/*_bcs.json      # 41 per-exam JSONs — dump fallback / diffing only
dataset/schema.md                           # Schema spec + validation checklist (type source of truth)
dataset/topics_taxonomy.md                  # Ground-truth subjects, IDs 1..10 (NEVER rename)
dataset/.agent/AGENTS.md                    # Extraction JSON-shape rules (reference for field semantics)
dataset/instructions/memory.md              # WHY some rows are blank / image-only (provenance, read §2-relevant parts only)
dataset/README.md                           # Dataset overview + quick-start
dataset/DATA_LICENSE.md                     # Dataset is NOT MIT — read before publishing
dataset/LICENSE                             # MIT — covers tooling/code you write, NOT question data
dataset_manifest.json                       # Machine-verified counts (2026-09-10) — OVERRIDES stale counts elsewhere
image_manifest.csv                          # 799 referenced image storage keys (upload list, 1:1 local→bucket)
SUPABASE_AGENT_BRIEF.md                     # Migration task brief (schema/RLS/seed/storage/API/admin)
```

Removed before migration (do not resurrect): `dataset/pipeline/*.py`
(extraction tooling — seed will be a NEW `supabase/` + `scripts/seed.*`),
`dataset/instructions/PROMPT_FOR_CLAUDE_CODEX_SUPABASE.md`
(STALE: says 5,320 q / 17th:70 / 825 images — predates 17th 70→100 re-scrape),
`dataset/instructions/links_to_scrape.md` (scrape provenance),
`dataset/instructions/Manual_Instructions.txt` (already applied; summarized in `memory.md`).

## 2. Verified facts (trust `dataset_manifest.json` + this file over stale docs)

- **41 exams (10th–50th), 5,350 questions.** Per-exam:
  `10th:100, 11st:100, 12nd:100, 13rd:100, 14th:100, 15th:100, 16th:100, 17th:100,
  18th:100, 19th:50, 20th:100, 21st:100, 22nd:100, 23rd:100, 24th:100, 25th:100,
  26th:200, 27th:100, 28th:100, 29th:100, 30th:100, 31st:100, 32nd:100, 33rd:100,
  34th:100, 35th:200, 36th:200, 37th:200, 38th:200, 39th:100, 40th:200, 41st:200,
  42nd:100, 43rd:200, 44th:200, 45th:200, 46th:200, 47th:200, 48th:100, 49th:100, 50th:200`
- Subject distribution: `1:1008, 2:977, 3:831, 4:747, 8:564, 6:517, 9:214, 7:201, 5:165, 10:126`
- **766 questions have `has_image=1`; 799 referenced image paths.**
  (`dataset/schema.md` / `README.md` saying 825/790 are stale — trust the manifest.)
- **8 rows have blank `correct_answer` (defective source — DO NOT invent):**
  `25th q65, 26th q91, 34th q100, 36th q113, 36th q120, 38th q83, 39th q76, 47th q110`.
- Every question carries `exam_slug` matching `^\d+(st|nd|rd|th)_bcs$` and its file stem.
  Merged DB sorted by `(exam_num, question_number)`. Encoding: UTF-8 Bangla+English, mojibake repaired.
- **Image binaries are vendored in this repo at `dataset/images/`**
  (`images/<exam_slug>/q<N>_img<K>.(jpg|png)`, 808 files, ~14.8 MB, copied
  2026-09-11 from the dataset repo). Seed reads them via `--images-dir dataset/images`
  (see `IMAGES_DIR` in `.env`), upload list is `image_manifest.csv` (799 keys).
  SKIP the 9 orphans in `dataset_manifest.json → orphan_images_ignored` (present on
  disk, never uploaded). QUESTION DATA + IMAGES stay third-party copyright per
  `dataset/DATA_LICENSE.md` — Storage `bcs-images` is the runtime source of truth.

## 3. Canonical JSON shape (seed reads this — see `dataset/schema.md` §4)

Per-exam top level: `{ exam: {title, date YYYY-MM-DD, total_marks, set_code, total_questions}, taxonomy: [10], questions: [...] }`.
Merged DB: `{ metadata, taxonomy: [10], exams: [{slug,title,date,total_marks,set_code,total_questions,actual_questions} × 41], questions: [5350] }`.

Question row keys (order canonical, all 17 required):

| Key | Type | Rule |
|---|---|---|
| `question_number` | int | `1..N`, unique per `exam_slug`, sequential |
| `subject_id` | int 1..10 | FK → taxonomy; `subject_en/bn` MUST match it |
| `question` | text | `""` allowed ONLY if `question_image_paths` non-empty |
| `option_a..d` | text | keep empty-string handling (option images unextracted) |
| `correct_answer` | `A/B/C/D` or `""` | blank = the 8 defective rows (§2); store NULL or `""`, document, never coalesce |
| `solve_note` | text | `""` allowed ONLY if `solve_note_image_paths` non-empty |
| `question_image_paths` / `solve_note_image_paths` | text[] | `images/<exam_slug>/q<N>_img<K>.(jpg\|png)`; single per-question index, question scope first |
| `has_question_image` / `has_solve_note_image` / `has_image` | 0/1 | MUST equal array emptiness (`has_image` = OR) |
| `subject_en` / `subject_bn` | text | denormalized, must match `subject_id` per `topics_taxonomy.md` |
| `exam_slug` | string | file stem, e.g. `17th_bcs` |

Taxonomy IDs 1..10 are fixed (`dataset/topics_taxonomy.md`): 1 Bangla, 2 English,
3 Bangladesh Affairs, 4 International Affairs, 5 Geography/Environment/Disaster,
6 General Science, 7 Computer & IT, 8 Mathematical Reasoning, 9 Mental Ability,
10 Ethics/Values/Governance.

## 4. Supabase build (your job — details in `SUPABASE_AGENT_BRIEF.md` §3)

1. **Schema** (`supabase/migrations/*.sql`): `subjects` (10 fixed rows) → `exams`
   (slug PK or id+unique slug, title, date, total_marks, set_code, total_questions) →
   `questions` (exam FK, question_number, subject FK, question/option_a..d/solve_note TEXT,
   correct_answer NULLABLE char(1) + check, image path columns or normalized
   `question_images` table, `has_*` booleans/generated, `search_vector` for Bangla+English FTS).
   Unique `(exam_id, question_number)`. Indexes: `(exam_id, question_number)`,
   `(subject_id)`, `(has_image)`, FTS GIN.
2. **RLS:** anon `SELECT` on exams/questions/images; writes `service_role` only
   (extensible later for bookmarks/progress).
3. **Seed (idempotent)** e.g. `scripts/seed.*`: read
   `dataset/bcs_preliminary_question_bank.json`, upload `images/` → Storage bucket
   (e.g. `bcs-images/<exam_slug>/q<N>_img<K>.ext`, public read + cache headers) using
   `image_manifest.csv` as upload list, insert rows with storage/public URLs.
   Chunk inserts; re-run safe; validate `exam.total_questions == len(questions)` and every referenced path exists.
4. **Storage:** default Supabase Storage (same project, RLS, CDN); compare vs R2/S3 in design doc.
   Images are paths/URLs in DB, NEVER base64.
5. **API:** PostgREST examples — list exams, filter `?exam_slug=&subject_id=&has_image=`,
   FTS search, fetch one question with images, pagination.
6. **Admin flow:** 51st BCS = new per-exam JSON + images → same seed script, no downtime.
   Keep per-exam JSONs as dump fallback + Supabase PITR.

## 5. Hard constraints (do not violate)

- Taxonomy IDs/names immutable; `subject_en/bn` must match `subject_id`.
- Blank-`correct_answer` semantics (§2): keep 8 rows blank, never fill.
- `question`/`solve_note` empty ONLY with non-empty respective image array; flags MUST equal array emptiness.
- DB UTF8; Bangla stays real Unicode. No `question_html`, no generic `image_paths`.
- Read-heavy design; admin writes only.
- **Licensing:** code you write = your license; QUESTION DATA + IMAGES stay under
  `dataset/DATA_LICENSE.md` (third-party copyright: uttoron.academy/PSC; educational/research
  basis, no paid-republish without rights-holder permission, takedown on request).
  Attribute dataset repo + original source in the app.
- **Stale-doc trap:** `dataset/schema.md` counts (825 images, old distribution) and any doc
  saying 5,320 questions / 17th:70 are superseded by `dataset_manifest.json` (2026-09-10).

## 6. Validation (must pass before calling migration done)

- Pre-seed: merged JSON parses UTF-8; 41 exams / 5,350 questions; per-exam counts match §2;
  `question_number` sequential per exam; taxonomy match; no mojibake (`à¦, à§, â€, Â, �`);
  flags match arrays; `exam_slug` matches stem + pattern.
- Post-seed: row counts per exam match manifest; the 8 blank-answer rows still blank;
  every `image_manifest.csv` key uploaded and resolvable from DB; spot-check Bangla rendering
  and an image question + an image-only solve.
- Run advisors (`supabase db advisors` / MCP `get_advisors`) after schema changes and fix findings.

## 7. Read order for a new agent

`SUPABASE_AGENT_BRIEF.md` → this file → `dataset/schema.md` →
`dataset/topics_taxonomy.md` → `dataset/.agent/AGENTS.md` (field semantics) →
`dataset/instructions/memory.md` (defect/image-only provenance) →
`dataset_manifest.json` + `image_manifest.csv`.
