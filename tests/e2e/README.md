# Auth end-to-end suite

Covers the email-verification rules end to end against the running dev server
and the real Lovable Cloud project.

Run:

```bash
bun run test:e2e
```

Requirements: the app running on `http://localhost:8080` (override with
`E2E_APP_URL`), `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (read from `.env`)
and `SUPABASE_SERVICE_ROLE_KEY` in the environment. Test accounts are created
with unique `@example.com` addresses and deleted afterwards.

What is covered:

- signup shows the "check your email" state and creates no session
- unverified password sign-in is refused by the auth API and by the login form,
  which shows the verification message plus a resend action
- resend verification email
- deep links, refresh and back navigation to every protected route while signed
  out land on `/auth`
- a session whose email is unverified is redirected to `/verify-email` for every
  protected route (deep link, refresh, history) and makes zero successful
  protected server-function calls
- data API rejects anonymous and bogus-token requests
- verified login reaches the dashboard, bootstraps a readable workspace, opens
  every protected route with no rejected server-function calls, and sign-out
  re-locks the app

Note: Supabase never issues a session for an unverified account, so the
unverified-session case pins `GET /auth/v1/user` to an unverified response for
that browser context; the route gate, router and server-function traffic under
test are real.
