# Frontend (Next.js)

This app is deployed to Vercel at `https://app.astalla.com` and authenticates through the Render API.

## Required environment variables (Vercel)

| Variable | Notes |
| --- | --- |
| `NEXTAUTH_URL` | Set to `https://app.astalla.com` in production. Preview deploys should use their preview URL. |
| `NEXTAUTH_SECRET` | Random 32+ character string. Must stay in sync with the backend `JWT_SECRET`. |
| `NEXT_PUBLIC_API_BASE_URL` | Public URL for the backend API (`https://api.astalla.com`). |
| `FRONTEND_ORIGIN` | Mirror the production origin so the backend CORS policy accepts requests. |

### Optional variables

| Variable | Notes |
| --- | --- |
| `ADMIN_TEST_LOGIN_ENABLED` | Set to `true` to display the “Test login as admin” button in production. Enabled automatically in development. |
| `ADMIN_TEST_LOGIN_EMAIL` | Override the seeded admin email for diagnostics (defaults to `admin@astalla.com`). |
| `ADMIN_TEST_LOGIN_PASSWORD` | Override the seeded admin password for diagnostics (defaults to `Astalla2025!`). |
| `API_BASE_URL` / `BACKEND_API_BASE_URL` | Server-only overrides for the backend URL. Defaults to `NEXT_PUBLIC_API_BASE_URL`. |

## Auth flow overview

* The sign-in form posts `identifier` and `password` to NextAuth’s credentials provider.
* NextAuth calls `POST ${NEXT_PUBLIC_API_BASE_URL}/auth/basic-login`.
* A successful response returns `{ access_token, user }` and is stored on the session (`session.accessToken`, `session.user.email`, `session.user.role`).
* `/auth/basic-login` returns HTTP 401 on invalid credentials; NextAuth treats this as `CredentialsSignin` and the UI displays a friendly error message.

## Diagnostics

Visit `/admin/diagnostics` (requires `ORG_ADMIN`) to view:

* The raw payload from `GET ${NEXT_PUBLIC_API_BASE_URL}/health/auth`.
* Optional “Test login as admin” button (disabled in production unless `ADMIN_TEST_LOGIN_ENABLED=true`). This button triggers a server-side request to `/auth/basic-login` using the seeded admin credentials.

## Local development

```bash
pnpm -w i
pnpm dev # from apps/frontend
```

Ensure `NEXT_PUBLIC_API_BASE_URL` points to your local backend (default `http://localhost:3001`).

## Useful curl commands

```bash
curl -i -X POST "$NEXT_PUBLIC_API_BASE_URL/auth/basic-login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@astalla.com","password":"Astalla2025!"}'
```

Expect a 200 response with `{ "access_token": "...", "user": { ... } }`.
