import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = join(process.cwd(), 'apps', 'agents');

/**
 * Automates bulk operations for the Alikuxac Workforce
 */
async function manageWorkforce() {
    const command = process.argv[2] || 'deploy';
    const target = process.argv[3]; // Optional: specific agent name

    let agents = readdirSync(AGENTS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    if (target && target !== 'all') {
        if (!agents.includes(target)) {
            console.error(`❌ Agent '${target}' not found in ${AGENTS_DIR}`);
            process.exit(1);
        }
        agents = [target];
    }

    console.log(`🚀 Starting ${command} for ${agents.length === 1 ? agents[0] : 'all agents'}...`);

    for (const agent of agents) {
        try {
            console.log(`\n📦 [${agent.toUpperCase()}] Running ${command}...`);
            const agentPath = join(AGENTS_DIR, agent);

            if (command === 'deploy') {
                execSync(`npx wrangler deploy`, { cwd: agentPath, stdio: 'inherit' });
            } else if (command === 'dev') {
                execSync(`npx wrangler dev`, { cwd: agentPath, stdio: 'inherit' });
            } else if (command === 'build') {
                execSync(`npm run build`, { cwd: agentPath, stdio: 'inherit' });
            } else if (command === 'typegen') {
                execSync(`npm run typegen`, { cwd: agentPath, stdio: 'inherit' });
            } else if (command === 'secret') {
                console.log(`💡 Note: Use 'pnpm run setup' to configure secrets interactively for all agents.`);
            }
        } catch (error: any) {
            console.error(`❌ [${agent}] Failed:`, error.message);
        }
    }

    console.log('\n✅ Operation complete.');
}

manageWorkforce();
