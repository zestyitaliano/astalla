import type { Application, Request, Response } from 'express';
import { Router } from 'express';
import type { SchemaColumn, SchemaTable } from '@shared/api';

import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { getTableRows, type TableRow } from '../db/data.js';
import { ensureUser } from './requestUser.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface RowSearchItem {
  id: string;
  preview: string;
  fields?: Record<string, unknown>;
}

interface RowEntry {
  item: RowSearchItem;
  previewLower: string;
}

const findTableByIdentifier = (graph: { tables: SchemaTable[] }, identifier: string): SchemaTable | undefined => {
  return graph.tables.find((table) => table.id === identifier || table.name === identifier);
};

const findColumnByIdentifier = (table: SchemaTable, identifier: string): SchemaColumn | undefined => {
  return table.columns.find((column) => column.id === identifier || column.name === identifier);
};

const isTextLikeColumn = (column: SchemaColumn): boolean => {
  const type = column.type.toLowerCase();
  return (
    type.includes('text') ||
    type.includes('char') ||
    type.includes('string') ||
    type === 'uuid' ||
    type === 'name'
  );
};

const getDisplayColumn = (table: SchemaTable): SchemaColumn | null => {
  const configuredId = (() => {
    const candidate = (table as unknown as Record<string, unknown>).displayColumnId;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
  })();

  if (configuredId) {
    const column = findColumnByIdentifier(table, configuredId);
    if (column) {
      return column;
    }
  }

  const textColumns = table.columns.filter(isTextLikeColumn);
  const nonIdTextColumn = textColumns.find((column) => column.name.toLowerCase() !== 'id');
  if (nonIdTextColumn) {
    return nonIdTextColumn;
  }

  if (textColumns.length > 0) {
    return textColumns[0] ?? null;
  }

  return null;
};

const getIdColumn = (table: SchemaTable): SchemaColumn | null => {
  const directMatch = table.columns.find((column) => column.name.toLowerCase() === 'id');
  if (directMatch) {
    return directMatch;
  }

  const suffixMatch = table.columns.find((column) => column.id.toLowerCase().endsWith('.id'));
  return suffixMatch ?? null;
};

const buildValueLookup = (row: TableRow): Map<string, unknown> => {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(key.toLowerCase(), value);
  }
  return map;
};

const getColumnValue = (rowValues: Map<string, unknown>, column: SchemaColumn): unknown => {
  const candidates = [column.name, column.id];
  const idParts = column.id.split('.');
  const shortId = idParts[idParts.length - 1];
  if (shortId && shortId !== column.name) {
    candidates.push(shortId);
  }

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (rowValues.has(normalized)) {
      return rowValues.get(normalized);
    }
  }

  return undefined;
};

const getRowIdValue = (
  rowValues: Map<string, unknown>,
  table: SchemaTable,
  idColumn: SchemaColumn | null,
): unknown => {
  const candidates: string[] = [];
  if (idColumn) {
    candidates.push(idColumn.name, idColumn.id);
    const suffix = idColumn.id.split('.').pop();
    if (suffix) {
      candidates.push(suffix);
    }
  }

  candidates.push('id', `${table.name}.id`);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (rowValues.has(normalized)) {
      return rowValues.get(normalized);
    }
  }

  return undefined;
};

const buildRowEntry = (
  row: TableRow,
  table: SchemaTable,
  index: number,
  idColumn: SchemaColumn | null,
  previewColumn: SchemaColumn | null,
): RowEntry => {
  const values = buildValueLookup(row);
  const fallbackId = `row-${index + 1}`;
  const rawId = getRowIdValue(values, table, idColumn);
  const resolvedId = rawId ?? fallbackId;
  const id = typeof resolvedId === 'string' ? resolvedId : String(resolvedId);

  const rawPreview = previewColumn ? getColumnValue(values, previewColumn) : undefined;
  let preview = rawPreview ?? rawId ?? fallbackId;

  if (typeof preview === 'string') {
    preview = preview.trim().length > 0 ? preview.trim() : rawId ?? fallbackId;
  }

  if (preview === undefined || preview === null) {
    preview = rawId ?? fallbackId;
  }

  const previewText = typeof preview === 'string' ? preview : String(preview);
  const normalizedPreview = previewText.trim().length > 0 ? previewText.trim() : id;

  const fields: Record<string, unknown> = {};
  for (const column of table.columns) {
    const value = getColumnValue(values, column);
    if (value !== undefined) {
      fields[column.id] = value;
    }
  }

  const item: RowSearchItem = { id, preview: normalizedPreview };
  if (Object.keys(fields).length > 0) {
    item.fields = fields;
  }

  return { item, previewLower: normalizedPreview.toLowerCase() };
};

const parseLimit = (value: unknown, res: Response): number | null => {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed)) {
    res.status(400).json({ message: '"limit" must be an integer.' });
    return null;
  }

  if (parsed < 1) {
    res.status(400).json({ message: '"limit" must be at least 1.' });
    return null;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const parseCursor = (value: unknown, res: Response): number | null => {
  if (value === undefined) {
    return 0;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    res.status(400).json({ message: '"cursor" must be a non-negative integer.' });
    return null;
  }

  return parsed;
};

const extractQueryString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : null;
  }

  return null;
};

export const registerRowRoutes = (app: Application): void => {
  const router = Router();

  router.get('/rows', (req, res) => {
    const userId = ensureUser(req, res);
    if (!userId) {
      return;
    }

    const tableParam = extractQueryString(req.query.tableId);
    const tableId = tableParam?.trim() ?? '';

    if (!tableId) {
      res.status(400).json({ message: '"tableId" is required.' });
      return;
    }

    const limit = parseLimit(req.query.limit, res);
    if (limit === null) {
      return;
    }

    const offset = parseCursor(req.query.cursor, res);
    if (offset === null) {
      return;
    }

    const queryParam = extractQueryString(req.query.q);
    const query = queryParam ? queryParam.trim().toLowerCase() : '';

    const graph = getSchemaGraphForUser(userId);
    const table = findTableByIdentifier(graph, tableId);
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    const rows = getTableRows(table.name);
    const idColumn = getIdColumn(table);
    const previewColumn = getDisplayColumn(table);

    const entries = rows.map((row, index) => buildRowEntry(row, table, index, idColumn, previewColumn));
    const filtered = query ? entries.filter((entry) => entry.previewLower.includes(query)) : entries;

    const paged = filtered.slice(offset, offset + limit);
    const items = paged.map((entry) => entry.item);

    const nextCursor = offset + limit < filtered.length ? String(offset + limit) : undefined;

    if (nextCursor) {
      res.json({ items, nextCursor });
    } else {
      res.json({ items });
    }
  });

  app.use('/api', router);
};
