# Alikuxac Infrastructure (Infra)

A monorepo for infrastructure tools and automation, including a custom CLI and GitHub Actions for Atlassian Compass.

> [!WARNING]
> This project is purely **experimental** and intended for personal learning and internal experimentation at `alikuxac`. It is **NOT** production-ready and comes with no guarantees of stability or security for general public use.

## Project Vision

This monorepo serves as a playground for building modern, type-safe infrastructure utilities using TypeScript, Hono, and Cloudflare Workers. 

## Repository Structure

- **[apps/ops-gateway](file:///d:/Github/infra/apps/ops-gateway)**: A lightweight API Gateway built with Hono and deployed on Cloudflare Workers. It handles Atlassian Compass events with repository ownership verification via Cloudflare KV.
- **[packages/cli](file:///d:/Github/infra/packages/cli)**: `ali` - A modular CLI tool for common infrastructure tasks (e.g., repository cleanup, project initialization).
- **[packages/actions/notify-compass](file:///d:/Github/infra/packages/actions/notify-compass)**: A GitHub Action to notify Atlassian Compass about deployment and build events.
- **[packages/actions/notify-compass-internal](file:///d:/Github/infra/packages/actions/notify-compass-internal)**: An internal version of the Compass notification action with enhanced security whitelisting and auto-detection logic.
- **[packages/shared-types](file:///d:/Github/infra/packages/shared-types)**: Common TypeScript definitions shared across the monorepo.

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

