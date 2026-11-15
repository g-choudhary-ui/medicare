# ── Stage 1: Build React Frontend ─────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Express Runner ────────────────────────────────
FROM node:18-alpine AS runner
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install backend production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend application source
COPY backend/ ./

# Copy pre-built React frontend assets from Stage 1 into ./public
COPY --from=frontend-builder /app/frontend/dist/ ./public/

# Google Cloud Run expects container to listen on 8080
EXPOSE 8080
ENV NODE_ENV=production \
    PORT=8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
