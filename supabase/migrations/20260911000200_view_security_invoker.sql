-- BCS Console — migration 3/3: fix SECURITY DEFINER on v_questions_with_images
-- Advisor finding: view enforced owner's permissions/RLS instead of the querying
-- user's. On Postgres 15+ (this project: PG 17) the fix is security_invoker.
-- With security_invoker=true, anon/authenticated SELECTs on the view are checked
-- against the caller's rights on the underlying tables, which already have
-- public read-only RLS policies (migration 1). No policy change needed.

create or replace view v_questions_with_images with (security_invoker = true) as
select
  q.id, q.exam_slug, q.question_number, q.subject_id,
  s.subject_en, s.subject_bn,
  q.question, q.option_a, q.option_b, q.option_c, q.option_d,
  q.correct_answer, q.solve_note,
  q.has_question_image, q.has_solve_note_image, q.has_image,
  coalesce(array_agg(i.storage_path order by i.storage_path) filter (where i.image_type = 'question'), '{}') as question_image_paths,
  coalesce(array_agg(i.storage_path order by i.storage_path) filter (where i.image_type = 'solve'),    '{}') as solve_note_image_paths,
  coalesce(array_agg(i.public_url   order by i.storage_path) filter (where i.image_type = 'question'), '{}') as question_image_urls,
  coalesce(array_agg(i.public_url   order by i.storage_path) filter (where i.image_type = 'solve'),    '{}') as solve_note_image_urls
from questions q
join subjects s on s.id = q.subject_id
left join question_images i on i.question_id = q.id
group by q.id, s.subject_en, s.subject_bn;
