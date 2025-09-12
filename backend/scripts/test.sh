#!/usr/bin/env bash

set -e
set -x

# Run tests with coverage using uv run (uses project dependencies)
# This leverages the coverage configuration in pyproject.toml
uv run pytest --cov=src/mcp_registry_gateway
uv tool run coverage html --title "${@-coverage}"
