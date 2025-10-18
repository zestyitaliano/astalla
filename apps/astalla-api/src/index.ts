import express, { NextFunction, Request, Response, type RequestHandler } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import { createHmac, createHash, randomUUID } from 'crypto';
import { Site } from './types.js';
import { getSchemaGraphForUser } from './schemaRegistry/registry.js';
import { registerColumnRoutes } from './routes/columns.js';
import { tablesRouter } from './routes/tables.js';
import { registerReferenceRoutes } from './routes/references.js';
import { registerRowRoutes } from './routes/rows.js';
import { resolveUserId } from './routes/requestUser.js';

const computeEtag = (payload: string): string => {
  return `"${createHash('sha256').update(payload).digest('base64')}"`;
};

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

const asyncHandler = (handler: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

const signBody = (secret: string, body: string | Buffer): string => {
  return createHmac('sha256', secret).update(body).digest('base64');
};

interface CreateAppOptions {
  beforeRoutes?: RequestHandler[];
  defaultUserId?: string | null;
}

export const createApp = (options?: CreateAppOptions) => {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  const sites = new Map<string, Site>();
  const fallbackUserId = options?.defaultUserId === undefined ? 'dev-user' : options.defaultUserId;

  const requireSite = (id: string): Site => {
    const site = sites.get(id);
    if (!site) {
      throw Object.assign(new Error('Site not found'), { status: 404 });
    }
    return site;
  };

  app.use(express.json());

  if (options?.beforeRoutes) {
    for (const handler of options.beforeRoutes) {
      app.use(handler);
    }
  }

  app.use('/api/tables', tablesRouter);
  registerReferenceRoutes(app);
  registerColumnRoutes(app);
  registerRowRoutes(app);

  app.get('/sites', (req, res) => {
    res.json(Array.from(sites.values()));
  });

  app.get('/api/schema/registry', (req, res) => {
    const userId = resolveUserId(req, { fallbackTo: fallbackUserId });
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const graph = getSchemaGraphForUser(userId);
    const payload = JSON.stringify(graph);
    const etag = computeEtag(payload);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).setHeader('ETag', etag).end();
      return;
    }

    res
      .status(200)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Cache-Control', 'no-cache')
      .setHeader('ETag', etag)
      .send(payload);
  });

  app.post('/sites', (req, res) => {
    const { id, label, baseUrl, secret, lastSyncAt = null } = req.body ?? {};

    if (!label || !baseUrl || !secret) {
      return res.status(400).json({ message: 'Fields "label", "baseUrl", and "secret" are required.' });
    }

    const siteId: string = typeof id === 'string' && id.length > 0 ? id : randomUUID();
    const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');

    const site: Site = {
      id: siteId,
      label: String(label),
      baseUrl: normalizedBaseUrl,
      secret: String(secret),
      lastSyncAt: lastSyncAt ? String(lastSyncAt) : null,
    };

    sites.set(siteId, site);
    res.json(site);
  });

  app.get(
    '/sites/:id/health',
    asyncHandler(async (req, res) => {
      const site = requireSite(req.params.id);
      const url = new URL('/wp-json/astalla/v1/health', site.baseUrl).toString();

      const response = await fetch(url, {
        headers: {
          'x-astalla-signature': signBody(site.secret, ''),
        },
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (error) {
        res.status(response.status).send(text);
      }
    })
  );

  app.get(
    '/sites/:id/content',
    asyncHandler(async (req, res) => {
      const site = requireSite(req.params.id);
      const url = new URL('/wp-json/astalla/v1/content', site.baseUrl);

      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          value.forEach((item) => url.searchParams.append(key, String(item)));
        } else if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        headers: {
          'x-astalla-signature': signBody(site.secret, ''),
        },
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (error) {
        res.status(response.status).send(text);
      }
    })
  );

  app.post(
    '/sites/:id/content',
    asyncHandler(async (req, res) => {
      const site = requireSite(req.params.id);
      const url = new URL('/wp-json/astalla/v1/content', site.baseUrl).toString();
      const payload = JSON.stringify(req.body ?? {});

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-astalla-signature': signBody(site.secret, payload),
        },
        body: payload,
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (error) {
        res.status(response.status).send(text);
      }
    })
  );

  app.post(
    '/sites/:id/media',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const site = requireSite(req.params.id);
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: 'No file uploaded. Expected field named "file".' });
        return;
      }

      const url = new URL('/wp-json/astalla/v1/media', site.baseUrl).toString();

      const form = new FormData();
      form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
      const buffer = form.getBuffer();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'Content-Length': buffer.length.toString(),
          'x-astalla-signature': signBody(site.secret, buffer),
        },
        body: buffer as any,
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        res.status(response.status).json(data);
      } catch (error) {
        res.status(response.status).send(text);
      }
    })
  );

  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    const status = typeof error.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error.message ?? 'Internal Server Error' });
  });

  return app;
};

export const app = createApp();

const port = Number(process.env.PORT ?? 3333);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Astalla API listening on port ${port}`);
  });
}
