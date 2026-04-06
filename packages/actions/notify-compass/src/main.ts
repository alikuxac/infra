import * as core from '@actions/core';
import * as github from '@actions/github';
import type { BaseEventInput } from '@alikuxac/shared-types';

async function run(): Promise<void> {
  try {
    const type = core.getInput('type', { required: true }) as import('@alikuxac/shared-types').EventType;
    const status = core.getInput('status', { required: true });
    const gatewayUrl = core.getInput('gateway-url', { required: true });
    const gatewaySecret = core.getInput('gateway-secret', { required: true });
    const path = core.getInput('path');

    const { owner, repo } = github.context.repo;
    const repoId = github.context.payload.repository?.id?.toString() || '';

    const payload: BaseEventInput = {
      type,
      repoId,
      owner,
      status,
      path,
      externalId: github.context.runId.toString(),
      meta: {
        title: `${github.context.workflow} - ${github.context.job}`,
        url: `${github.context.serverUrl}/${owner}/${repo}/actions/runs/${github.context.runId}`,
        runId: github.context.runId,
        workflow: github.context.workflow,
      }
    };

    core.info(`Sending ${type} event to Ops Gateway...`);

    const response = await fetch(`${gatewayUrl}/compass/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GATEWAY-SECRET': gatewaySecret
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway returned ${response.status}: ${error}`);
    }

    core.info('✅ Event sent successfully to Compass');
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
