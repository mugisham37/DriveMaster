# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/user-svc/package.json ./services/user-svc/package.json
RUN corepack enable && pnpm install -w --frozen-lockfile || pnpm install -w

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm -C services/user-svc run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/user-svc/dist ./dist
COPY services/user-svc/package.json ./package.json
CMD ["node", "dist/server.js"]