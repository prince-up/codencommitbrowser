FROM node:18-alpine AS builder

WORKDIR /app

# Copy root configurations and workspace packages
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies utilizing npm workspaces
RUN npm install --include-workspace-root

# Generate Prisma Client specifically for alpine architecture
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Build the shared packages first so the backend can find their dist folders
RUN npm run build -w @codenbrowser/shared-types
RUN npm run build -w @codenbrowser/validation

# Build the backend application
RUN npm run build -w @codenbrowser/backend

# Production Runner
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

EXPOSE 4000

# Start server statelessly
CMD ["node", "apps/backend/dist/index.js"]
