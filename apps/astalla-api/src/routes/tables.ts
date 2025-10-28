import type { Request, Response } from 'express';
import { Router } from 'express';

import { canRead } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import {
  listDynamicTables,
  getDynamicTableById,
  getDynamicTableByIdOrName,
  createDynamicTable,
  updateDynamicTable,
  deleteDynamicTable,
  toSchemaTable,
} from '../services/tables.service.js';
import { ensureUser } from './requestUser.js';

export const router = Router();

/** ---------------------------
 * Utilities
 * --------------------------*/
const findTableByIdentifier = async (identifier: string) => {
  const staticTable = BASE_SCHEMA.tables.find(
    (table) => table.id === identifier || table.name === identifier,
  );

  if (staticTable) return staticTable;

  const dynamicTable = await getDynamicTableByIdOrName(identifier);
  if (!dynamicTable) return null;

  return toSchemaTable(dynamicTable);
};

const forbid = (res: Response) => res.status(403).json({ message: 'Forbidden' });

const loadVisibleColumns = async (userId: string, tableId: string) => {
  const table = await findTableByIdentifier(tableId);
  if (!table) {
    return { kind: 'not-found' as const };
  }

  if (!canRead(userId, { kind: 'table', table })) {
    return { kind: 'forbidden' as const };
  }

  const columns = table.columns
    .filter((column) => canRead(userId, { kind: 'column', table, column }))
    .map((column) => ({
      id: column.id,
      name: column.name,
      type: column.type,
    }));

  return { kind: 'ok' as const, columns };
};

/** ---------------------------
 * ROUTE ORDER MATTERS!
 * Define specific paths BEFORE the greedy `/:tableId` matcher.
 * Mounted at `/api/tables` by the app bootstrap.
 * --------------------------*/

/** 1) CHOICES (KEEP: your existing logic — DO NOT CHANGE BODY) */
router.get('/choices', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const graph = getSchemaGraphForUser(userId);
  const dynamicTables = await listDynamicTables();
  const dynamicSchemaTables = dynamicTables.map((table) => toSchemaTable(table));

  const combined = [...graph.tables, ...dynamicSchemaTables].filter((table) =>
    canRead(userId, { kind: 'table', table }),
  );

  const seen = new Set<string>();
  const tables = combined
    .filter((table) => {
      if (seen.has(table.id)) return false;
      seen.add(table.id);
      return true;
    })
    .map((table) => ({
      id: table.id,
      name: table.name,
      ...(table.label ? { label: table.label } : {}),
    }));

  res.json(tables);
});

/** 2) LIST (GET /api/tables) */
router.get('/', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const dynamic = await listDynamicTables();
  const visible = dynamic.filter((t) => canRead(userId, { kind: 'table', table: toSchemaTable(t) }));
  res.json(visible);
});

/** 3) CREATE (POST /api/tables) */
router.post('/', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const { name, description } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }
  try {
    const created = await createDynamicTable({ name: name.trim(), description });
    return res.status(201).json(created);
  } catch (e: any) {
    return res.status(400).json({ message: e?.message ?? 'Failed to create table' });
  }
});

/** 4) (Optional) DEBUG — remove once verified */
router.get('/_debug', (req: Request, res: Response) => {
  res.json({
    baseUrl: req.baseUrl,
    routes: [
      'GET /choices',
      'GET /',
      'POST /',
      'GET /:tableId',
      'PATCH /:tableId',
      'DELETE /:tableId',
      'GET /:tableId/columns',
      'GET /:tableId/columns/choices',
    ],
  });
});

/** 5) READ (GET /api/tables/:tableId) — AFTER fixed paths */
router.get('/:tableId', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const id = req.params.tableId;

  // Try dynamic first
  const dynamic = await getDynamicTableById(id);
  if (dynamic) {
    if (!canRead(userId, { kind: 'table', table: toSchemaTable(dynamic) })) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return res.json(dynamic);
  }

  // Then static
  const staticTable = BASE_SCHEMA.tables.find((t) => t.id === id || t.name === id);
  if (!staticTable) return res.status(404).json({ message: 'Table not found' });
  if (!canRead(userId, { kind: 'table', table: staticTable })) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return res.json(staticTable);
});

/** 6) UPDATE (PATCH /api/tables/:tableId) */
router.patch('/:tableId', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const id = req.params.tableId;
  const target = await getDynamicTableById(id);
  if (!target) return res.status(404).json({ message: 'Table not found' });

  try {
    const updated = await updateDynamicTable(id, {
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      description: req.body?.description ?? undefined,
    });
    return res.json(updated);
  } catch (e: any) {
    return res.status(400).json({ message: e?.message ?? 'Failed to update table' });
  }
});

/** 7) DELETE (DELETE /api/tables/:tableId) */
router.delete('/:tableId', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const id = req.params.tableId;
  const target = await getDynamicTableById(id);
  if (!target) return res.status(404).json({ message: 'Table not found' });

  await deleteDynamicTable(id);
  return res.status(204).send();
});

/** 8) COLUMNS (GET /api/tables/:tableId/columns) — keep AFTER /:tableId
 * KEEP: your existing columns logic (reinsert the full body you had).
 */
router.get('/:tableId/columns', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const result = await loadVisibleColumns(userId, req.params.tableId);
  if (result.kind === 'not-found') {
    res.status(404).json({ message: 'Table not found' });
    return;
  }
  if (result.kind === 'forbidden') {
    return forbid(res);
  }

  res.json(result.columns);
});

router.get('/:tableId/columns/choices', async (req: Request, res: Response) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const result = await loadVisibleColumns(userId, req.params.tableId);
  if (result.kind === 'not-found') {
    res.status(404).json({ message: 'Table not found' });
    return;
  }
  if (result.kind === 'forbidden') {
    return forbid(res);
  }

  res.json(result.columns);
});

export const tablesRouter = router;
