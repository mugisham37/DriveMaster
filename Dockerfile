# Multi-stage Dockerfile for DriveMaster services
# This Dockerfile can be used to build any service by specifying the SERVICE_NAME build arg

# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/
COPY services/*/package.json ./services/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build stage
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build shared packages first
RUN pnpm --filter "@drivemaster/shared-config" run build
RUN pnpm --filter "@drivemaster/contracts" run build
RUN pnpm --filter "@drivemaster/kafka-client" run build
RUN pnpm --filter "@drivemaster/redis-client" run build
RUN pnpm --filter "@drivemaster/es-client" run build
RUN pnpm --filter "@drivemaster/telemetry" run build

# Build argument to specify which service to build
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

# Build the specific service
RUN pnpm --filter "@drivemaster/${SERVICE_NAME}" run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S drivemaster -u 1001

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/
COPY services/*/package.json ./services/*/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
ARG SERVICE_NAME
COPY --from=builder --chown=drivemaster:nodejs /app/packages/*/dist ./packages/*/dist/
COPY --from=builder --chown=drivemaster:nodejs /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist/

# Copy necessary configuration files
COPY --chown=drivemaster:nodejs tsconfig.base.json ./

# Set environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE_NAME}

# Switch to non-root user
USER drivemaster

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 3000

# Start the service
CMD ["sh", "-c", "node services/${SERVICE_NAME}/dist/index.js"]