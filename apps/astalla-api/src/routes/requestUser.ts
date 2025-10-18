import type { Request, Response } from 'express';

const sanitizeUserId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

interface ResolveUserOptions {
  fallbackTo?: string | null;
}

export const resolveUserId = (req: Request, options?: ResolveUserOptions): string | null => {
  const explicitUserId = sanitizeUserId((req as any).user?.id);
  if (explicitUserId) {
    return explicitUserId;
  }

  const headerUserId = sanitizeUserId(req.header('x-user-id'));
  if (headerUserId) {
    return headerUserId;
  }

  const fallbackUserId = sanitizeUserId(options?.fallbackTo);
  if (fallbackUserId) {
    return fallbackUserId;
  }

  return null;
};

interface EnsureUserOptions extends ResolveUserOptions {}

export const ensureUser = (
  req: Request,
  res: Response,
  options?: EnsureUserOptions,
): string | null => {
  const userId = resolveUserId(req, options);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  return userId;
};
