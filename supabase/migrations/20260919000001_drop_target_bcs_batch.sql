-- Drop target_bcs_batch column from public.profiles
alter table public.profiles drop column if exists target_bcs_batch;
