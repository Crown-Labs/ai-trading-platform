FROM node:22-alpine AS builder
WORKDIR /app

# Install corepack for yarn
RUN corepack enable

# Copy workspace files
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install deps
RUN yarn install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Build shared first, then backend
RUN yarn workspace @ai-trading/shared build
RUN yarn workspace @ai-trading/backend build

# ── Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 4000
CMD ["node", "packages/backend/dist/main"]
