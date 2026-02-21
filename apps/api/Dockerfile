# ===========================================
# Stage 1: Build
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy API app
COPY apps/api/ ./apps/api/

# Install all dependencies (monorepo-wide)
RUN npm ci --workspace=apps/api --include-workspace-root

# Build the API
RUN npm run build --workspace=apps/api

# ===========================================
# Stage 2: Production
# ===========================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace root files
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy shared packages (needed at runtime)
COPY packages/ ./packages/

# Copy API package.json for install
COPY apps/api/package.json ./apps/api/

# Install production-only dependencies
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev

# Copy built output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
