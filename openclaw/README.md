# OpenClaw Setup

## Prerequisites

- Docker & Docker Compose installed
- Anthropic API key (`sk-ant-...`)

## Step 1 — Copy files to server

```bash
scp docker-compose.openclaw.yml user@dev-server:~/ai-trading/
scp -r openclaw/ user@dev-server:~/ai-trading/
```

## Step 2 — Create `.env`

```bash
cd ~/ai-trading

# Generate a random gateway token (run once, save the output)
openssl rand -hex 24

# Create .env with both keys
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-...
OPENCLAW_GATEWAY_TOKEN=<paste-token-from-above>
EOF
```

The `OPENCLAW_GATEWAY_TOKEN` is a shared secret between OpenClaw and the backend. Set it once — it stays the same across restarts.

## Step 3 — Start OpenClaw

```bash
docker compose -f docker-compose.openclaw.yml up -d
```

## Step 4 — Open chat UI in browser

```
http://<server-ip>:18789/chat?session=main#token=<OPENCLAW_GATEWAY_TOKEN>
```

This triggers a **device pairing request**. The page will show "pairing required" — that's expected.

## Step 5 — Approve your device

```bash
docker exec ai-trading-openclaw openclaw devices list --token "<OPENCLAW_GATEWAY_TOKEN>"
```

Copy the **Request ID** (first column), then approve:

```bash
docker exec ai-trading-openclaw openclaw devices approve <requestId> --token "<OPENCLAW_GATEWAY_TOKEN>"
```

## Step 6 — Refresh browser

Go back to the browser and refresh. You're connected.

## Step 7 — Configure backend

Add to the backend `.env` on the same server:

```env
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=<same-token-from-step-2>
OPENCLAW_AGENT_ID=strategy-advisor
```

Start backend + web:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Common Commands

```bash
# View logs
docker logs -f ai-trading-openclaw

# Restart (picks up new SOUL.md, API key, and config changes)
docker compose -f docker-compose.openclaw.yml up -d

# Update to latest image
docker compose -f docker-compose.openclaw.yml pull
docker compose -f docker-compose.openclaw.yml up -d

# Full reset (clears all sessions — token stays the same since it's in .env)
docker compose -f docker-compose.openclaw.yml down -v
docker compose -f docker-compose.openclaw.yml up -d
```

## Change API Key

Edit `.env` with the new key, then restart:

```bash
docker compose -f docker-compose.openclaw.yml up -d
```

The entrypoint auto-registers the key on every startup.

## Notes

- `OPENCLAW_GATEWAY_TOKEN` in `.env` is the single source of truth — same token for gateway, browser, CLI, and backend
- `down -v` is safe — the token persists in `.env`, not in the volume
- Port 18789 is bound to `127.0.0.1` — only accessible from the same server
- The entrypoint force-copies the seed config on every restart to pick up `openclaw.json` changes
