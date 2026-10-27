# IMCC Career Agent — structure and setup

## Recommended model

Use **`openai/gpt-oss-120b` on Groq** as the primary model. This project already uses Groq's OpenAI-compatible chat-completions endpoint and function calling, and the agent needs to reason about student profiles, search job data, and return structured recommendations. Groq currently lists GPT-OSS 120B as a production model with tool-use support. Use **`openai/gpt-oss-20b`** as the lower-cost/fallback option if you want to prioritize speed and budget over harder reasoning tasks.

Set these in **Vercel → Project → Settings → Environment Variables**:
- `GROQ_API_KEY` — required; create it in the Groq console. Never place it in HTML, `supabase-config.js`, or Git.
- `GROQ_MODEL` — optional; `openai/gpt-oss-120b`
- `GROQ_FALLBACK_MODEL` — optional; `openai/gpt-oss-20b`
- `ALLOWED_ORIGINS` — optional comma-separated list of additional exact origins if you use a custom domain.

After adding or changing environment variables, redeploy the Vercel project.

## Agent architecture

```mermaid
flowchart TD
    A[Student / Alumni] --> B[IMCC Career Hub UI]
    B --> C[Supabase Auth]
    B --> D[POST /api/career-agent]
    C -->|access token| D
    D --> E[Validate request and rate limit]
    E --> F{Feature mode}
    F -->|chat / recommendations| G[Career Agent tool loop]
    G --> H[search_jobs tool]
    H --> I[Current job feed from UI]
    H --> G
    G --> J[Validated recommendations]
    F -->|profile-feedback| K[Strengths and improvements]
    J --> O[Render results safely in UI]
    K --> O
```

## Suggested modules and responsibilities

1. **Frontend (`index.html`, `styles.css`)**
   - Collect the user's career question.
   - Maintain a short chat transcript and send follow-up history with the current question, selected job feed, and minimal profile data to the API.
   - Render AI output using DOM `textContent` rather than interpreting generated HTML.
   - Keep employer application links as the source of truth.

2. **API gateway (`api/career-agent.js`)**
   - Check HTTP method and request origin.
   - Require a valid institutional Supabase session for profile-based tools.
   - Apply request limits and timeouts.
   - Keep the Groq key on the server only.
   - Limit and sanitize prompts, profile fields, job descriptions, and AI output.

3. **Job search tool (`search_jobs`)**
   - Filter the supplied job feed by role keywords, category, and location.
   - Return only real listings from the feed.
   - The model may explain matches but must not invent vacancies, employers, salaries, or requirements.

4. **Career features**
   - **Career chat / job recommendations:** understand the question, search current openings, explain fit, suggest skills to build, and use recent messages for follow-up questions.
   - **Job cards:** provide employer application links and application tracking.
   - **Profile feedback:** return strengths and improvement suggestions.

5. **Data layer (Supabase)**
   - Use Supabase Auth for identity and the existing database for profiles/jobs.
   - For production, prefer querying published jobs server-side instead of trusting a job list supplied by the browser.
   - Keep RLS enabled. Never put the Supabase `service_role` key in browser code.

## Admin access

Admins use the same institutional Google sign-in as other users. After Supabase verifies the account's `user_roles` entry, the app automatically opens the admin dashboard; regular users go to the marketplace.

To grant admin access, have the person sign in once, then run this in the Supabase SQL Editor with their institutional email:

```sql
do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where lower(email) = lower('admin@imcc.edu.ph');

  if admin_user_id is null then
    raise exception 'No Supabase user found for that email. Sign in with Google first.';
  end if;

  perform public.set_app_role(admin_user_id, 'admin'::public.app_role);
end;
$$;
```

The user may need to sign out and sign in again for the role change to take effect. Grant roles only through the SQL Editor; never expose the service-role key to the browser.

## What was fixed in this project copy

- Kept profile feedback as the only separate AI mode alongside career chat and job recommendations.
- Applied shared rate limiting to all AI modes and required a verified Supabase user for profile-based tools.
- Fixed the build script: it no longer references a missing `flowise-widget.js`; it copies the actual static assets to `public/`.
- Connected `npm run build` to the build script and configured Vercel's static output directory as `public/`.

## Deploy checklist

1. Add `GROQ_API_KEY` in Vercel Environment Variables for **Production**, and Preview too if you test preview deployments.
2. Confirm `GROQ_MODEL=openai/gpt-oss-120b` and `GROQ_FALLBACK_MODEL=openai/gpt-oss-20b` (optional; defaults already exist in the API).
3. Commit and push the project changes.
4. Redeploy on Vercel.
5. Test the career chat while signed in with an `@imcc.edu.ph` account:
   - Ask Career AI for jobs by course, skills, or location, then ask a follow-up.
   - Use a quick question and start a new chat.
   - Confirm job cards retain Apply Now and Mark as applied, without extra AI action buttons.
   - Request profile feedback.
6. Test an invalid request and confirm the UI displays a friendly error. Do not test by pasting the API key into browser code.

## Important limitations

- The current job-search tool searches only the jobs sent by the frontend. It is not a live web crawler and cannot guarantee listings are still open.
- The rate limiter is in-memory per serverless instance, so it is best-effort. Use a shared store (for example, Redis/Upstash) for strict production limits.
- AI output is advisory, not a hiring decision. Users should verify each posting and application link with the employer.
