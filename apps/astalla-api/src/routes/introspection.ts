import { Router } from 'express';

export const introspectionRouter = Router();

introspectionRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    routes: [
      '/api/tables/choices',
      '/api/tables/:tableId/columns/choices',
      '/api/schema/registry',
    ],
  });
});
