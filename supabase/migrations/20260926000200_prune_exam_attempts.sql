-- BCS Console - exam history retention
-- Keep only the newest 50 exam_attempts per (user_id, exam_type) so the results
-- history cannot grow without bound. attempt_answers rows are removed
-- automatically (FK ON DELETE CASCADE).

create or replace function public.prune_exam_attempts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.exam_attempts
  where id in (
    select id
    from public.exam_attempts
    where user_id = new.user_id
      and exam_type = new.exam_type
    order by created_at desc, id desc
    offset 50
  );
  return null;
end;
$$;

comment on function public.prune_exam_attempts() is
  'AFTER INSERT trigger: retains only the newest 50 exam_attempts per (user_id, exam_type).';

drop trigger if exists trg_prune_exam_attempts on public.exam_attempts;
create trigger trg_prune_exam_attempts
  after insert on public.exam_attempts
  for each row execute function public.prune_exam_attempts();

revoke all on function public.prune_exam_attempts() from public, anon, authenticated;

-- One-time cleanup: enforce the cap for rows inserted before the trigger existed.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, exam_type
           order by created_at desc, id desc
         ) as rn
  from public.exam_attempts
)
delete from public.exam_attempts a
using ranked r
where a.id = r.id
  and r.rn > 50;
