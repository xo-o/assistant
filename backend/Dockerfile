# Multi-stage production build for Backend (Zero Python / Pure Node.js)
FROM node:22-slim AS builder

WORKDIR /app

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

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/

EXPOSE 8000

CMD ["node", "dist/server.js"]
