# Multi-stage build for optimal caching and smaller final image
FROM ghcr.io/astral-sh/uv:python3.12-bookworm AS builder

# Set working directory
WORKDIR /app

# Set environment variables for uv optimization
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Copy dependency files first for better layer caching
COPY backend/uv.lock backend/pyproject.toml ./

# Install dependencies only (not the project itself)
# This creates a separate layer that can be cached when only source code changes
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked --no-install-project

# Copy the backend project and README
COPY backend/ .
COPY README.md .

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked --no-editable

# Production stage - smaller final image
FROM python:3.12-slim-bookworm AS production

# Create non-root user for security
RUN groupadd --gid 1000 app && \
  useradd --uid 1000 --gid app --shell /bin/bash --create-home app

# Set working directory
WORKDIR /app

# Copy the virtual environment from builder stage
COPY --from=builder --chown=app:app /app/.venv /app/.venv

# Copy only necessary application files
COPY --from=builder --chown=app:app /app/src/ ./src/
COPY --from=builder --chown=app:app /app/pyproject.toml ./

# Make sure the virtual environment is in PATH
ENV PATH="/app/.venv/bin:$PATH"

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)" || exit 1

# Expose the application port
EXPOSE 8000

# Default command - can be overridden
CMD ["mcp-gateway", "serve"]

# Development stage - includes development tools and source code mounting
FROM builder AS development

# Install development dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked --all-groups

# Set environment for development
ENV PYTHONPATH=/app/src
ENV ENVIRONMENT=development

# Create non-root user for development
RUN groupadd --gid 1000 app && \
  useradd --uid 1000 --gid app --shell /bin/bash --create-home app

# Change ownership of the app directory
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose ports for development (app + debugger)
EXPOSE 8000 5678

# Development command with auto-reload
CMD ["uv", "run", "mcp-gateway", "serve", "--host", "0.0.0.0", "--port", "8000", "--reload"]
