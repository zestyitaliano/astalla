import type { Application, Request, Response } from 'express';
import { Router } from 'express';
import type { SchemaColumn, SchemaTable } from '@shared/api';

import { canRead, canWrite } from '../auth/permissions.js';
import { BASE_SCHEMA, getSchemaGraphForUser } from '../schemaRegistry/registry.js';

const hasOwn = <T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const resolveUserId = (req: Request): string | null => {
  const userId = (req as any).user?.id ?? req.header('x-user-id');
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

type MutableReferenceConfig = {
  targetTableId: string;
  displayColumnId: string | null;
  cardinality: 'single' | 'multi';
  enforceForeignKey: boolean;
};

type MutableSchemaColumn = SchemaColumn & { referenceConfig?: MutableReferenceConfig };
type MutableSchemaTable = SchemaTable & { columns: MutableSchemaColumn[] };

const findTableByIdentifier = (identifier: string): MutableSchemaTable | undefined => {
  return BASE_SCHEMA.tables.find(
    (table) => table.id === identifier || table.name === identifier,
  ) as MutableSchemaTable | undefined;
};

const findColumnByIdentifier = (
  table: MutableSchemaTable,
  identifier: string,
): MutableSchemaColumn | undefined => {
  return table.columns.find((column) => column.id === identifier || column.name === identifier);
};

type ReferenceConfigPatch = Partial<
  Pick<MutableReferenceConfig, 'targetTableId' | 'displayColumnId' | 'cardinality' | 'enforceForeignKey'>
>;

const mergeReferenceConfig = (
  current: MutableReferenceConfig | undefined,
  patch: ReferenceConfigPatch,
): MutableReferenceConfig => {
  const merged: MutableReferenceConfig = current
    ? { ...current }
    : { targetTableId: '', displayColumnId: null, cardinality: 'single', enforceForeignKey: false };

  if (hasOwn(patch, 'targetTableId')) {
    const target = patch.targetTableId;
    if (typeof target !== 'string' || target.trim().length === 0) {
      throw new Error('"referenceConfig.targetTableId" must be a non-empty string.');
    }
    merged.targetTableId = target;
  }

  if (hasOwn(patch, 'displayColumnId')) {
    const value = patch.displayColumnId;
    if (value !== null && typeof value !== 'string') {
      throw new Error('"referenceConfig.displayColumnId" must be a string or null.');
    }
    merged.displayColumnId = value ?? null;
  } else if (!current) {
    merged.displayColumnId = null;
  }

  if (hasOwn(patch, 'cardinality')) {
    const cardinality = patch.cardinality;
    if (cardinality !== 'single' && cardinality !== 'multi') {
      throw new Error('"referenceConfig.cardinality" must be either "single" or "multi".');
    }
    merged.cardinality = cardinality;
  } else if (!current) {
    merged.cardinality = 'single';
  }

  if (hasOwn(patch, 'enforceForeignKey')) {
    const enforce = patch.enforceForeignKey;
    if (typeof enforce !== 'boolean') {
      throw new Error('"referenceConfig.enforceForeignKey" must be a boolean.');
    }
    merged.enforceForeignKey = enforce;
  } else if (!current) {
    merged.enforceForeignKey = false;
  }

  return merged;
};

const sanitizeColumnForResponse = (column: MutableSchemaColumn) => {
  const clone: MutableSchemaColumn = { ...column };
  if (!clone.referenceConfig) {
    delete clone.referenceConfig;
  }
  return clone;
};

const ensureUser = (req: Request, res: Response): string | null => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return userId;
};

const buildChoicesRouter = () => {
  const router = Router();

  router.get('/tables/choices', (req, res) => {
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

  router.get('/tables/:tableId/columns/choices', (req, res) => {
    const userId = ensureUser(req, res);
    if (!userId) return;

    const graph = getSchemaGraphForUser(userId);
    const table = graph.tables.find(
      (item) => item.id === req.params.tableId || item.name === req.params.tableId,
    );

    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    const columns = table.columns.map((column) => ({
      id: column.id,
      name: column.name,
      type: column.type,
    }));

    res.json(columns);
  });

  return router;
};

const buildColumnRouter = () => {
  const router = Router();

  router.patch('/tables/:tableId/columns/:columnId', (req, res) => {
    const userId = ensureUser(req, res);
    if (!userId) return;

    const table = findTableByIdentifier(req.params.tableId);
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    const column = findColumnByIdentifier(table, req.params.columnId);
    if (!column) {
      res.status(404).json({ message: 'Column not found' });
      return;
    }

    if (!canWrite(userId, { kind: 'column', table, column })) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const body = req.body ?? {};

    if (hasOwn(body, 'name') && body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({ message: '"name" must be a non-empty string.' });
        return;
      }
    }

    if (hasOwn(body, 'type') && body.type !== undefined) {
      if (typeof body.type !== 'string' || body.type.trim().length === 0) {
        res.status(400).json({ message: '"type" must be a non-empty string.' });
        return;
      }
    }

    let nextReferenceConfig = column.referenceConfig ? { ...column.referenceConfig } : undefined;

    if (hasOwn(body, 'referenceConfig')) {
      const rawConfig = body.referenceConfig;
      if (rawConfig === null) {
        nextReferenceConfig = undefined;
      } else if (rawConfig === undefined) {
        // leave as-is
      } else if (typeof rawConfig === 'object') {
        try {
          nextReferenceConfig = mergeReferenceConfig(nextReferenceConfig, rawConfig as ReferenceConfigPatch);
        } catch (error) {
          res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid reference configuration.' });
          return;
        }
      } else {
        res.status(400).json({ message: '"referenceConfig" must be an object or null.' });
        return;
      }
    }

    const nextType = typeof body.type === 'string' && body.type.trim().length > 0 ? body.type : column.type;

    if (nextType === 'reference') {
      if (!nextReferenceConfig) {
        res.status(400).json({ message: '"referenceConfig" is required when type is "reference".' });
        return;
      }

      const targetIdentifier = nextReferenceConfig.targetTableId;
      if (typeof targetIdentifier !== 'string' || targetIdentifier.trim().length === 0) {
        res.status(400).json({ message: '"referenceConfig.targetTableId" is required when type is "reference".' });
        return;
      }

      const targetTable = findTableByIdentifier(targetIdentifier);
      if (!targetTable || !canRead(userId, { kind: 'table', table: targetTable })) {
        res.status(400).json({ message: 'Target table not found.' });
        return;
      }

      let displayColumnId: string | null = nextReferenceConfig.displayColumnId ?? null;
      if (displayColumnId !== null) {
        const targetColumn = findColumnByIdentifier(targetTable, displayColumnId);
        if (!targetColumn || !canRead(userId, { kind: 'column', table: targetTable, column: targetColumn })) {
          res.status(400).json({ message: 'Display column not found in target table.' });
          return;
        }
        displayColumnId = targetColumn.id;
      }

      const cardinality = nextReferenceConfig.cardinality ?? 'single';
      if (cardinality !== 'single' && cardinality !== 'multi') {
        res.status(400).json({ message: '"referenceConfig.cardinality" must be either "single" or "multi".' });
        return;
      }

      const enforceForeignKey = nextReferenceConfig.enforceForeignKey ?? false;
      if (typeof enforceForeignKey !== 'boolean') {
        res.status(400).json({ message: '"referenceConfig.enforceForeignKey" must be a boolean.' });
        return;
      }

      nextReferenceConfig = {
        targetTableId: targetTable.id,
        displayColumnId,
        cardinality,
        enforceForeignKey,
      };
    } else {
      nextReferenceConfig = undefined;
    }

    if (hasOwn(body, 'name') && body.name !== undefined) {
      column.name = body.name;
    }

    column.type = nextType;

    if (nextReferenceConfig) {
      column.referenceConfig = nextReferenceConfig;
    } else {
      delete column.referenceConfig;
    }

    const responseColumn = sanitizeColumnForResponse(column);

    res.json({ column: responseColumn });
  });

  return router;
};

export const registerColumnRoutes = (app: Application): void => {
  const apiRouter = Router();
  apiRouter.use(buildChoicesRouter());
  apiRouter.use(buildColumnRouter());
  app.use('/api', apiRouter);
};
