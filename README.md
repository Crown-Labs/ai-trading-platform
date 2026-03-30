# AI Trading Platform

A monorepo for the AI Trading Platform — AI-powered strategy backtesting using Binance market data.

## For AI Agents

> **Before implementing anything, read the workspace context first:**
>
> - **Dev / Implementation:** `~/.openclaw/workspace-ai-trading/` — rules, stack, git workflow
> - **Strategy Research:** `~/.openclaw/workspace-strategy-advisor/` — indicators, DSL format, metrics guide
>
> Key files: `SOUL.md`, `AGENTS.md`, `MEMORY.md`, `memory/YYYY-MM-DD.md`

---

## Project Structure

```
ai-trading-platform/
├── packages/
│   ├── web/        # React 19 + TypeScript + Vite + Tailwind v3  (:3000)
│   ├── backend/    # NestJS 11 + Swagger/OpenAPI                  (:4000)
│   └── shared/     # Shared TypeScript types and utilities
├── openclaw/       # OpenClaw config for strategy-advisor agent (Docker)
├── docker-compose.yml       # Production: all services in Docker
└── docker-compose.dev.yml   # Dev: OpenClaw in Docker, backend/web local
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v3 |
| Backend | NestJS 11, Express, Swagger/OpenAPI |
| Shared | TypeScript types and utilities |
| Package manager | Yarn Workspaces |
| AI Gateway | OpenClaw (`/v1/chat/completions`) |
| Market Data | Binance REST API (OHLCV) |

## Getting Started

### Local Development

```bash
yarn install
yarn dev
# Web: http://localhost:3000
# API: http://localhost:4000/api
# Docs: http://localhost:4000/api/docs
```

### Dev Mode with OpenClaw in Docker

OpenClaw runs in Docker, backend and web run locally with hot-reload.

```bash
# 1. Copy and fill env vars
cp .env.example .env

# 2. Start OpenClaw
docker compose -f docker-compose.dev.yml up -d

# 3. Get gateway token: http://localhost:18789 → Settings
#    Add to .env: OPENCLAW_GATEWAY_TOKEN=...

# 4. Start dev servers
yarn dev
```

### Production (All in Docker)

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY and OPENCLAW_GATEWAY_TOKEN

docker compose up -d
# Web:      http://localhost:3000
# API:      http://localhost:4000/api
# OpenClaw: http://localhost:18789
```

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENCLAW_GATEWAY_TOKEN` | OpenClaw gateway token |
| `OPENCLAW_AGENT_ID` | Agent ID (default: `strategy-advisor`) |
| `VITE_API_URL` | Frontend API URL (Docker prod only) |

## Git Workflow

```bash
# 1. Create GitHub Issue first
# 2. Pull latest main
git checkout main && git pull origin main
# 3. Create feature branch
git checkout -b feature/42-short-description
# 4. Commit with issue reference
git commit -m "feat: short description (#42)"
# 5. Push and open PR
git push origin feature/42-short-description
```

**Rules:**
- Never push directly to `main`
- All commits, PRs, and issues must be in **English**
- Package manager: `yarn` only
- Tailwind v3 only — do not upgrade
