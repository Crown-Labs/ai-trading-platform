FROM node:22-alpine AS builder
WORKDIR /app

# Install corepack for yarn
RUN corepack enable

# Copy workspace files
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Copy Prisma schema (needed for prisma generate during install)
COPY packages/backend/prisma ./packages/backend/prisma

# Install deps (--ignore-scripts: source not copied yet, postinstall would fail)
RUN yarn install --frozen-lockfile --ignore-scripts

# Generate Prisma client
RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma

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

# Copy Prisma schema for runtime client generation
COPY packages/backend/prisma ./packages/backend/prisma

RUN yarn install --frozen-lockfile --production --ignore-scripts

# Generate Prisma client in runtime
RUN npx prisma generate --schema=packages/backend/prisma/schema.prisma

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma && node packages/backend/dist/main"]
