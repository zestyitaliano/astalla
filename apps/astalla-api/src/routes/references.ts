import type { Application, Request, Response } from 'express';
import { Router } from 'express';
import { REF_AUTOCOMPLETE_V1 } from '@shared/api';
import type { SchemaColumn, SchemaTable } from '@shared/api';

import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import {
  buildSchemaCandidates,
  rankReferences,
  type RankedReferenceSuggestion,
  type ReferenceCandidate,
  type ReferenceCursorContext,
  type ReferenceSuggestion,
} from '../references/ranker.js';
import {
  AstValidationError,
  ExecutionPlanError,
  PermissionError,
  executeReference,
  validateProgramAst,
} from '../exec/executeReference.js';
import { isFeatureEnabled } from '../featureFlags.js';
import { referencesTelemetry } from '../telemetry/references.js';

interface SuggestRequestBody {
  cursorContext?: ReferenceCursorContext;
  tokensSoFar?: string;
}

type TelemetryPayload =
  | { event: 'suggestionAccepted'; kind: string; editDistance: number | null }
  | { event: 'quickFixApplied'; code: string }
  | { event: 'parseError'; message?: string }
  | { event: 'execError'; message?: string };

const parseTelemetryPayload = (value: unknown): TelemetryPayload | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const event = record.event;

  if (event === 'suggestionAccepted') {
    if (typeof record.kind !== 'string' || record.kind.trim() === '') {
      return null;
    }
    const editDistance = typeof record.editDistance === 'number' ? Math.max(0, record.editDistance) : null;
    return { event, kind: record.kind, editDistance };
  }

  if (event === 'quickFixApplied') {
    if (typeof record.code !== 'string') {
      return null;
    }
    return { event, code: record.code };
  }

  if (event === 'parseError') {
    const message = typeof record.message === 'string' ? record.message : undefined;
    return { event, message };
  }

  if (event === 'execError') {
    const message = typeof record.message === 'string' ? record.message : undefined;
    return { event, message };
  }

  return null;
};

const DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID ?? 'demo-org';
const DEFAULT_USER_ID = 'demo-user';

const THIS_REFERENCE_PREFIX = '@{this.';

const findTableByIdentifier = (tables: SchemaTable[], identifier?: string): SchemaTable | null => {
  if (!identifier) {
    return null;
  }

  return (
    tables.find((table) => table.id === identifier) ??
    tables.find((table) => table.name === identifier) ??
    null
  );
};

const isReferenceColumn = (column: SchemaColumn): boolean => column.type === 'reference';

const createReferenceCandidate = (
  table: SchemaTable,
  column: SchemaColumn,
  overrides: Partial<Pick<ReferenceCandidate, 'id' | 'label' | 'breadcrumb' | 'name'>> = {},
): ReferenceCandidate => ({
  id: overrides.id ?? column.id,
  kind: 'column',
  name: overrides.name ?? column.name,
  label: overrides.label ?? column.name,
  breadcrumb: overrides.breadcrumb ?? [table.label ?? table.name],
  tableId: table.id,
  tableName: table.name,
  dataType: column.type,
});

const buildReferenceScopedSuggestions = ({
  tokensSoFar,
  cursorContext,
  tables,
}: {
  tokensSoFar: string;
  cursorContext?: ReferenceCursorContext;
  tables: SchemaTable[];
}): ReferenceSuggestion[] | null => {
  const normalized = tokensSoFar.trim();
  if (!normalized.startsWith(THIS_REFERENCE_PREFIX)) {
    return null;
  }

  const table = findTableByIdentifier(tables, cursorContext?.tableId);
  if (!table) {
    return [];
  }

  const remainder = normalized.slice(THIS_REFERENCE_PREFIX.length).replace(/}/g, '');
  const segments = remainder.split('.');
  const columnToken = segments[0] ?? '';
  const hasNested = segments.length > 1 && remainder.includes('.');
  const referenceColumns = table.columns.filter(isReferenceColumn);

  const rankScopedColumns = (query: string): RankedReferenceSuggestion[] =>
    rankReferences({
      candidates: referenceColumns.map((column) => createReferenceCandidate(table, column)),
      tokensSoFar: query,
      cursorContext,
    });

  if (!hasNested) {
    return rankScopedColumns(columnToken);
  }

  const referenceColumn = referenceColumns.find(
    (column) => column.name.toLowerCase() === columnToken.toLowerCase(),
  );

  if (!referenceColumn) {
    return rankScopedColumns(columnToken);
  }

  const config = referenceColumn.referenceConfig;
  if (!config?.targetTableId) {
    return [
      {
        id: `${referenceColumn.id}::configure-target`,
        kind: 'action',
        label: 'Set target table…',
        breadcrumb: [table.label ?? table.name, referenceColumn.name],
        description: 'Open column settings to choose a target table.',
      },
    ];
  }

  const targetTable = findTableByIdentifier(tables, config.targetTableId);
  if (!targetTable) {
    return [];
  }

  const childQuery = segments.slice(1).join('.');
  const referenceLabel = referenceColumn.name;
  const targetLabel = targetTable.label ?? targetTable.name;

  const nestedCandidates = targetTable.columns.map((column) =>
    createReferenceCandidate(targetTable, column, {
      id: `${referenceColumn.id}::${column.id}`,
      label: `${referenceLabel} › ${targetLabel} › ${column.name}`,
      breadcrumb: [table.label ?? table.name, referenceLabel],
    }),
  );

  return rankReferences({
    candidates: nestedCandidates,
    tokensSoFar: childQuery,
    cursorContext,
  });
};

const resolveRequestContext = (req: Request) => {
  const userId = (req as any).user?.id ?? req.header('x-user-id') ?? DEFAULT_USER_ID;
  const workspaceId = req.header('x-workspace-id') ?? DEFAULT_WORKSPACE_ID;
  return { userId, workspaceId };
};

const ensureFeatureEnabled = async (req: Request, res: Response) => {
  const context = resolveRequestContext(req);
  const allowed = await isFeatureEnabled(REF_AUTOCOMPLETE_V1, context);
  if (!allowed) {
    res.status(404).json({ message: 'Not found' });
    return { allowed: false, context } as const;
  }
  return { allowed: true, context } as const;
};

export const registerReferenceRoutes = (app: Application): void => {
  const router = Router();

  router.post('/suggest', async (req: Request, res: Response) => {
    const { allowed, context } = await ensureFeatureEnabled(req, res);
    if (!allowed) {
      return;
    }

    const body = (req.body ?? {}) as SuggestRequestBody;

    if (typeof body.tokensSoFar !== 'string') {
      res.status(400).json({ message: '"tokensSoFar" must be a string.' });
      return;
    }

    const tokensSoFar = body.tokensSoFar;

    if (tokensSoFar.trim().length === 0) {
      res.status(200).json({ suggestions: [] });
      return;
    }

    const userId = context.userId;
    const graph = getSchemaGraphForUser(userId);
    const scopedSuggestions = buildReferenceScopedSuggestions({
      tokensSoFar,
      cursorContext: body.cursorContext,
      tables: graph.tables,
    });

    if (scopedSuggestions !== null) {
      res.json({ suggestions: scopedSuggestions });
      return;
    }

    const candidates = buildSchemaCandidates(graph.tables);
    const suggestions = rankReferences({
      candidates,
      tokensSoFar,
      cursorContext: body.cursorContext,
    });

    res.json({ suggestions });
  });

  router.post('/execute', async (req: Request, res: Response) => {
    const { allowed, context } = await ensureFeatureEnabled(req, res);
    if (!allowed) {
      return;
    }

    try {
      const body = req.body ?? {};
      const ast = validateProgramAst((body as any).ast);

      const userId = context.userId;
      const graph = getSchemaGraphForUser(userId);

      const result = await executeReference({
        ast,
        graph,
        userId,
      });

      res.json({ rows: result.rows, columns: result.columns, rowCount: result.rowCount });
    } catch (error) {
      if (error instanceof AstValidationError) {
        referencesTelemetry.parseError({ message: error.message });
        res.status(400).json({ message: error.message, issues: error.issues });
        return;
      }

      if (error instanceof PermissionError) {
        referencesTelemetry.execError({ message: error.message });
        res.status(403).json({
          message: error.message,
          table: error.table,
          column: error.column,
        });
        return;
      }

      if (error instanceof ExecutionPlanError) {
        referencesTelemetry.execError({ message: error.message });
        res.status(400).json({ message: error.message });
        return;
      }

      referencesTelemetry.execError({ message: error instanceof Error ? error.message : undefined });
      res.status(500).json({ message: 'Failed to execute reference.' });
    }
  });

  router.post('/telemetry', async (req: Request, res: Response) => {
    const { allowed } = await ensureFeatureEnabled(req, res);
    if (!allowed) {
      return;
    }

    const payload = parseTelemetryPayload(req.body ?? {});
    if (!payload) {
      res.status(400).json({ message: 'Invalid telemetry payload' });
      return;
    }

    switch (payload.event) {
      case 'suggestionAccepted':
        referencesTelemetry.suggestionAccepted(payload.kind, payload.editDistance ?? null);
        break;
      case 'quickFixApplied':
        referencesTelemetry.quickFixApplied(payload.code);
        break;
      case 'parseError':
        referencesTelemetry.parseError({ message: payload.message });
        break;
      case 'execError':
        referencesTelemetry.execError({ message: payload.message });
        break;
      default:
        break;
    }

    res.status(202).json({ ok: true });
  });

  app.use('/api/references', router);
};
