-- Atomic wrong-answer counter for the mistake bank (ভুলসমূহ).
-- The client used to upsert user_mistakes with a plain insert, which never
-- incremented wrong_count (every row stayed at its default of 1). This RPC
-- increments exactly once per fresh wrong answer, race-free.

create or replace function public.record_mistakes(p_question_ids bigint[])
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.user_mistakes (user_id, question_id, wrong_count, last_wrong_at, is_resolved)
  select auth.uid(), q, 1, now(), false
  from unnest(p_question_ids) as q
  where auth.uid() is not null
  on conflict (user_id, question_id) do update
    set wrong_count   = public.user_mistakes.wrong_count + 1,
        last_wrong_at = now(),
        is_resolved   = false;
$$;

revoke all on function public.record_mistakes(bigint[]) from public;
revoke all on function public.record_mistakes(bigint[]) from anon;
grant execute on function public.record_mistakes(bigint[]) to authenticated;