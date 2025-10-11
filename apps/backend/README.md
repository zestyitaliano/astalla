# Backend (NestJS + Prisma)

This service powers Astalla's API. The production deployment runs on Render at `https://api.astalla.com`.

## Environment variables (Render)

Set the following keys in the Render **Environment** panel before deploying:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Render Postgres connection string. Append `?sslmode=require` if Render is enforcing SSL. |
| `JWT_SECRET` | ✅ | 32+ character random hex string used to sign access tokens. |
| `ENCRYPTION_KEY` | ✅ | Base64-encoded 32 byte key for AES-256 payload encryption. |
| `FRONTEND_ORIGIN` | ✅ | Comma-separated list of allowed web origins. For production use `https://app.astalla.com`. |
| `CORS_ORIGIN` | ✅ | Keep in sync with `FRONTEND_ORIGIN`. |
| `REDIS_URL` | ⚠️ Optional | When omitted, background jobs are disabled gracefully. |
| `ADMIN_TEST_LOGIN_EMAIL` | ⚠️ Optional | Overrides the seeded admin email for diagnostics. Defaults to `admin@astalla.com`. |
| `ADMIN_TEST_LOGIN_PASSWORD` | ⚠️ Optional | Overrides the seeded admin password for diagnostics. Defaults to `Astalla2025!`. |
| `ADMIN_TEST_LOGIN_ENABLED` | ⚠️ Optional | Set to `true` to enable the admin login smoke button in production. |

## Local setup

```bash
pnpm -w i
pnpm -C packages/shared build
pnpm -C apps/backend prisma generate
```

Provide a Postgres URL via `DATABASE_URL` (see `docker-compose.yml` for a local stack).

## Deploying migrations and seed data

The backend exposes helper scripts to deploy migrations and seed the required admin account.

```bash
pnpm -C apps/backend db:deploy-and-seed
```

Render postdeploy command:

```
pnpm -C apps/backend db:deploy-and-seed
```

### Seeded admin

* Email: `admin@astalla.com`
* Password: `Astalla2025!`
* Role: `ORG_ADMIN`

The seed script always updates the password hash and logs `Seeded admin user: ... passwordValid=true` upon success.

## Smoke test

Use the lightweight smoke test to confirm password validity against the database:

```bash
pnpm -C apps/backend smoke:auth
```

The script prints `passwordValid=true` when the stored hash matches the expected admin password.

## Health & diagnostics

`GET /health/auth` returns a JSON payload summarizing auth readiness:

```json
{
  "db": "ok",
  "seedAdminExists": true,
  "bcryptModule": "bcryptjs",
  "env": {
    "hasJwtSecret": true,
    "hasEncryptionKey": true
  }
}
```

Use this endpoint from the frontend diagnostics page (`/admin/diagnostics`) to verify production status.
