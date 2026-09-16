-- BCS Console — storage migration 2/2
-- Public bucket bcs-images (keys 1:1 with local paths, e.g. images/10th_bcs/q6_img1.jpg).
-- Upload list: image_manifest.csv (799 keys). The 9 orphans in
-- dataset_manifest.json → orphan_images_ignored are never uploaded.
-- Writes go through the service_role key (bypasses RLS); anon/authenticated get SELECT only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bcs-images', 'bcs-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Advisor fix (migration 4): NO select policy on storage.objects. Public buckets
-- serve direct object URLs with no RLS check, and the app uses only deterministic
-- public URLs from question_images (never the list API), so a SELECT policy would
-- only expose LIST to anon/authenticated for no benefit. service_role bypasses RLS
-- and can still list for ops. If listing is ever needed, re-add a PREFIX-scoped
-- policy instead of a bucket-wide one.
drop policy if exists "public read bcs-images" on storage.objects;
