IMCC CareerHub — oversized Supabase token fix

IMPORTANT: This patch includes a SQL migration to remove base64 profile images from
Supabase Auth user metadata. The huge metadata is embedded in the JWT and can make
requests fail with REQUEST_HEADER_TOO_LARGE / HTTP 494.

Apply the migration:
1. Open Supabase Dashboard for project ifgbylqtaytvhkkpzlkw.
2. Open SQL Editor and create a new query.
3. Open fix-oversized-auth-token.sql from this folder, copy its full contents, and run it.
4. Sign out of CareerHub in all tabs, close them, reopen the deployed website, and sign in again.
5. Test loading published jobs and the Career Agent.

Then deploy the code from this folder to Vercel (or push the changes to your GitHub repo).
Do not paste or share access tokens, anon/publishable keys, service-role keys, or .env values.
The SQL script does not modify job listings or user passwords.
