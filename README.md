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

Set `MOCK_MODE=true` (and `NEXT_PUBLIC_MOCK_MODE=true` for the frontend) to activate MSW-powered mocks in the UI and sample data providers in the API. This lets you explore the dashboard without configuring external integrations.

## Deployment

### Frontend (Vercel)

1. Connect the repository to Vercel.
2. Set the project root to `apps/frontend`.
3. Configure environment variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_EMAIL`, `BASIC_AUTH_PASSWORD`, optional `BASIC_AUTH_NAME`, **required** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MOCK_MODE`).
4. Trigger a build—Vercel will install dependencies with pnpm automatically.

### Backend (Render)

1. Create a new Render Web Service pointing to `apps/backend`.
2. Set the build command to `pnpm install && pnpm --filter apps/backend build`.
3. Set the start command to `pnpm --filter apps/backend start`.
4. Provision a Postgres instance and Redis (or supply external connection strings) and expose them via `DATABASE_URL` and `REDIS_URL` env vars. Include `FRONTEND_ORIGIN` so CORS is configured correctly.

> For preview environments, be sure to share the backend URL with the frontend via `NEXT_PUBLIC_API_BASE_URL` and `NEXTAUTH_URL`. Without `NEXT_PUBLIC_API_BASE_URL`, server-side code in the frontend cannot contact the API.

## CI

GitHub Actions runs lint, typecheck, and placeholder test commands across all workspaces on every push and pull request.
