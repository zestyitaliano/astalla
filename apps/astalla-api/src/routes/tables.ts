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

// GET /api/tables  -> list dynamic tables
router.get('/', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const dynamic = await listDynamicTables();
  const visible = dynamic.filter((table) =>
    canRead(userId, { kind: 'table', table: asSchema(table) }),
  );
  res.json(visible);
});

// POST /api/tables  -> create dynamic table
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

// GET /api/tables/:tableId  -> detail (dynamic first, then static fallback)
router.get('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const dynamic = await getDynamicTableById(req.params.tableId);
  if (dynamic) {
    if (!canRead(userId, { kind: 'table', table: asSchema(dynamic) })) {
      return forbid(res);
    }
    res.json(dynamic);
    return;
  }

  const staticTable = BASE_SCHEMA.tables.find(
    (t) => t.id === req.params.tableId || t.name === req.params.tableId,
  );
  if (!staticTable) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }
  if (!canRead(userId, { kind: 'table', table: staticTable })) {
    return forbid(res);
  }
  res.json(staticTable);
});

// PATCH /api/tables/:id  -> update name/description
router.patch('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const target = await getDynamicTableById(req.params.tableId);
  if (!target) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canWrite(userId, { kind: 'table', table: asSchema(target) })) {
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

// DELETE /api/tables/:id
router.delete('/:tableId', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const target = await getDynamicTableById(req.params.tableId);
  if (!target) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canWrite(userId, { kind: 'table', table: asSchema(target) })) {
    return forbid(res);
  }

  try {
    await deleteDynamicTable(req.params.tableId);
    res.status(204).send();
  } catch (e: any) {
    res.status(400).json({ message: e?.message ?? 'Failed to delete table' });
  }
});

router.get('/:tableId/columns/choices', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const table = await findTableByIdentifier(req.params.tableId);
  if (!table) {
    res.status(404).json({ message: 'Table not found' });
    return;
  }

  if (!canRead(userId, { kind: 'table', table: asSchema(table) })) {
    return forbid(res);
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
