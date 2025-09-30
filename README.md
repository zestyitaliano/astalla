# Astalla Control

Astalla Control is a marketing operations platform that unifies Entrata, Google, and WordPress workflows into a single control plane for leasing teams. This repository houses the monorepo for the MVP implementation spanning the frontend (Next.js), backend (NestJS), shared packages, WordPress integration, and operational tooling.

## High-level spec
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

## Quickstart

### Local development
1. Install pnpm if you do not already have it: `npm i -g pnpm`.
2. Install dependencies: `pnpm install`.
3. Copy the environment file template: `cp .env.example .env` and fill out the required values.
4. Start the infrastructure dependencies: `docker compose up -d` (Postgres + Redis).
5. Apply database migrations: `pnpm --filter apps/backend prisma migrate dev`.
6. Start the backend API: `pnpm --filter apps/backend dev`.
7. Start the frontend app: `pnpm --filter apps/frontend dev`.

### Deployments
- **Frontend (Vercel):** Connect the repository to Vercel and set the environment variables listed in `.env.example` prefixed with `NEXT_` and `NEXT_PUBLIC_` values.
- **Backend (Render):** Use the provided `render.yaml` to provision a Node service. Configure the environment variables described in `.env.example` and ensure the Render service has access to the Postgres and Redis instances.

### Mock mode
The frontend defaults to mock mode (`MOCK_MODE=true`), which uses Mock Service Worker (MSW) to provide deterministic responses without a running backend. Set `MOCK_MODE=false` to connect to the live backend, making sure the API base URL is reachable.

### Weekly snapshot job
Run `pnpm --filter apps/backend weekly-snapshot` to execute the job that generates the latest `ReportSnapshot` entries. This command can be scheduled in production using Render cron jobs.

## Repository structure
- `apps/frontend`: Next.js frontend for Astalla Control.
- `apps/backend`: NestJS backend API and job runners.
- `packages/shared`: Shared types and schema definitions.
- `ops/wp-plugin`: WordPress plugin used by the backend proxy.
- `ops/sql`: Seed data and SQL views.
- `ops/scripts`: Operational scripts (seeding, jobs).
- `.github/workflows`: CI/CD configuration.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
