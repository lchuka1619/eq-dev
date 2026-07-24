# Supabase Auth setup

The application uses Supabase PKCE auth and exchanges the returned code at
`/auth/callback`.

## Supabase URL Configuration

In **Authentication → URL Configuration**:

- Set **Site URL** to the production application URL.
- Add `http://localhost:3000/auth/callback` for local development.
- Add the exact production callback, for example
  `https://your-domain.example/auth/callback`.
- If Vercel preview deployments need login, add an appropriate preview wildcard
  such as `https://*-team.vercel.app/**`. Prefer an exact callback URL for
  production.

If the callback URL is missing from this allow-list, Supabase ignores the
application's `redirectTo` value and sends the code to the configured Site URL.
The app has a fallback for a code returned to `/`, but the allow-list should
still be configured correctly.

## Google Cloud OAuth client

In the Google OAuth web client, keep this Supabase endpoint as the authorized
redirect URI:

`https://lgcrhhmlxdtkomcakwwc.supabase.co/auth/v1/callback`

Google returns to Supabase first. Supabase then redirects to the application
callback configured above.

## Environment

Browser-safe values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never expose the service-role or secret key through a `NEXT_PUBLIC_` variable.
