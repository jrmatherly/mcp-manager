#!/usr/bin/env bash

set -e
set -x

# Format code using uv tool run (uses installed tools)
uv tool run ruff check src/mcp_registry_gateway tests scripts --fix
uv tool run ruff format src/mcp_registry_gateway tests scripts
