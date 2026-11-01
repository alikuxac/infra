import nodeCrypto from "node:crypto";
import { Env } from "./types.js";

/**
 * Constant-time equality check to prevent timing attacks across environments
 */
export async function constantTimeEquals(presented: string, expected: string | undefined): Promise<boolean> {
  if (!expected || !presented) {
    return false;
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(presented);
  const b = encoder.encode(expected);

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const subtleWithTiming = crypto?.subtle as unknown as { timingSafeEqual?: (x: ArrayBufferView, y: ArrayBufferView) => boolean } | undefined;
  if (typeof subtleWithTiming?.timingSafeEqual === "function") {
    return subtleWithTiming.timingSafeEqual(a, b);
  }

  if (typeof nodeCrypto?.timingSafeEqual === "function") {
    return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

/**
 * Extracts bearer token or API key from HTTP headers
 */
export function extractPresentedKey(headers: Headers): string | null {
  const authHeader = headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  const apiKeyHeader = headers.get("x-api-key");
  if (apiKeyHeader?.trim()) {
    return apiKeyHeader.trim();
  }

  return null;
}

/**
 * Verifies if incoming request has valid authentication
 */
export async function isRequestAuthorized(request: Request, env: Env): Promise<boolean> {
  const expectedKey = env.DISCORD_MCP_KEY;
  if (!expectedKey) {
    return false;
  }

  const presentedKey = extractPresentedKey(request.headers);
  if (!presentedKey) {
    return false;
  }

  return constantTimeEquals(presentedKey, expectedKey);
}

/**
 * Produces standardized JSON-RPC 401 Unauthorized Response
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: "Unauthorized: Invalid or missing API Key"
      }
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="discord-mcp"'
      }
    }
  );
}
