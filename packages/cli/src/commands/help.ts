import { Command } from 'commander';
import pc from 'picocolors';

export const helpCommand = new Command('help')
  .description('Show help and guide for Alikuxac CLI')
  .action(() => {
    console.log(pc.bold(pc.magenta('\n🚀 Alikuxac Infrastructure CLI Tool')));
    console.log(pc.gray('The ultimate tool for monorepo and infrastructure management.\n'));

    console.log(pc.cyan('Commands:'));
    console.log(pc.yellow('  ali nuke [dir] ') + pc.white(' - Remove build artifacts (node_modules, dist, etc.)'));
    console.log(pc.yellow('  ali init       ') + pc.white(' - Initialize project with template files'));
    console.log(pc.yellow('  ali help       ') + pc.white(' - Show this help message'));

    console.log(pc.cyan('\nGlobal Options:'));
    console.log(pc.white('  -V, --version  ') + pc.gray(' - Output current version'));
    console.log(pc.white('  -h, --help     ') + pc.gray(' - Display help for command'));

    console.log(pc.blue('\nDocumentation: ') + pc.underline('https://github.com/alikuxac/infra'));
    console.log(pc.magenta('Support: ') + pc.white('admin@alikuxac.xyz\n'));
  });
