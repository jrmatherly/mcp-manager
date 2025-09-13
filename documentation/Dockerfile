# Use specific Node.js LTS version for stability
FROM node:22-alpine

# Add metadata labels
LABEL maintainer="MCP Registry Gateway Team"
LABEL description="Docsify documentation server for MCP Registry Gateway"
LABEL version="1.0.0"

# Set working directory
WORKDIR /docs

# Install docsify-cli globally
RUN npm install -g docsify-cli@4.4.4

# Create non-root user for security
RUN addgroup -g 1001 -S docsify && \
  adduser -S docsify -u 1001 -G docsify

# Change ownership of the working directory
RUN chown -R docsify:docsify /docs

# Switch to non-root user
USER docsify

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start docsify server
ENTRYPOINT ["docsify", "serve", ".", "--port", "3000"]