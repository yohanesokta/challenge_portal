FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# 2. Build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm run build

# 3. Build Shortlink Service
FROM base AS shortlink-builder
WORKDIR /app/shortlink
COPY shortlink-service/package*.json ./
RUN npm install --production
COPY shortlink-service/ .

# 4. Production image
FROM base AS runner
WORKDIR /app

# Add Python3 for executing code snippets locally
RUN apk add --no-cache python3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy Next.js standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy shortlink service
COPY --from=shortlink-builder --chown=nextjs:nodejs /app/shortlink ./shortlink

# We also need these for running migrations on startup
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy start.sh and fix permissions
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

# App on 3000, Shortlink on 3001
EXPOSE 3000 3001

ENV PORT=3000

# Run migrations then start both services
CMD ["./start.sh"]
