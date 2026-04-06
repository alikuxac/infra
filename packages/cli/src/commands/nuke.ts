import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGES } from '../constants.js';

export const nukeCommand = new Command('nuke')
  .description('Nuke build directories and temporary files')
  .argument('[directory]', 'Root directory to start nuking')
  .option('-r, --recursive', 'Search and nuke recursively in subdirectories', false)
  .option('--dry-run', 'List files to be deleted without actually deleting them', false)
  .option('--only <language>', 'Only nuke artifacts for a specific language (nodejs, python, rust, dotnet, java, golang, cpp)')
  .action((directory, options) => {
    const targetDir = directory ? path.resolve(process.cwd(), directory) : process.cwd();
    let nukeCount = 0;

    console.log(pc.yellow(`☢️ Preparation for nuking in: ${targetDir}`));
    if (options.only) {
      console.log(pc.cyan(`🎯 Filtering by language: ${options.only}`));
    }

    const getTargetsForDir = (dir: string): string[] => {
      const files = fs.readdirSync(dir);
      let activeTargets: string[] = [];

      for (const [lang, config] of Object.entries(LANGUAGES)) {
        if (options.only && options.only !== lang) continue;

        const isMatch = config.indicators.some(indicator => {
          if (indicator.includes('*')) {
            const regex = new RegExp('^' + indicator.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return files.some(f => regex.test(f));
          }
          return files.includes(indicator);
        });

        if (isMatch) {
          activeTargets = [...activeTargets, ...config.targets];
        }
      }
      
      // Default to nodejs targets if no specific language detected but not filtered
      if (activeTargets.length === 0 && !options.only) {
        activeTargets = LANGUAGES.nodejs.targets;
      }

      return [...new Set(activeTargets)];
    };

    const runNuke = (dir: string) => {
      const targets = getTargetsForDir(dir);
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.lstatSync(fullPath);

          if (stat.isDirectory()) {
            if (targets.includes(file)) {
              nukeCount++;
              console.log(pc.red(`  [${options.dryRun ? 'DRY-RUN' : 'NUKE'}] ${fullPath}`));
              if (!options.dryRun) {
                fs.rmSync(fullPath, { recursive: true, force: true });
              }
            } else if (options.recursive && !file.startsWith('.') && file !== 'node_modules') {
              runNuke(fullPath);
            }
          }
        } catch (e: unknown) {
          // Skip inaccessible files
        }
      }
    };

    try {
      runNuke(targetDir);
      if (nukeCount === 0) {
        console.log(pc.yellow('✨ Nothing to nuke! Clean as a whistle.'));
      } else {
        console.log(pc.green(`✅ ${options.dryRun ? 'Found' : 'Nuked'} ${nukeCount} target directories!`));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`❌ Error during nuke: ${message}`));
    }
  });
