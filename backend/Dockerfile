# Multi-stage production build for Backend
FROM node:22-slim AS builder

WORKDIR /app

# Install build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Runtime Stage
FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/automotive_advisor.db

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["node", "dist/server.js"]
