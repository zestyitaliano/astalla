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

 codex/update-apibaseurl-for-production-cx751h
Copy `.env.example` to `.env` in the repo root and adjust the basic auth credentials as needed. The frontend's basic-auth flow accepts either the configured credentials or accounts created through the `/register` page backed by the Nest API. `NEXT_PUBLIC_API_BASE_URL` must point to the backend API for server-side flows (such as NextAuth) and must always be set in hosted environments. During local development the browser can fall back to `window.location.origin`, but only when the app is loaded from a localhost hostname; the Next.js server process still requires an explicit value. Hosted builds automatically refuse localhost targets and fall back to `NEXTAUTH_URL`/`VERCEL_URL` so requests remain reachable, but you should still configure a deployable backend URL. Configure `DATABASE_URL` so the backend can persist accounts created through the UI.

 codex/update-apibaseurl-for-production-2i1kks
Copy `.env.example` to `.env` in the repo root and adjust the basic auth credentials as needed. The frontend's basic-auth flow accepts either the configured credentials or accounts created through the `/register` page backed by the Nest API. `NEXT_PUBLIC_API_BASE_URL` must point to the backend API for server-side flows (such as NextAuth) and must always be set in hosted environments. During local development the browser can fall back to `window.location.origin`, but only when the app is loaded from a localhost hostname; the Next.js server process still requires an explicit value. Hosted builds automatically refuse localhost targets and fall back to `NEXTAUTH_URL`/`VERCEL_URL` so requests remain reachable, but you should still configure a deployable backend URL. Configure `DATABASE_URL` so the backend can persist accounts created through the UI.

 codex/update-apibaseurl-for-production-tp1cuq
Copy `.env.example` to `.env` in the repo root and adjust the basic auth credentials as needed. The frontend's basic-auth flow accepts either the configured credentials or accounts created through the `/register` page backed by the Nest API. `NEXT_PUBLIC_API_BASE_URL` must point to the backend API for server-side flows (such as NextAuth) and must always be set in hosted environments. During local development the browser can fall back to `window.location.origin`, but only when the app is loaded from a localhost hostname; the Next.js server process still requires an explicit value. Deployed builds refuse localhost targets and instead fall back to the deployed origin so requests remain reachable. Configure `DATABASE_URL` so the backend can persist accounts created through the UI.

 codex/update-apibaseurl-for-production-xixhcs
Copy `.env.example` to `.env` in the repo root and adjust the basic auth credentials as needed. The frontend's basic-auth flow accepts either the configured credentials or accounts created through the `/register` page backed by the Nest API. `NEXT_PUBLIC_API_BASE_URL` must point to the backend API for server-side flows (such as NextAuth) and should always be set in hosted environments. During local development, browser-only code falls back to `window.location.origin`, but the server process still requires an explicit value. When a deployed build runs in the browser with a `NEXT_PUBLIC_API_BASE_URL` that targets `localhost`, the helper falls back to the deployed origin to avoid unreachable requests. Configure `DATABASE_URL` so the backend can persist accounts created through the UI.

Copy `.env.example` to `.env` in the repo root and adjust the basic auth credentials as needed. The frontend's basic-auth flow accepts either the configured credentials or accounts created through the `/register` page backed by the Nest API. `NEXT_PUBLIC_API_BASE_URL` must point to the backend API for server-side flows (such as NextAuth) and should always be set in hosted environments. During local development, browser-only code falls back to `window.location.origin`, but the server process still requires an explicit value. Configure `DATABASE_URL` so the backend can persist accounts created through the UI.
 main
 main
 main
 main

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

## Mock mode

Mock integrations are disabled by default so preview and production environments always talk to real providers. For local development you can still flip the switch by setting `MOCK_MODE=true` (and `NEXT_PUBLIC_MOCK_MODE=true` for the frontend), which activates MSW-powered mocks in the UI and sample data providers in the API.

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
3. Configure environment variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_EMAIL`, `BASIC_AUTH_PASSWORD`, optional `BASIC_AUTH_NAME`, **required** `NEXT_PUBLIC_API_BASE_URL`). Leave `MOCK_MODE`/`NEXT_PUBLIC_MOCK_MODE` unset (or `false`) outside of local development so real integrations stay active.
4. Trigger a build—Vercel will install dependencies with pnpm automatically.

### Backend (Render)

1. Create a new Render Web Service pointing to `apps/backend`.
2. Set the build command to `pnpm install && pnpm --filter apps/backend build`.
3. Set the start command to `pnpm --filter apps/backend start`.
4. Provision a Postgres instance and Redis (or supply external connection strings) and expose them via `DATABASE_URL` and `REDIS_URL` env vars. Include `FRONTEND_ORIGIN` so CORS is configured correctly.

> For preview environments, be sure to share the backend URL with the frontend via `NEXT_PUBLIC_API_BASE_URL` and `NEXTAUTH_URL`. Without `NEXT_PUBLIC_API_BASE_URL`, server-side code in the frontend cannot contact the API.

## CI

GitHub Actions runs lint, typecheck, and placeholder test commands across all workspaces on every push and pull request.
