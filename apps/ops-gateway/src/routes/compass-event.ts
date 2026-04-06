import { Hono } from 'hono';
import type { BaseEventInput, RepoConfig } from '../types/env';
import { ownershipGuard } from '../middleware/security';
import { resolveComponentId } from '../services/kv';
import { sendEvent } from '../services/compass';

type Variables = {
  repoConfig: RepoConfig;
};

const compassEvent = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply ownership guard
compassEvent.use('*', ownershipGuard(
  async (c) => {
    const body = await c.req.parseBody() as Record<string, unknown>;
    return (c.req.query('repoId') || body.repoId) as string;
  },
  async (c) => {
    const body = await c.req.parseBody() as Record<string, unknown>;
    return (c.req.query('owner') || body.owner) as string;
  }
));

compassEvent.post('/', async (c) => {
  const input = await c.req.json<BaseEventInput>();

  // Filter Rule: Block pull requests
  if (input.type === 'pullRequest') {
    return c.json({ error: 'Pull requests not supported' }, 400);
  }

  // Get repo config from context (set by ownershipGuard)
  const repoConfig = c.get('repoConfig');

  // Resolve component ID
  const componentId = resolveComponentId(repoConfig, input.path);

  // Resolve external ID (Critical for deduplication)
  const externalEventSourceId =
    input.externalId ||
    (input.meta?.id as string) ||
    `${input.repoId}-${input.type}-${Date.now()}`;

  // Common fields
  const baseEventData = {
    displayName: input.meta?.title || `${input.type} event`,
    description: input.description || (input.meta?.description as string) || '',
    lastUpdated: new Date().toISOString(),
    updateSequenceNumber: Date.now(),
    externalEventSourceId,
    url: input.meta?.url as string,
  };

  let specificEventData: Record<string, unknown> = {};

  // Type-specific fields
  if (input.type === 'deployment') {
    specificEventData = {
      state: input.status || 'SUCCESSFUL',
      environment: {
        category: input.meta?.environmentCategory || 'PRODUCTION',
        displayName: (input.meta?.environmentName as string) || 'Production',
      },
      pipeline: {
        id: (input.meta?.pipelineId as string) || 'default-pipeline',
        displayName: 'Default Pipeline',
        url: input.meta?.url as string,
      }
    };
  } else if (input.type === 'build') {
    specificEventData = {
      state: input.status || 'SUCCESSFUL',
      startedAt: new Date().toISOString(),
      buildNumber: input.meta?.buildNumber || Date.now().toString(),
      pipeline: {
        id: (input.meta?.pipelineId as string) || 'default-pipeline',
        displayName: 'Default Pipeline',
        url: input.meta?.url as string,
      }
    };
  } else if (input.type === 'incident') {
    specificEventData = {
      severity: input.meta?.severity || 'MEDIUM', // CRITICAL, HIGH, MEDIUM, LOW
      state: input.status || 'OPEN',
    };
  } else if (input.type === 'alert') {
    specificEventData = {
      category: input.meta?.category || 'MONITORING',
      level: input.meta?.level || 'WARNING', // CRITICAL, WARNING, INFO
      state: input.status || 'OPEN',
    };
  }

  const payload = {
    cloudId: c.env.COMPASS_CLOUD_ID,
    componentId,
    event: {
      [input.type]: {
        ...baseEventData,
        ...specificEventData,
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
    return c.json({ error: 'Failed to send event to Compass', details: error }, 500);
  }

  return c.json({ success: true, componentId });
});

export default compassEvent;
