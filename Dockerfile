# MediCare — Single-stage Dockerfile for Google Cloud Run
# Node 18 Alpine keeps the image lean
FROM node:18-alpine

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install backend production dependencies first (layer cache-friendly)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy pre-built React frontend into ./public so Express can serve it
COPY frontend/dist/ ./public/

# Cloud Run requires the app to listen on 8080
EXPOSE 8080
ENV NODE_ENV=production \
    PORT=8080

# Use dumb-init as PID 1 to handle signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
