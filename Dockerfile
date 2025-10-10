# Use the official Node.js 20 Alpine image for better compatibility
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Install system dependencies needed for native modules and wget for health checks
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    wget

# Copy package.json and package-lock.json (if available) for better caching
COPY package*.json ./

# Install dependencies with npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && \
    npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create necessary directories with proper permissions and make Stockfish executable
RUN mkdir -p public/temp chess_engine/stockfish && \
    chmod +x chess_engine/stockfish/* && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose the port the app runs on
EXPOSE 3000

# Add health check (simple HTTP check)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

# Set default environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=3000

# Start the application (Docker will provide environment variables)
CMD ["node", "src/index.js"]