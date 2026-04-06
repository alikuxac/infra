import type { Context, MiddlewareHandler } from 'hono';
import type { RepoConfig } from '../types/env';

/**
 * Verify X-GATEWAY-SECRET header
 */
export const verifyGatewaySecret: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const secret = c.req.header('X-GATEWAY-SECRET');

  if (!secret || secret !== c.env.GATEWAY_CLIENT_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};

/**
 * Verify admin token for admin endpoints
 */
export const verifyAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  if (token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
};

/**
 * Ownership Guard Middleware
 * Verifies that the request owner matches the repo config owner
 */
export const ownershipGuard = (
  getRepoId: (c: Context) => string | Promise<string>,
  getOwner: (c: Context) => string | Promise<string>
): MiddlewareHandler<{ Bindings: Env; Variables: { repoConfig: RepoConfig } }> => {
  return async (c, next) => {
    const repoId = await getRepoId(c);
    const owner = await getOwner(c);

    if (!repoId || !owner) {
      return c.json({ error: 'Missing repoId or owner' }, 400);
    }

    // Fetch repo config from KV
    const configJson = await c.env.COMPASS_REGISTRY.get(repoId);

    if (!configJson) {
      return c.json({ error: 'Repository not found' }, 404);
    }

    const config = JSON.parse(configJson) as RepoConfig;

    // Ownership verification
    if (config.owner !== owner) {
      return c.json({ error: 'Ownership verification failed' }, 403);
    }

    // Store config in context for later use
    c.set('repoConfig', config);

    await next();
  };
};
