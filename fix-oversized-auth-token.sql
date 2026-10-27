-- IMCC CareerHub: fix oversized Supabase Auth JWTs
-- Run this once in Supabase Dashboard > SQL Editor.
-- It removes base64 profile photos from Auth user metadata, which is embedded
-- in access tokens and can cause REQUEST_HEADER_TOO_LARGE / HTTP 494 errors.

begin;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'photo_data_url'
where coalesce(raw_user_meta_data, '{}'::jsonb) ? 'photo_data_url';

-- Remove only oversized base64 images from profile rows; leave ordinary URLs/data alone.
update public.profiles
set photo_data_url = null,
    updated_at = now()
where photo_data_url like 'data:image/%;base64,%'
  and octet_length(photo_data_url) > 200000;

commit;

-- After running this script:
-- 1. Sign out of CareerHub in every tab.
-- 2. Close old CareerHub tabs, reopen the deployed site, and sign in again.
-- 3. Test jobs and the Career Agent.
