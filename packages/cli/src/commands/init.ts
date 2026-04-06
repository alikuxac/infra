import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';

export const initCommand = new Command('init')
  .description('Initialize a new infrastructure project')
  .action(() => {
    const cwd = process.cwd();
    const envExample = 'GATEWAY_URL=http://localhost:8787\nGATEWAY_SECRET=your_secret_here\n';
    
    console.log(pc.cyan(`🚀 Initializing project in: ${cwd}`));
    
    try {
      if (!fs.existsSync(path.join(cwd, '.env.example'))) {
        fs.writeFileSync(path.join(cwd, '.env.example'), envExample);
        console.log(pc.green('  Created .env.example'));
      } else {
        console.log(pc.yellow('  .env.example already exists, skipping.'));
      }
      
      console.log(pc.green('✅ Project initialized successfully!'));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`❌ Error during init: ${message}`));
    }
  });
