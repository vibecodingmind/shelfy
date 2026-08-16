# Production Multi-Stage Dockerfile for Shelfy Tanzania
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors (lockfile required — do not use package*.json glob alone)
COPY package.json package-lock.json ./
RUN npm ci --no-audit

# Copy full application source code
COPY . .

# Build Vite frontend + esbuild server bundle (dist/server.cjs)
RUN npm run build

# Production Runtime Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit

# Copy compiled build output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose container port
EXPOSE 3000

# Migrate runs in-process so a non-empty JSONB database cannot block boot
CMD ["node", "dist/server.cjs"]
