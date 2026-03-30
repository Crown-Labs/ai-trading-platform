# Claude Code Proxy

A NestJS proxy server for the Claude Code API with authentication, rate limiting, and usage tracking.

## Features

- **Proxy Key Authentication** - Each user gets a unique proxy key (`ccproxy-xxxx`). Keys are stored as SHA-256 hashes.
- **SSE Streaming Support** - Full support for Anthropic's server-sent events streaming, piped directly to clients.
- **Rate Limiting** - Redis-based sliding window rate limiting per user (configurable requests per minute).
- **Usage Tracking** - Logs every request with token counts and estimated cost. Async logging that doesn't block responses.
- **Admin API** - CRUD endpoints for users and proxy keys, plus usage reporting.
- **Swagger Documentation** - Available at `/docs`.

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
yarn
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and ADMIN_SECRET
```

### 4. Run the server

```bash
yarn start:dev
```

The server starts on `http://localhost:3000`. Swagger docs at `http://localhost:3000/docs`.

## Usage

### Create a user (admin)

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John Doe"}'
```

### Generate a proxy key (admin)

```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_UUID", "label": "development"}'
```

The response includes the plain key (shown only once):
```json
{
  "key": "ccproxy-abc123...",
  "id": "...",
  "userId": "...",
  "label": "development"
}
```

### Configure Claude Code

```bash
export ANTHROPIC_API_KEY=ccproxy-abc123...
export ANTHROPIC_BASE_URL=http://localhost:3000
```

Now Claude Code will route all API calls through the proxy.

### Direct API usage

```bash
# Non-streaming
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer ccproxy-abc123..." \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Streaming
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer ccproxy-abc123..." \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### View usage (admin)

```bash
curl http://localhost:3000/admin/usage/summary \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/messages` | Proxy Key | Forward to Anthropic Messages API |
| POST | `/admin/users` | Admin Secret | Create user |
| GET | `/admin/users` | Admin Secret | List users |
| GET | `/admin/users/:id` | Admin Secret | Get user |
| PATCH | `/admin/users/:id` | Admin Secret | Update user |
| DELETE | `/admin/users/:id` | Admin Secret | Delete user |
| POST | `/admin/keys` | Admin Secret | Generate proxy key |
| GET | `/admin/keys` | Admin Secret | List proxy keys |
| DELETE | `/admin/keys/:id` | Admin Secret | Delete proxy key |
| GET | `/admin/usage` | Admin Secret | Get usage logs |
| GET | `/admin/usage/summary` | Admin Secret | Get usage summary |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:password@localhost:5432/claude_proxy` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `ANTHROPIC_API_KEY` | Master Anthropic API key | - |
| `ANTHROPIC_BASE_URL` | Anthropic API base URL | `https://api.anthropic.com` |
| `ADMIN_SECRET` | Secret for admin endpoints | - |

## Rate Limiting

Each user has a configurable `requestsPerMinute` limit (default: 20). The rate limiter uses a Redis sliding window algorithm. Rate limit headers are included in proxy responses:

- `X-RateLimit-Limit` - Max requests per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Window reset timestamp

If Redis is unavailable, rate limiting fails open (requests are allowed).

## Cost Tracking

Usage is logged with estimated costs based on:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus | $15.00 | $75.00 |
| Claude Haiku | $0.25 | $1.25 |

## License

ISC
