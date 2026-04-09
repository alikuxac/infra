#!/usr/bin/env node
import { Command } from 'commander';
import { nukeCommand } from './commands/nuke.js';
import { initCommand } from './commands/init.js';
import { helpCommand } from './commands/help.js';
import { skillCommand } from './commands/skill.js';

const program = new Command();

program
  .name('ali')
  .description('Alikuxac Infrastructure CLI Tool')
  .version('0.0.1')
  .helpCommand(false); // Disable default help command to use our custom one

// Register commands
program.addCommand(nukeCommand);
program.addCommand(initCommand);
program.addCommand(helpCommand);
program.addCommand(skillCommand);

program.parse();
