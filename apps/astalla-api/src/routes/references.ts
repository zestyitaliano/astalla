import type { Application, Request, Response } from 'express';
import { Router } from 'express';
import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { buildSchemaCandidates, rankReferences, type ReferenceCursorContext } from '../references/ranker.js';
import {
  AstValidationError,
  ExecutionPlanError,
  PermissionError,
  executeReference,
  validateProgramAst,
} from '../exec/executeReference.js';

interface SuggestRequestBody {
  cursorContext?: ReferenceCursorContext;
  tokensSoFar?: string;
}

export const registerReferenceRoutes = (app: Application): void => {
  const router = Router();

  router.post('/suggest', (req: Request, res: Response) => {
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

    const userId = (req as any).user?.id ?? req.header('x-user-id') ?? 'dev-user';
    const graph = getSchemaGraphForUser(userId);
    const candidates = buildSchemaCandidates(graph.tables);
    const suggestions = rankReferences({
      candidates,
      tokensSoFar,
      cursorContext: body.cursorContext,
    });

    res.json({ suggestions });
  });

  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const ast = validateProgramAst((body as any).ast);

      const userId = (req as any).user?.id ?? req.header('x-user-id') ?? 'dev-user';
      const graph = getSchemaGraphForUser(userId);

      const result = await executeReference({
        ast,
        graph,
        userId,
      });

      res.json({ rows: result.rows, columns: result.columns, rowCount: result.rowCount });
    } catch (error) {
      if (error instanceof AstValidationError) {
        res.status(400).json({ message: error.message, issues: error.issues });
        return;
      }

      if (error instanceof PermissionError) {
        res.status(403).json({
          message: error.message,
          table: error.table,
          column: error.column,
        });
        return;
      }

      if (error instanceof ExecutionPlanError) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: 'Failed to execute reference.' });
    }
  });

  app.use('/api/references', router);
};
