#!/usr/bin/env bash

set -e
set -x

# Run linting tools using uv tool run (uses installed tools)
uv tool run mypy src/mcp_registry_gateway
uv tool run ruff check src/mcp_registry_gateway tests scripts
uv tool run ruff format src/mcp_registry_gateway tests scripts --check
