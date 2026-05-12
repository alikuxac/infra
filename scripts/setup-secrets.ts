/// <reference types="node" />
import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

interface SecretConfig {
  [app: string]: string[];
}

const CONFIG: SecretConfig = {
  'ops-brain': [
    'GATEWAY_TOKEN',
    'CLOUDFLARE_AI_GATEWAY',
    'CLOUDFLARE_ACCOUNT_ID',
    'ALLOWED_DISCORD_IDS',
    'ALLOWED_TELEGRAM_IDS',
    'EXECUTIVE_CHANNEL_ID',
    'DISCORD_EXECUTIVE_ID'
  ],
  'ops-mcp': [
    'CF_GATEWAY_TOKEN',
    'CF_GATEWAY_NAME',
    'CF_ACCOUNT_ID',
    'JIRA_API_TOKEN',
    'JIRA_DOMAIN',
    'GITHUB_TOKEN'
  ],
  'agent-executive': ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID'],
  'agent-ops': ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID'],
  'agent-lifestyle': ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID'],
  'agent-growth': ['CF_GATEWAY_TOKEN', 'CF_GATEWAY_NAME', 'CF_ACCOUNT_ID'],
  'ops-bot': [
    'DISCORD_BOT_TOKEN',
    'DISCORD_PUBLIC_KEY',
    'TELEGRAM_BOT_TOKEN',
    'ALLOWED_DISCORD_IDS',
    'ALLOWED_TELEGRAM_IDS'
  ]
};

async function main(): Promise<void> {
  console.log('\x1b[36m%s\x1b[0m', '🚀 Ops AI Secret Setup Tool');
  const mode = await ask('Choose mode (1: Cloudflare Secrets, 2: Local .dev.vars): ');
  const isLocal = mode === '2';

  for (const [app, secrets] of Object.entries(CONFIG)) {
    console.log(`\x1b[33m📦 Configuring ${isLocal ? 'local vars' : 'secrets'} for: ${app}\x1b[0m`);
    let devVarsContent = '';

    for (const secret of secrets) {
      const value = await ask(`🔑 Enter value for ${secret}: `);
      if (value && value.trim() !== '') {
        const trimmedValue = value.trim();
        if (isLocal) {
          devVarsContent += `${secret}="${trimmedValue}"\n`;
        } else {
          try {
            const command = `echo ${trimmedValue} | npx wrangler secret put ${secret} --name ${app}`;
            execSync(command, { stdio: 'inherit' });
            console.log(`✅ ${secret} has been set!\n`);
          } catch (e: unknown) {
            console.error(`❌ Error setting ${secret}:`, e instanceof Error ? e.message : e);
          }
        }
      } else {
        console.log(`⏩ Skipping ${secret}.\n`);
      }
    }

    if (isLocal && devVarsContent) {
      const fs = await import('fs');
      const path = await import('path');
      const appDir = app.startsWith('agent-') ? `apps/agents/${app}` : `apps/${app}`;
      const filePath = path.join(process.cwd(), appDir, '.dev.vars');
      fs.writeFileSync(filePath, devVarsContent);
      console.log(`✅ ${appDir}/.dev.vars has been generated!\n`);
    }
  }

  console.log('\x1b[32m%s\x1b[0m', '✨ All processes complete!');
  rl.close();
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
