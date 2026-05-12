# Alikuxac Infrastructure (Infra)

A monorepo for infrastructure tools, automation, and a **Personal Agent Force** designed to serve as my own high-performance, decentralized workforce.

> [!WARNING]
> This project is purely **experimental** and intended for personal learning, internal experimentation, and serving my own workflows at `alikuxac`. It is **NOT** production-ready and comes with no guarantees of stability or security for general public use.

## Project Vision

This monorepo serves as a playground for building modern, type-safe infrastructure utilities and intelligent agents using TypeScript, Hono, and Cloudflare Workers. 

## Repository Structure

- **[apps/agents](file:///d:/Github/infra/apps/agents)**: A decentralized workforce of specialized AI agents (Executive, Growth, Lifestyle, Ops) built with Durable Objects.
- **[apps/ops-brain](file:///d:/Github/infra/apps/ops-brain)**: The central intelligence and memory layer for the agent ecosystem.
- **[apps/ops-gateway](file:///d:/Github/infra/apps/ops-gateway)**: A lightweight API Gateway and messaging hub handling Discord/Telegram/Compass integrations.
- **[apps/ops-dashboard](file:///d:/Github/infra/apps/ops-dashboard)**: A standalone administrative dashboard built with TanStack Start.
- **[packages/cli](file:///d:/Github/infra/packages/cli)**: `ali` - A modular CLI tool for common infrastructure tasks.
- **[packages/ai-core](file:///d:/Github/infra/packages/ai-core)**: Core AI orchestration logic and provider integrations (Google, OpenRouter, Groq).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 20.0.0)
- [pnpm](https://pnpm.io/) (>= 9.15.0)
- [Turbo](https://turbo.build/) (Global or via pnpm)

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## CI/CD Strategy

This repository utilizes a dual-workflow strategy to ensure stability:

- **CI**: Automated Linting and Building on every push to `development` and all `pull_requests`.
- **Release**: Automated versioning and NPM publishing via **Changesets**, triggered only on the `master` branch.

## License

[MIT License](file:///d:/Github/infra/LICENSE) - Copyright (c) 2026 alikuxac

