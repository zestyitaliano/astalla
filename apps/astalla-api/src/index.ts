import express, { NextFunction, Request, Response, type RequestHandler } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import { createHmac, randomUUID } from 'crypto';
import { Site } from './types.js';
import { registerColumnRoutes } from './routes/columns.js';
import { registerReferenceRoutes } from './routes/references.js';
import { registerRowRoutes } from './routes/rows.js';
import { tablesRouter } from './routes/tables.js';
import { schemaRouter } from './routes/schema.js';
import { introspectionRouter } from './routes/introspection.js';
import { authRouter } from './routes/auth.js';

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
  app.locals.schemaFallbackUserId = fallbackUserId;
  const requireSite = (id: string): Site => {
    const site = sites.get(id);
    if (!site) {
      throw Object.assign(new Error('Site not found'), { status: 404 });
    }
    return site;
  };

  app.get('/health', (_req, res) => {
    res.status(200).type('text/plain').send('ok');
  });

  app.use((req, _res, next) => {
    console.log('[API]', req.method, req.originalUrl);
    next();
  });

  app.use(express.json());

  if (options?.beforeRoutes) {
    for (const handler of options.beforeRoutes) {
      app.use(handler);
    }
  }

  app.use('/auth', authRouter);
  app.use('/api/tables', tablesRouter);
  app.use('/api/schema', schemaRouter);
  app.use('/__routes', introspectionRouter);
  registerReferenceRoutes(app);
  registerColumnRoutes(app);
  registerRowRoutes(app);

  app.get('/sites', (req, res) => {
    res.json(Array.from(sites.values()));
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

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found', error: 'Not Found', statusCode: 404 });
  });

  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    const status = typeof error.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error.message ?? 'Internal Server Error' });
  });

  return app;
};

export const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    console.log(`[API] listening on http://${HOST}:${PORT}`);
  });

  const shutdown = (signal: string) => () => {
    console.log(`[API] received ${signal}, shutting down...`);
    server.close(() => {
      console.log('[API] server closed');
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}
