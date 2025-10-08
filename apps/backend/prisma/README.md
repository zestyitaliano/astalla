# Prisma Schema Notes

This project keeps the Prisma schema in `schema.prisma` together with the generated migrations in the `migrations/` folder. The initial baseline migration is `20240101000000_init` and subsequent migrations apply in chronological order.

For local validation/generation in restricted networks you can set the following environment variable before invoking Prisma commands so checksum downloads are skipped:

```bash
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
```

Typical commands that CI should run from the repository root are:

```bash
pnpm -C apps/backend prisma format
pnpm -C apps/backend prisma validate
pnpm -C apps/backend prisma generate
```

Ensure the `DATABASE_URL` environment variable points at a temporary PostgreSQL instance before running migrations.
