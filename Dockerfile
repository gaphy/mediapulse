FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3026

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy better-sqlite3 native binding and its runtime dependencies
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

RUN apk add --no-cache su-exec

EXPOSE 3026

LABEL org.opencontainers.image.title="MediaPulse"
LABEL org.opencontainers.image.description="Dashboard for monitoring your media server apps"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
