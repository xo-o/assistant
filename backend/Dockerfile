# =========================================================================
# Multi-stage production build for Automotive Advisor Agent Backend
# Compatible with Railway, Cloud Run, and Docker Engine (Node.js 22 LTS Slim)
# =========================================================================

# -------------------------------------------------------------------------
# Stage 1: Build & Compile TypeScript
# -------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies using lockfile for reproducible builds
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build dist artifacts
COPY src/ ./src/
RUN npm run build

# -------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# -------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

# Production environment defaults
ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Install only production dependencies and clean npm cache to minimize image size
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled JavaScript output and Drizzle SQL migrations
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node migrations/ ./migrations/

# Run as non-root user for container security
USER node

# Expose default port (Railway automatically overrides PORT at runtime)
EXPOSE 8000

# Container Healthcheck (Railway / Docker)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 8000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
