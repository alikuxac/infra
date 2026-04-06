import { Hono } from 'hono';
import type { CustomEventInput, RepoConfig } from '../types/env';
import { ownershipGuard } from '../middleware/security';
import { resolveComponentId } from '../services/kv';
import { sendEvent } from '../services/compass';

type Variables = {
  repoConfig: RepoConfig;
};

const compassCustom = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply ownership guard
compassCustom.use('*', ownershipGuard(
  async (c) => {
    const body = await c.req.parseBody() as Record<string, unknown>;
    return (c.req.query('repoId') || body.repoId) as string;
  },
  async (c) => {
    const body = await c.req.parseBody() as Record<string, unknown>;
    return (c.req.query('owner') || body.owner) as string;
  }
));

compassCustom.post('/', async (c) => {
  const input = await c.req.json<CustomEventInput>();

  // Get repo config from context
  const repoConfig = c.get('repoConfig');

  // Resolve component ID based on path
  const componentId = resolveComponentId(repoConfig, input.path);

  // Build strict custom event payload
  const payload = {
    cloudId: c.env.COMPASS_CLOUD_ID,
    componentId,
    event: {
      custom: {
        displayName: input.title,
        description: input.description || '',
        lastUpdated: new Date().toISOString(),
        updateSequenceNumber: Date.now(),
        url: input.url,
        externalEventSourceId: input.customId,
        customEventProperties: {
          id: input.customId,
          icon: input.icon || 'INFO',
        },
      },
    },
  };

  // Send to Compass API
  const response = await sendEvent(
    c.env.ATLASSIAN_SITE_NAME,
    payload,
    {
      email: c.env.ATLASSIAN_EMAIL,
      token: c.env.ATLASSIAN_TOKEN,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return c.json({ error: 'Failed to send custom event to Compass', details: error }, 500);
  }

  return c.json({ success: true, componentId });
});

export default compassCustom;
