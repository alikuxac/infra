import * as core from '@actions/core';
import * as github from '@actions/github';
import type { BaseEventInput } from '@alikuxac/shared-types';

async function run(): Promise<void> {
  try {
    const status = core.getInput('status', { required: true });
    const gatewaySecret = core.getInput('gateway-secret', { required: true });
    const path = core.getInput('path');

    // Auto-detection & flexible lookup (Input or ENV variable)
    const gatewayUrl = core.getInput('gateway-url') || process.env.OPS_GATEWAY_URL;
    if (!gatewayUrl) {
      throw new Error('Ops Gateway URL is not specified via input "gateway-url" or environment variable "OPS_GATEWAY_URL".');
    }
    
    let type: string | undefined = core.getInput('type');
    if (!type) {
      const { eventName } = github.context;
      if (eventName === 'pull_request') type = 'build';
      else if (eventName === 'push' || eventName === 'workflow_dispatch') type = 'deployment';
      else type = 'deployment';
    }

    const { owner, repo } = github.context.repo;
    const repoId = github.context.payload.repository?.id?.toString() || '';

    const payload: BaseEventInput = {
      type: type as BaseEventInput['type'],
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

