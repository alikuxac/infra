# ops-gateway

API Gateway & Security Hub - Cloudflare Worker

## Features

- **Repository ID-based Security**: KV lookup by GitHub repository ID
- **Ownership Guard**: Prevents repo transfer exploits
- **Admin CRUD API**: Manage repository configurations and mappings
- **Health Monitoring**: Public status endpoints

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create KV Namespace

```bash
wrangler kv:namespace create "COMPASS_REGISTRY"
```

Copy the namespace ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "COMPASS_REGISTRY"
id = "YOUR_NAMESPACE_ID"
```

### 3. Set Secrets

Run the following commands to set the required secrets:

```bash
# Gateway Auth
wrangler secret put GATEWAY_CLIENT_SECRET
wrangler secret put ADMIN_TOKEN
```

## Development

```bash
pnpm dev
```

## Deployment

```bash
pnpm deploy
```

## API Endpoints

### Public

- `GET /health` - Health check

### Admin (Bearer Token)

- `GET /admin/repos` - List all repository configs
- `GET /admin/repos/:repoId` - Get specific config
- `POST /admin/repos` - Create/Update config
- `DELETE /admin/repos/:repoId` - Delete config

## Example: Seed Repository Config (Monorepo)

```bash
# 123456789 is the GitHub Repository ID (numeric)
curl -X POST https://your-worker.workers.dev/admin/repos \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repoId": "123456789",
    "name": "alikuxac/infra",
    "owner": "alikuxac",
    "mapping": {
      "root": "...",
      "apps/ops-gateway": "..."
    }
  }'
```

## Architecture

```
Request → Gateway Auth → Ownership Guard / Admin Verification → Route Handler
```

## Security

- **Gateway Secret**: Endpoints require `X-GATEWAY-SECRET` header
- **Ownership Verification**: Compares request owner with KV config owner
- **Admin Token**: Admin endpoints require separate `ADMIN_TOKEN`
