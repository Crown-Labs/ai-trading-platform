# Claude Code Proxy - Project Conventions

## Tech Stack
- NestJS 11 + TypeScript
- PostgreSQL via TypeORM (synchronize in dev mode)
- Redis via ioredis for rate limiting
- Swagger/OpenAPI at /docs

## Architecture
- Proxy server that validates custom proxy keys, enforces rate limits, tracks usage, then forwards to real Anthropic API
- Auth: proxy keys (Bearer token) for /v1/messages, admin secret for /admin/* endpoints
- SSE streaming is piped directly from Anthropic response to client via Node.js streams

## Project Structure
- `src/auth/` - Auth middleware (proxy key validation) and admin auth middleware
- `src/proxy/` - Core proxy controller + service with SSE streaming support
- `src/rate-limit/` - Redis sliding window rate limiter
- `src/usage/` - Usage logging and reporting
- `src/keys/` - Proxy key CRUD (admin)
- `src/users/` - User CRUD (admin)
- `src/config/` - Environment configuration

## Coding Conventions
- All source code is TypeScript
- Entities use TypeORM decorators with explicit column names
- Proxy keys are stored as SHA-256 hashes, never in plain text
- Usage logging is fire-and-forget (non-blocking)
- Rate limiting fails open if Redis is unavailable

## Commands
- `yarn build` - Compile TypeScript
- `yarn start:dev` - Dev server with watch mode
- `yarn start:prod` - Production server
- `docker compose up -d` - Start PostgreSQL + Redis
