-- BCS Console — migration 4/4: resolve Supabase advisor findings
--
-- (1) Extension pg_trgm lived in public → moved to the extensions schema.
--     Existing GIN indexes keep working (bound by OID, not schema); fresh installs
--     create it directly in extensions (see migration 1).
--
-- (2) storage.objects SELECT policy "public read bcs-images" let anon/authenticated
--     clients LIST every file in the bucket. Dropped: public buckets serve direct
--     object URLs with no RLS check, and the app uses only deterministic public URLs
--     from question_images (never the list API), so the policy only exposed listing
--     for no benefit. service_role bypasses RLS and can still list for ops.

create schema if not exists extensions;

alter extension pg_trgm set schema extensions;

drop policy if exists "public read bcs-images" on storage.objects;
