# Stage 1: Build dependencies & code
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Install all dependencies (workspaces)
RUN npm ci

# Copy source code and assets
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client ./apps/client
COPY UnitArt ./UnitArt
COPY SpellIcon ./SpellIcon
COPY CoreBase ./CoreBase

# Build all packages (shared, client, server)
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package manifests & built dist
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY --from=builder /app/node_modules ./node_modules

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3001}/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
