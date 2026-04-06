import type { RepoConfig } from '../types/env';

/**
 * Get repository configuration from KV by repository ID
 */
export async function getRepoConfig(
  kv: KVNamespace,
  repoId: string
): Promise<RepoConfig | null> {
  const configJson = await kv.get(repoId);

  if (!configJson) {
    return null;
  }

  return JSON.parse(configJson) as RepoConfig;
}

/**
 * Set repository configuration in KV
 */
export async function setRepoConfig(
  kv: KVNamespace,
  repoId: string,
  config: RepoConfig
): Promise<void> {
  await kv.put(repoId, JSON.stringify(config));
}

/**
 * Delete repository configuration from KV
 */
export async function deleteRepoConfig(
  kv: KVNamespace,
  repoId: string
): Promise<void> {
  await kv.delete(repoId);
}

/**
 * List all repository configurations with pagination
 * CRITICAL: Uses KV list() API for pagination
 */
export async function listAllRepoConfigs(
  kv: KVNamespace,
  cursor?: string,
  limit: number = 100
): Promise<{ repos: { repoId: string; config: RepoConfig }[]; cursor?: string }> {
  const listResult = await kv.list({ cursor, limit });

  const repos: { repoId: string; config: RepoConfig }[] = [];

  for (const key of listResult.keys) {
    const configJson = await kv.get(key.name);
    if (configJson) {
      repos.push({
        repoId: key.name,
        config: JSON.parse(configJson) as RepoConfig,
      });
    }
  }

  return {
    repos,
    cursor: listResult.list_complete ? undefined : listResult.cursor,
  };
}

/**
 * Resolve component ID from repo config based on path
 * Matches longest prefix or falls back to 'root'
 */
export function resolveComponentId(
  config: RepoConfig,
  path?: string
): string {
  // 1. Try to find longest matching prefix if path is provided
  if (path) {
    let longestMatch = '';
    let matchId = '';

    for (const [prefix, id] of Object.entries(config.mapping)) {
      if (prefix === 'root') continue;

      if (path.startsWith(prefix) && prefix.length > longestMatch.length) {
        longestMatch = prefix;
        matchId = id;
      }
    }

    if (matchId) {
      return matchId;
    }
  }

  // 2. Fallback to root or first available mapping
  return config.mapping.root || Object.values(config.mapping)[0];
}
