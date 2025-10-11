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

## Automated smoke tests

Local developers and CI share the same smoke harness that provisions a temporary SQLite database,
seeds the admin user, verifies the password hash, and exercises the critical API endpoints.

```bash
cd apps/backend
cp .env.test.example .env.test  # only needed the first time
pnpm test:smoke
```

The script output lists each check (`credentials login`, `health/auth`, `metrics/occupancy`, and
the protected `admin/sources` route). Any `FAIL` entry exits with a non-zero status.

For a quick manual probe, grab a JWT with the helper script and then list the admin sources:

```bash
./scripts/curl-auth.sh
# Copy the access_token value
./scripts/curl-sources.sh http://localhost:4001 "<paste token here>"
```

The GitHub Action **Smoke (Auth + API)** runs on every push and pull request. When it fails, open
the workflow run → the failing job → the "Upload logs on failure" artifact for `backend.out` / `frontend.out`
and the summarized smoke output.

To probe the production deployment on Render, call the live auth endpoint directly:

```bash
curl -i -X POST https://api.astalla.com/auth/basic-login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@astalla.com","password":"Astalla2025!"}'
```

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
