# Production Multi-Stage Dockerfile for Shelfy Tanzania
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (will use package-lock.json)
RUN npm install --no-audit

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
COPY package*.json ./
RUN npm install --omit=dev --no-audit

# Copy compiled build output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose container port
EXPOSE 3000

# Start compiled CommonJS server
CMD ["node", "dist/server.cjs"]
