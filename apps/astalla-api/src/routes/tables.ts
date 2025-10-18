import type { Request, Response } from 'express';
import { Router } from 'express';

import { canRead } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';

const resolveUserId = (req: Request): string | null => {
  const userId = (req as any).user?.id ?? req.header('x-user-id');
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

const ensureUser = (req: Request, res: Response): string | null => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return userId;
};

const findTableByIdentifier = (identifier: string) => {
  return BASE_SCHEMA.tables.find(
    (table) => table.id === identifier || table.name === identifier,
  );
};

export const tablesRouter = Router();

tablesRouter.get('/choices', (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const graph = getSchemaGraphForUser(userId);
  const tables = graph.tables.map((table) => ({
    id: table.id,
    name: table.name,
    ...(table.label ? { label: table.label } : {}),
  }));

  res.json(tables);
});

tablesRouter.get('/:tableId/columns/choices', (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const table = findTableByIdentifier(req.params.tableId);
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canRead(userId, { kind: 'table', table })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const columns = table.columns
    .filter((column) => canRead(userId, { kind: 'column', table, column }))
    .map((column) => ({
      id: column.id,
      name: column.name,
      type: column.type,
    }));

  res.json(columns);
});
