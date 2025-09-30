# Astalla Control Monorepo

Astalla Control is a marketing operations platform that pairs a Next.js dashboard with a NestJS data API, lightweight WordPress plugin, and shared schema package. This repository contains everything needed to ship an MVP preview to Vercel (frontend) and Render (backend) while keeping local development ergonomic with Docker Compose and Prisma tooling.

## High-level spec (MVP charter)
⸻
Entrata (API)
1. Objects & scope: Which entities do you need in/out first—leads, lead events, tours, applications, leases, residents, units/availability/pricing, work orders? Any historical backfill?
2. Identity mapping: What will be the canonical keys (propertyId, unitId, applicationId, prospectId)? How will you map Entrata IDs to your internal IDs and to Google/WordPress objects?
3. Sync model: What cadence and triggers—webhooks/event polling (near-real-time) vs scheduled ETL (e.g., 15-min/hourly)? What’s the required data latency for dashboards?
4. Filters & attribution: Which event types/states matter (e.g., scheduled vs completed tours, app started vs completed)? How will you attribute conversions (first touch/last touch, lookback window)?
5. Auth & limits: How many properties/credentials will you support? Plan for API keys per property vs per client, rate limits, retries/backoff, and alerting on failures.

WordPress (via Proxy Server)
1. Direction & payloads: What flows are needed—push data into WP (properties, floorplans, pricing, promos), pull engagement data out (form fills, clicks), or both? Which fields are source-of-truth?
2. Content model: Which WP structures—custom post types (Property, Floorplan), taxonomies (City, Amenities), ACF/Meta fields? Any multisite or many separate domains?
3. Integration surface: Will the proxy call WP REST API/GraphQL, or ship a lightweight plugin that exposes custom endpoints and admin UI (for API keys, mapping, and cache control)?
4. Caching & invalidation: What’s your cache TTL and busting strategy when units/prices change? Write-through vs read-through? How will you handle image/media sync?
5. Security & tenancy: How will sites authenticate to the proxy (JWT, signed HMAC)? Per-site scopes/roles? How do you prevent one client’s data from leaking to another?

Google (APIs)
1. Which Google services: Google Ads (cost/keywords/conv & Offline Conversions), GA4 (events, sessions), Search Console (queries/positions), Looker Studio (sharing), Sheets/BigQuery (storage/joins)? Prioritize must-haves.
2. Account topology: Do you manage via MCC(s)? List customer IDs, GA4 properties/data streams, and Search Console sites to link. Any cross-domain or subdomain rollups?
3. Conversion stitching: Will you post Offline Conversions to Ads (GCLID/GBRAID/WBRAID), Enhanced Conversions, or GA4 Measurement Protocol events? Define mapping from Entrata events → Google conversions.
4. Granularity & freshness: What reporting grains (daily/hourly) and lookback windows are required? How fresh must cost + conv data be for decisioning?
5. Quotas & governance: Expected query volumes? Where will raw data live (BigQuery vs your DB)? Who can see what—views by region/property/role, PII handling, and data retention.

North Star
A single marketing ops platform (“Astalla Control”) that:
• Ingests: Entrata, Google (GA4/Ads/GBP/Search Console), Meta, web scrapes.
• Models: properties, pipeline (lead→tour→app→lease), occupancy, spend, reviews, tasks/tickets.
• Acts: pushes content to WordPress, schedules social, posts GBP replies, sends alerts.
• Explains: dashboards, red/watch lists, weekly rollups, AI summaries.

Core data model (minimum)
• Org & Tenancy: Org → Properties → Users (roles: client/regional/marketing).
• Sources: SourceAccount (Entrata creds, Google Ads CID, GA4 property, GBP locationId, Meta page/IG id).
• Leasing: Lead, LeadEvent, Application, Lease.
• Inventory: Unit, RatePlan, AvailabilitySnapshot.
• Marketing: ChannelSpend, ConversionEvent.
• Reputation: Review, ReviewReply, SentimentSummary.
• Ops: Ticket, Task, SOP, BillingItem, ScrapeJob, Finding.
• Reporting: ReportSnapshot, KPIThreshold, Alert.
Canonical keys: property_code, unit_code, lead_external_id, gclid/gbraid/wbraid.

MVP cut
1) Ingest: Entrata (Leads, LeadEvents, Applications, Leases); Google Ads (daily cost); GA4 (key conversions); GBP (reviews).
2) Model: current & anticipated occupancy; CPL/CPLS; neglected-lead rule by SLA; simple review sentiment bucket.
3) Dashboards: Org/Regional/Property switch; tiles & trends; Red/Watch tagger; weekly report snapshot.
4) Actions: WordPress plugin endpoint to push {property_code, promo_text, hero_image_url}; Slack/email alerts for breaches/failures.

Tech stack (opinionated)
• Frontend: Next.js (App Router, TS) + shadcn/ui + React Query.
• Backend: Node + NestJS (TS) + Prisma + Postgres; BullMQ for jobs.
• Storage: Postgres primary; (BigQuery optional later).
• Infra: Vercel (frontend), Render (backend), Upstash Redis (queue), GitHub Actions (CI).
• Scrapers & AI deferred.
⸻

## Repository layout

```
apps/
  frontend/   # Next.js 14 (App Router) dashboard
  backend/    # NestJS API with Prisma, BullMQ, mock providers
packages/
  shared/     # Shared Zod schemas and types
ops/
  wp-plugin/  # WordPress plugin for promo sync
  sql/        # Seed data and helper views
  scripts/    # Node scripts for seeding & reports
```

## Local quickstart

1. Install pnpm globally (optional if you already have it):
   ```bash
   npm i -g pnpm
   ```
2. Install workspace dependencies:
   ```bash
   pnpm install
   ```
3. Copy the example environment file and fill in values as needed:
   ```bash
   cp .env.example .env
   ```
4. Start backing services (Postgres + Redis):
   ```bash
   docker compose up -d
   ```
5. Apply database migrations for the backend:
   ```bash
   pnpm --filter apps/backend prisma migrate dev
   ```
6. Seed development data (optional but recommended):
   ```bash
   pnpm --filter ops/scripts dev-seed
   ```
7. Launch both apps:
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Deploying the preview

### Frontend (Vercel)
1. Connect the repo and set the project root to `apps/frontend`.
2. Configure environment variables:
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_APP_NAME`
   - `MOCK_MODE` (default `true` for previews)
3. Deploy. The CI workflow produces a build using pnpm and will match Vercel’s environment.

### Backend (Render)
1. Add a new Render Web Service using the repo root and `render.yaml`.
2. Supply the environment variables listed in `.env.example` (database, redis, secrets, provider tokens).
3. Render will run `pnpm install` and `pnpm --filter apps/backend build` followed by `pnpm --filter apps/backend start:prod` from the manifest.
4. Share the deployed backend URL with the frontend through `NEXT_PUBLIC_API_BASE_URL` and `NEXTAUTH_URL`.

## Mock vs live mode

- **Mock mode (default):** set `MOCK_MODE=true` (root), `NEXT_PUBLIC_MOCK_MODE=true`, and skip provider credentials. The frontend boots MSW handlers and the backend uses bundled sample providers and deterministic fixtures.
- **Live mode:** set `MOCK_MODE=false` in both apps and supply Entrata, Google Ads, GA4, GBP, and WordPress secrets. Jobs and providers will attempt real syncs.

## Weekly snapshot job

To run the snapshot job manually in development:
```bash
pnpm --filter ops/scripts run-weekly-snapshot
```
This computes occupancy, pipeline, and review KPIs for each property and writes a new `ReportSnapshot` via Prisma.

## Contributing

- CI runs lint, typecheck, unit tests, Playwright smoke tests, and builds for both apps on every PR.
- Follow the shared linting and formatting rules defined in the workspace. Use `pnpm lint` or `pnpm format` as needed.

## License

This project is licensed under the [MIT License](LICENSE).
