#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...opts }).trim();
}

function currentTags() {
  const out = git(["tag", "--list", "v*", "--sort=-v:refname"]);
  return out === "" ? [] : out.split(/\r?\n/);
}

function parse(version) {
  const match = SEMVER.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bump(version, level) {
  const parts = parse(version);
  if (!parts) return null;
  const [major, minor, patch] = parts;
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const ask = (query) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tags = currentTags();
const latest = tags.find((tag) => parse(tag.slice(1)));
const base = latest ? latest.slice(1) : pkg.version;

const derived = {
  patch: bump(base, "patch"),
  minor: bump(base, "minor"),
  major: bump(base, "major"),
};

console.log(`current root version : ${pkg.version}`);
console.log(`latest tag           : ${latest ?? "(none)"}`);
console.log("");
console.log(`  patch -> ${derived.patch}`);
console.log(`  minor -> ${derived.minor}`);
console.log(`  major -> ${derived.major}`);
console.log("");

const answer = (await ask("release as [patch/minor/major or explicit x.y.z]: ")) || "patch";
const next = derived[answer] ?? (parse(answer) ? answer : null);

if (!next) {
  console.error(`Invalid version or level: ${answer}`);
  process.exit(1);
}

const tag = `v${next}`;
if (tags.includes(tag)) {
  console.error(`Tag already exists: ${tag}`);
  process.exit(1);
}

const status = git(["status", "--porcelain"]);
if (status !== "") {
  console.error("Working tree is dirty. Commit or stash changes before releasing.");
  process.exit(1);
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const confirm = await ask(`Create annotated tag ${tag} on ${branch}? [y/N]: `);
if (confirm.toLowerCase() !== "y") {
  console.log("Aborted.");
  process.exit(0);
}

git(["tag", "-a", tag, "-m", `Release ${tag}`]);
console.log(`Created tag ${tag}`);
console.log(`Push it with: git push origin ${tag}`);