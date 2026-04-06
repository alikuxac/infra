import { Hono } from 'hono';
import type { RepoConfig } from '../types/env';
import { verifyAdmin } from '../middleware/security';
import { getRepoConfig, setRepoConfig, deleteRepoConfig, listAllRepoConfigs } from '../services/kv';

const admin = new Hono<{ Bindings: Env }>();

// Apply admin auth to all routes
admin.use('*', verifyAdmin);

// List all repository configs
admin.get('/repos', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = parseInt(c.req.query('limit') || '100');

  const result = await listAllRepoConfigs(c.env.COMPASS_REGISTRY, cursor, limit);

  return c.json(result);
});

// Get specific repository config
admin.get('/repos/:repoId', async (c) => {
  const repoId = c.req.param('repoId');

  const config = await getRepoConfig(c.env.COMPASS_REGISTRY, repoId);

  if (!config) {
    return c.json({ error: 'Repository not found' }, 404);
  }

  return c.json(config);
});

// Create or update repository config
admin.post('/repos', async (c) => {
  const body = await c.req.json<{ repoId: string; name: string; owner: string; mapping: Record<string, string> }>();

  // Validate required fields
  if (!body.repoId || !body.name || !body.owner || !body.mapping) {
    return c.json({ error: 'Missing required fields: repoId, name, owner, mapping' }, 400);
  }

  const config: RepoConfig = {
    name: body.name,
    owner: body.owner,
    mapping: body.mapping,
  };

  await setRepoConfig(c.env.COMPASS_REGISTRY, body.repoId, config);

  return c.json({ success: true, repoId: body.repoId }, 201);
});

// Delete repository config
admin.delete('/repos/:repoId', async (c) => {
  const repoId = c.req.param('repoId');

  // Check if exists
  const config = await getRepoConfig(c.env.COMPASS_REGISTRY, repoId);

  if (!config) {
    return c.json({ error: 'Repository not found' }, 404);
  }

  await deleteRepoConfig(c.env.COMPASS_REGISTRY, repoId);

  return c.body(null, 204);
});

export default admin;
