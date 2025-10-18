import { Router } from 'express';
import { createHash } from 'crypto';
import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import { resolveUserId } from './requestUser.js';

export const schemaRouter = Router();

schemaRouter.get('/registry', async (req, res) => {
  const fallbackUserId = (req.app.locals as any).schemaFallbackUserId as string | null | undefined;
  const userId = resolveUserId(req, { fallbackTo: fallbackUserId });
  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const graph = await getSchemaGraphForUser(userId);
  const payload = JSON.stringify(graph);
  const etag = `"${createHash('sha256').update(payload).digest('base64')}"`;

  if (req.headers['if-none-match'] === etag) {
    res.status(304).set('ETag', etag).end();
    return;
  }

  res.status(200).set('ETag', etag).set('Cache-Control', 'no-cache').type('application/json').send(payload);
});
