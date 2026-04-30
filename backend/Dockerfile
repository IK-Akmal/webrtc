# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
# node-gyp deps for native modules (bcrypt, pg)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
# Prune dev dependencies for production image
RUN npm prune --production --legacy-peer-deps

# Stage 2: production runtime (no build tools needed)
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
