FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN yarn install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

RUN yarn workspace @ai-trading/shared build
RUN yarn workspace @ai-trading/web build

# ── Runtime (nginx) ─────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
