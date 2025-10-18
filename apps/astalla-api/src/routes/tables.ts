import type { Request, Response } from 'express';
import { Router } from 'express';

import { canRead } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { ensureUser } from './requestUser.js';

const findTableByIdentifier = (identifier: string) => {
  return BASE_SCHEMA.tables.find(
    (table) => table.id === identifier || table.name === identifier,
  );
};

export const router = Router();

router.get('/choices', (req, res) => {
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

router.get('/:tableId/columns/choices', (req, res) => {
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

export const tablesRouter = router;
