import type { SchemaTable } from '@shared/api';
import { Router } from 'express';

import { canRead, canWrite } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import {
  getDynamicTableByIdOrName,
  listDynamicTables,
  toSchemaTable,
  createDynamicTable,
  getDynamicTableById,
  updateDynamicTable,
  deleteDynamicTable,
  type DynamicTable,
} from '../services/tables.service.js';
import { ensureUser } from './requestUser.js';

const isDynamicTable = (table: unknown): table is DynamicTable => {
  return Boolean(
    table &&
    typeof table === 'object' &&
    'orgId' in (table as Record<string, unknown>) &&
    'columns' in (table as Record<string, unknown>),
  );
};

function asSchema(table: DynamicTable | SchemaTable): SchemaTable {
  return isDynamicTable(table) ? toSchemaTable(table) : table;
}

function forbid(res: any) {
  return res.status(403).json({ message: 'Forbidden' });
}

const findTableByIdentifier = async (identifier: string) => {
  const staticTable = BASE_SCHEMA.tables.find(
    (table) => table.id === identifier || table.name === identifier,
  );

  if (staticTable) {
    return staticTable;
  }

  const dynamicTable = await getDynamicTableByIdOrName(identifier);
  if (!dynamicTable) {
    return null;
  }

  return asSchema(dynamicTable);
};

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

export const router = Router();

router.get('/choices', async (req, res) => {
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
      if (seen.has(table.id)) {
        return false;
      }
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

// IMPORTANT: define specific paths BEFORE the greedy /:tableId matcher

// GET /api/tables -> list dynamic tables
router.get('/', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const dynamic = await listDynamicTables();
  const visible = dynamic.filter((table) =>
    canRead(userId, { kind: 'table', table: toSchemaTable(table) }),
  );
  res.json(visible);
});

// POST /api/tables -> create dynamic table
router.post('/', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const { name, description } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ message: 'Name is required' });
    return;
  }

  try {
    const table = await createDynamicTable({ name, description });
    res.status(201).json(table);
  } catch (e: any) {
    res.status(400).json({ message: e?.message ?? 'Failed to create table' });
  }
});

router.get('/_debug', (req, res) => {
  res.json({
    baseUrl: req.baseUrl,
    routes: [
      'GET /choices',
      'GET /',
      'POST /',
      'GET /_debug',
      'GET /:tableId',
      'PATCH /:tableId',
      'DELETE /:tableId',
      'GET /:tableId/columns',
      'GET /:tableId/columns/choices',
    ],
  });
});

// GET /api/tables/:tableId -> detail (dynamic first, then static fallback)
router.get('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const id = req.params.tableId;
  const dynamic = await getDynamicTableById(id);
  if (dynamic) {
    const schemaTable = toSchemaTable(dynamic);
    if (!canRead(userId, { kind: 'table', table: schemaTable })) {
      return forbid(res);
    }
    res.json(dynamic);
    return;
  }

  const staticTable = BASE_SCHEMA.tables.find((t) => t.id === id || t.name === id);
  if (!staticTable) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }
  if (!canRead(userId, { kind: 'table', table: staticTable })) {
    return forbid(res);
  }
  res.json(staticTable);
});

// PATCH /api/tables/:tableId -> update name/description
router.patch('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const target = await getDynamicTableById(req.params.tableId);
  if (!target) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canWrite(userId, { kind: 'table', table: toSchemaTable(target) })) {
    return forbid(res);
  }

  try {
    const updated = await updateDynamicTable(req.params.tableId, {
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      description: req.body?.description ?? undefined,
    });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ message: e?.message ?? 'Failed to update table' });
  }
});

// DELETE /api/tables/:tableId
router.delete('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const target = await getDynamicTableById(req.params.tableId);
  if (!target) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canWrite(userId, { kind: 'table', table: toSchemaTable(target) })) {
    return forbid(res);
  }

  try {
    await deleteDynamicTable(req.params.tableId);
    res.status(204).send();
  } catch (e: any) {
    res.status(400).json({ message: e?.message ?? 'Failed to delete table' });
  }
});

// GET /api/tables/:tableId/columns
router.get('/:tableId/columns', async (req, res) => {
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

router.get('/:tableId/columns/choices', async (req, res) => {
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
