import type { CompassEventPayload } from '../types/env';

interface CompassAuth {
  email: string;
  token: string;
}

/**
 * Send event to Atlassian Compass API
 * @param siteName - Atlassian site name (e.g., "yourcompany" for yourcompany.atlassian.net)
 * @param payload - Compass event payload (includes cloudId)
 * @param auth - Atlassian credentials
 */
export async function sendEvent(
  siteName: string,
  payload: CompassEventPayload,
  auth: CompassAuth
): Promise<Response> {
  // Construct URL with site name
  const url = `https://${siteName}.atlassian.net/gateway/api/compass/v1/events`;

  // Basic auth: base64(email:token)
  const credentials = btoa(`${auth.email}:${auth.token}`);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });
}
