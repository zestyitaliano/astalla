import type { Request, Response } from 'express';
import { Router } from 'express';

import { canRead } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { getDynamicTableByIdOrName, listDynamicTables, toSchemaTable } from '../services/tables.service.js';
import { ensureUser } from './requestUser.js';

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

  return toSchemaTable(dynamicTable);
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

router.get('/:tableId/columns/choices', async (req, res) => {
  const userId = ensureUser(req, res);
  if (!userId) return;

  const table = await findTableByIdentifier(req.params.tableId);
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
