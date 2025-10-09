# Astalla Dashboard Monorepo

A Vercel + Render friendly monorepo that powers a property performance dashboard. The frontend is a Next.js 14 application and the backend is a NestJS API backed by Prisma/Postgres with BullMQ-driven jobs. Shared API contracts live in a workspace package so both apps stay in sync.

## Monorepo layout

```
apps/
  frontend/   # Next.js 14 App Router UI (shadcn/ui, Tailwind, React Query, NextAuth)
  backend/    # NestJS REST API with Prisma + BullMQ jobs
packages/
  shared/     # Zod schemas and shared TypeScript types
```

## Prerequisites

- Node.js 18+
- pnpm 10+
- Docker (for local Postgres + Redis)

## Environment variables

Copy `.env.example` to `.env` in the repo root and adjust the placeholders as needed. All traffic between the apps flows through `NEXT_PUBLIC_API_BASE_URL`, so make sure it always points at a reachable backend URL (Render in production, `http://localhost:3001` in local development). The value is consumed by both browser and server components in the Next.js app, so leaving it unset will break sign-in flows and server-side rendering.

### Shared

- `NEXT_PUBLIC_API_BASE_URL` – Base URL for the Nest API. Required in every environment (including local dev when running via `pnpm dev`).
- `DEV_MOCKS` – Opt-in flag for developer mocks. Defaults to `false`; set to `true` only when you intentionally want MSW/sample data.

### Frontend (`apps/frontend`)

- `NEXTAUTH_URL` – Public URL for the Next.js app (used by NextAuth callbacks).
- `NEXTAUTH_SECRET` – Secret for NextAuth session encryption.
- `BASIC_AUTH_USERNAME`/`BASIC_AUTH_EMAIL`/`BASIC_AUTH_PASSWORD`/`BASIC_AUTH_NAME` – Optional legacy basic-auth credentials.
- `NEXT_PUBLIC_MAIN_HOST` – Optional marketing host override (defaults to `astalla.com`).
- `NEXT_PUBLIC_DATA_PERSISTENCE` – Set to `false` to disable client-side persistence for tables.

### Backend (`apps/backend`)

- `PORT` – API port (defaults to `3001`).
- `DATABASE_URL` – Postgres connection string for Prisma.
- `REDIS_URL` – Redis connection for BullMQ jobs (optional in local dev when Docker Compose is running).
- `FRONTEND_ORIGIN` – Comma-separated list of allowed web origins. Include production and preview URLs, for example `https://app.astalla.com,https://*.vercel.app`.
- `DEV_MOCKS` – Matches the shared flag; enables sample data providers when `true`.
- `ADMIN_DEV_BYPASS` – Defaults to `false`. When `true`, allows the configured admin email to bypass password verification (intended for emergency lockout recovery only).
- `ADMIN_DEV_EMAIL` – Email address eligible for the admin bypass. Defaults to the seeded admin account (`admin@astalla.com`).

## Local development

1. Start infrastructure services:

   ```bash
   docker compose up -d
   ```

2. Install dependencies (workspace-aware):

   ```bash
   pnpm install
   ```

3. Run Prisma migrations for the backend:

   ```bash
   pnpm --filter apps/backend prisma migrate dev
   ```

4. Launch both apps with a single command:

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Smoke test

Run the workspace-wide smoke script to sanity check a running backend instance. The script retries for up to 30 seconds by default and exits with a non-zero status if any endpoint fails.

```bash
API_BASE=http://localhost:3001 pnpm smoke
```

Set `SMOKE_TIMEOUT` (milliseconds) to customise the retry window. For remote environments, point `API_BASE` at the deployed backend URL instead of localhost.

## Developer mocks

Mock integrations are disabled by default so preview and production environments always talk to real providers. For local development you can still flip the switch by setting `DEV_MOCKS=true` (the Next.js build picks this up automatically). That activates MSW-powered mocks in the UI and the sample data providers in the API. Leave the flag unset or `false` in any hosted environment.

## Theming & contrast

The frontend now exposes design tokens backed by CSS variables and Tailwind theme entries to keep light and dark palettes in sync with Radix color scales. You can tune the appearance by editing `apps/frontend/app/globals.css`:

- `--bg`, `--panel`, `--card`, and `--card-contrast` control surface layers.
- `--border` and `--ring` set border and focus accents.
- `--muted`/`--muted-foreground` target subtle backgrounds and text.
- `--accent`/`--accent-contrast` define the primary action hue.

Tailwind aliases (for example `bg-card`, `text-muted-foreground`, and `ring-ring`) resolve to these tokens, so updating the CSS variables automatically lifts every component. To change the default theme, override `NEXT_PUBLIC_THEME_DEFAULT` in `.env`; to disable persisted table layout, set `NEXT_PUBLIC_DATA_PERSISTENCE=false`.

## Tables (preview)

The backend schema now includes the foundation for a spreadsheet-inspired "Tables" workspace. New Prisma models capture tables, typed columns, row data, cells, and user-specific saved views. The feature is under active construction; upcoming commits will add REST endpoints, formula evaluation, CSV workflows, and the editable grid UI powered by TanStack Table.

| Model         | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `Table`       | Owns table metadata (name, owning org, timestamps).                     |
| `TableColumn` | Tracks typed columns, including lookup and formula expressions.         |
| `TableRow`    | Stores row ordering and creation metadata for each table.               |
| `TableCell`   | Persists typed JSON values per row/column intersection.                 |
| `TableView`   | Saves per-user layout state (visible columns, filters, sorts, etc.).    |

Once the API layer and frontend are wired up, you'll be able to create tables, mix column types, link records across tables, and persist personalised views. Formula support will be backed by HyperFormula so expressions like `=IF([Status]="At risk",1,0)` and `=LOOKUP("Properties","Name",[Property],"Monthly cost")` compute consistently on the server.

## Deployment

### Frontend (Vercel)

1. Connect the repository to Vercel.
2. Set the project root to `apps/frontend`.
3. Configure environment variables. Example production values:
   - `NEXTAUTH_URL=https://app.astalla.com`
   - `NEXTAUTH_SECRET=<generate a strong secret>`
   - `BASIC_AUTH_USERNAME=<optional legacy basic-auth username>`
   - `BASIC_AUTH_EMAIL=<optional legacy basic-auth email>`
   - `BASIC_AUTH_PASSWORD=<optional legacy basic-auth password>`
   - `BASIC_AUTH_NAME=<optional display name>`
   - `NEXT_PUBLIC_API_BASE_URL=https://api.astalla.com` (point at the Render backend; update preview environments with their API URL)
   - Leave `DEV_MOCKS` unset (or `false`) outside of local development so real integrations stay active.
4. Trigger a build—Vercel will install dependencies with pnpm automatically.

### Backend (Render)

1. Create a new Render Web Service pointing to `apps/backend`.
2. Set the build command to `pnpm install && pnpm --filter apps-backend build`.
3. Set the start command to `pnpm --filter apps-backend start`.
4. Provision a Postgres instance and Redis (or supply external connection strings) and expose them via `DATABASE_URL` and `REDIS_URL` env vars. Set `FRONTEND_ORIGIN` to the comma-separated list of allowed web origins—for production use `FRONTEND_ORIGIN="https://app.astalla.com,https://*.vercel.app"` so the API accepts both the primary app and Vercel preview deployments.

> For preview environments, be sure to share the backend URL with the frontend via `NEXT_PUBLIC_API_BASE_URL` and `NEXTAUTH_URL`. Without `NEXT_PUBLIC_API_BASE_URL`, server-side code in the frontend cannot contact the API.

## CI

Pull requests trigger a GitHub Actions workflow that installs dependencies and runs:

- `pnpm -w typecheck`
- `pnpm -w lint`
- `pnpm -w build`
- `pnpm -C apps/backend prisma format`
- `pnpm -C apps/backend prisma validate`
- `pnpm -C apps/backend prisma generate`
- `pnpm smoke` against a locally started backend (Postgres is provided via a service container)

The pipeline fails on type errors, lint violations, Prisma schema issues, build regressions, or smoke check failures.
