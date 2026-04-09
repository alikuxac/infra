/**
 * Configuration for different programming languages and their build/temporary artifacts.
 */
export const LANGUAGES: Record<string, { indicators: string[], targets: string[] }> = {
  nodejs: {
    indicators: ['package.json', 'pnpm-workspace.yaml', 'yarn.lock', 'package-lock.json'],
    targets: ['node_modules', 'dist', '.turbo', '.cache', 'build', 'out']
  },
  python: {
    indicators: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    targets: ['__pycache__', '.venv', 'venv', '.env', '.pytest_cache', '.mypy_cache', '.ruff_cache']
  },
  rust: {
    indicators: ['Cargo.toml'],
    targets: ['target']
  },
  dotnet: {
    indicators: ['*.csproj', '*.sln', '*.fsproj'],
    targets: ['bin', 'obj']
  },
  java: {
    indicators: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    targets: ['target', 'bin', '.gradle', 'build']
  },
  golang: {
    indicators: ['go.mod'],
    targets: ['bin', 'vendor']
  },
  cpp: {
    indicators: ['CMakeLists.txt', 'Makefile', 'configure.ac'],
    targets: ['build', 'bin', 'obj', 'out', '.deps', '.libs']
  }
};

export const SKILLS_SOURCE_URL = 'https://raw.githubusercontent.com/alikuxac/skills/main';
export const SKILLS_PATH = '.agent/skills';
