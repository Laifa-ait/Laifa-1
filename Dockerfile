# Stage 1: Build stage
FROM node:22.22.3-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for build tools)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Run build (which builds both front-end client via Vite and back-end server via esbuild into dist/)
RUN npm run build

# Stage 2: Production stage
FROM node:22.22.3-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies for safety and speed
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and assets required at runtime from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose the hardcoded production port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
