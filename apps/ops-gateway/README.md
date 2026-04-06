# ops-gateway

Smart API Gateway for Atlassian Compass - Cloudflare Worker

## Features

- **Repository ID-based Security**: KV lookup by GitHub repository ID
- **Ownership Guard**: Prevents repo transfer exploits
- **Polymorphic Event Handling**: Supports deployment, build, incident, alert events
- **Pull Request Filter**: Blocks pull request events (400 error)
- **Strict Compass Schema Mapping**: Type-specific event payloads
- **Admin CRUD API**: Manage repository configurations

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

Run the following commands to set the 5 required secrets:

```bash
# Gateway Auth
wrangler secret put GATEWAY_CLIENT_SECRET
wrangler secret put ADMIN_TOKEN

# Atlassian Auth
wrangler secret put ATLASSIAN_SITE_NAME
wrangler secret put ATLASSIAN_EMAIL
wrangler secret put ATLASSIAN_TOKEN
```

### 4. Configure Variables

Update `wrangler.toml` or use the Cloudflare Dashboard to set:
- `COMPASS_CLOUD_ID`: Your Atlassian Cloud ID (GUID)

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

### Protected (X-GATEWAY-SECRET)

- `POST /compass/event` - Polymorphic event handler
- `POST /compass/custom` - Custom event handler

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
      "root": "ari:cloud:compass:...",
      "apps/ops-gateway": "ari:cloud:compass:..."
    }
  }'
```

## Architecture

```
Request → X-GATEWAY-SECRET → Extract repoId → KV Lookup → Ownership Guard → Route Handler → Compass API
```

## Security

- **Gateway Secret**: All endpoints (except `/health`) require `X-GATEWAY-SECRET` header
- **Ownership Verification**: Compares request owner with KV config owner
- **Admin Token**: Admin endpoints require separate `ADMIN_TOKEN`
