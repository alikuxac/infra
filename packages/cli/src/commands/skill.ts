import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { SKILLS_SOURCE_URL, SKILLS_PATH } from '../constants.js';

/**
 * Ask user for permission to overwrite a file/directory.
 */
async function confirmOverwrite(name: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await rl.question(pc.yellow(`⚠️ Skill '${name}' already exists. Do you want to overwrite it? (y/N): `));
  rl.close();
  
  return answer.toLowerCase() === 'y';
}

/**
 * Download a single file from the source repository.
 */
async function downloadFile(repoPath: string, localPath: string): Promise<boolean> {
  const url = `${SKILLS_SOURCE_URL}/${repoPath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return false;
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }
    
    const content = await res.text();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, content);
    return true;
  } catch (err) {
    console.error(pc.red(`  ❌ Failed to download ${repoPath}: ${err instanceof Error ? err.message : String(err)}`));
    return false;
  }
}

/**
 * Install a single skill.
 */
async function installSkill(name: string): Promise<boolean> {
  const targetDir = path.join(process.cwd(), SKILLS_PATH, name);
  
  if (fs.existsSync(targetDir)) {
    const shouldOverwrite = await confirmOverwrite(name);
    if (!shouldOverwrite) {
      console.log(pc.blue(`  ⏭️ Skipping skill '${name}'.`));
      return false;
    }
    // Remove if it's a dir or file to start clean
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  console.log(pc.cyan(`  ⬇️ Downloading skill: ${name}...`));
  
  // Try to download manifest first or just fallback to SKILL.md
  // For simplicity, we assume SKILL.md is mandatory
  const skillMdPath = `skills/${name}/SKILL.md`;
  const localMdPath = path.join(targetDir, 'SKILL.md');
  
  const success = await downloadFile(skillMdPath, localMdPath);
  
  if (success) {
    console.log(pc.green(`  ✅ Successfully installed skill '${name}'!`));
    return true;
  } else {
    console.error(pc.red(`  ❌ Skill '${name}' not found in the repository.`));
    return false;
  }
}

/**
 * Install a bundle of skills.
 */
async function installBundle(bundleName: string): Promise<void> {
  console.log(pc.cyan(`📦 Installing bundle: ${bundleName}...`));
  
  const bundleUrl = `bundles/${bundleName}.json`;
  const url = `${SKILLS_SOURCE_URL}/${bundleUrl}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Bundle '${bundleName}' not found (HTTP ${res.status})`);
    }
    
    const skills = await res.json() as string[];
    
    if (!Array.isArray(skills)) {
      throw new Error(`Invalid bundle format (expected a JSON array)`);
    }
    
    console.log(pc.blue(`  🔍 Found ${skills.length} skills in bundle.`));
    
    for (const skillName of skills) {
      await installSkill(skillName);
    }
    
    console.log(pc.green(`✅ Bundle '${bundleName}' installation complete!`));
  } catch (err) {
    console.error(pc.red(`❌ Bundle installation failed: ${err instanceof Error ? err.message : String(err)}`));
  }
}

export const skillCommand = new Command('skill')
  .description('Manage skills for AI agents');

skillCommand.command('install')
  .description('Install a skill into the current project')
  .argument('<name>', 'Skill or bundle name')
  .option('-b, --bundle', 'Install a bundle (multiple skills)')
  .action(async (name, options) => {
    if (options.bundle) {
      await installBundle(name);
    } else {
      await installSkill(name);
    }
  });
