/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

interface AppConfig {
  dir: string;
  name: string;
  secrets: string[];
}

const APPS: Record<string, AppConfig> = {
  'ops-brain': {
    dir: 'apps/ops-brain',
    name: 'ops-brain',
    secrets: [
      'OPS_INTERNAL_TOKEN',
      'GATEWAY_TOKEN',
      'CLOUDFLARE_AI_GATEWAY',
      'CLOUDFLARE_ACCOUNT_ID',
      'ALLOWED_DISCORD_IDS',
      'ALLOWED_TELEGRAM_IDS',
      'EXECUTIVE_CHANNEL_ID',
      'DISCORD_EXECUTIVE_ID',
      'CF_GROQ_KEY',
      'CF_OPENROUTER_KEY',
      'CF_GOOGLE_AI_KEY'
    ]
  },
  'ops-bot': {
    dir: 'apps/ops-bot',
    name: 'ops-bot',
    secrets: [
      'OPS_INTERNAL_TOKEN',
      'DISCORD_BOT_TOKEN',
      'DISCORD_PUBLIC_KEY',
      'DISCORD_APP_ID',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_WEBHOOK_SECRET',
      'ALLOWED_DISCORD_IDS',
      'ALLOWED_TELEGRAM_IDS'
    ]
  },
  'ops-mcp': {
    dir: 'apps/ops-mcp',
    name: 'ops-mcp-server',
    secrets: [
      'INTERNAL_OPS_KEY',
      'MEMBER_MCP_KEY',
      'CF_GATEWAY_TOKEN',
      'CF_GATEWAY_NAME',
      'CF_ACCOUNT_ID',
      'DISCORD_BOT_TOKEN',
      'JIRA_API_TOKEN',
      'JIRA_DOMAIN',
      'GITHUB_TOKEN'
    ]
  },
  'ops-gateway': {
    dir: 'apps/ops-gateway',
    name: 'ops-gateway',
    secrets: ['GATEWAY_CLIENT_SECRET', 'ADMIN_TOKEN']
  },
  'ops-dashboard': {
    dir: 'apps/ops-dashboard',
    name: 'ops-dashboard',
    secrets: ['DISCORD_BOT_TOKEN', 'ADMIN_KEY', 'OPS_INTERNAL_TOKEN']
  },
  'agent-ops': {
    dir: 'apps/agents/agent-ops',
    name: 'agent-ops',
    secrets: [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_AI_GATEWAY',
      'GATEWAY_TOKEN',
      'DISCORD_BOT_TOKEN',
      'TELEGRAM_BOT_TOKEN'
    ]
  },
  'agent-executive': {
    dir: 'apps/agents/agent-executive',
    name: 'agent-executive',
    secrets: ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID']
  },
  'agent-lifestyle': {
    dir: 'apps/agents/agent-lifestyle',
    name: 'agent-lifestyle',
    secrets: ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID']
  },
  'agent-growth': {
    dir: 'apps/agents/agent-growth',
    name: 'agent-growth',
    secrets: ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID']
  }
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

const askSecret = (label: string): Promise<string> =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    const canMask = Boolean(stdin.isTTY);

    if (!canMask) {
      rl.question(label, resolve);
      return;
    }

    process.stdout.write(label);
    let buffer = '';

    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      for (const char of text) {
        if (char === '\r' || char === '\n') {
          stdin.removeListener('data', onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(buffer);
          return;
        }
        if (char === '\u0003') {
          stdin.removeListener('data', onData);
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        buffer += char;
        process.stdout.write('*');
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });

function resolveWranglerEntry(app: AppConfig): string | null {
  const candidates = [
    path.join(REPO_ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    path.join(REPO_ROOT, app.dir, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function putCloudflareSecret(app: AppConfig, key: string, value: string): boolean {
  const wrangler = resolveWranglerEntry(app);
  if (!wrangler) {
    console.error(`❌ ${key}: wrangler is not installed. Run \`pnpm install\` first.`);
    return false;
  }

  const result = spawnSync(
    process.execPath,
    [wrangler, 'secret', 'put', key, '--name', app.name],
    {
      cwd: path.join(REPO_ROOT, app.dir),
      input: value,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: false
    }
  );

  if (result.error) {
    console.error(`❌ ${key}: ${result.error.message}`);
    return false;
  }
  return result.status === 0;
}

function toDotEnvLine(key: string, value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `${key}="${escaped}"`;
}

function mergeDevVars(
  filePath: string,
  updates: Record<string, string>
): { body: string; replaced: number } {
  const pending = new Map(Object.entries(updates));
  let replaced = 0;

  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';

  const lines = existing === '' ? [] : existing.split(/\r?\n/);
  const out = lines.map((line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!match) return line;

    const value = pending.get(match[1]);
    if (value === undefined) return line;

    pending.delete(match[1]);
    replaced += 1;
    return toDotEnvLine(match[1], value);
  });

  if (pending.size > 0) {
    if (out.length > 0 && out[out.length - 1] === '') out.pop();
    if (out.length > 0) out.push('');
    for (const [key, value] of pending) out.push(toDotEnvLine(key, value));
  }

  const body = `${out.join('\n').replace(/\n*$/, '')}\n`;
  return { body, replaced };
}

async function main(): Promise<void> {
  console.log('\x1b[36m%s\x1b[0m', '🚀 Alikuxac Secret Setup Tool');
  console.log('  1) Push to Cloudflare (wrangler secret put, via stdin)');
  console.log('  2) Write local .dev.vars (merged with any existing keys)');
  const mode = (await ask('Choose mode [1/2]: ')).trim();
  const isLocal = mode === '2';

  for (const [label, app] of Object.entries(APPS)) {
    console.log(`\x1b[33m\n📦 ${label} (${app.dir})\x1b[0m`);

    const collected: Record<string, string> = {};

    for (const key of app.secrets) {
      const value = (await askSecret(`  🔑 ${key}: `)).trim();
      if (value === '') {
        console.log('     ⏩ skipped');
        continue;
      }
      collected[key] = value;

      if (!isLocal) {
        console.log(putCloudflareSecret(app, key, value) ? '     ✅ uploaded' : '     ❌ failed');
      }
    }

    if (isLocal && Object.keys(collected).length > 0) {
      const filePath = path.join(REPO_ROOT, app.dir, '.dev.vars');
      const { body, replaced } = mergeDevVars(filePath, collected);

      fs.writeFileSync(filePath, body, { mode: 0o600 });
      console.log(`     ✅ ${app.dir}/.dev.vars updated (${replaced} keys replaced)`);
    }
  }

  console.log('\x1b[32m%s\x1b[0m', '\n✨ Done.');
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => rl.close());