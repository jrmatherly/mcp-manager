"""Base middleware classes for FastMCP server integration."""

import logging
from typing import Any

from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext


class BaseMiddleware(Middleware):
    """Base middleware class with common functionality for FastMCP."""

    def __init__(self, name: str | None = None):
        self.name = name or self.__class__.__name__
        self.logger = logging.getLogger(f"middleware.{self.name.lower()}")

    async def on_message(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        """Called for all MCP messages - base logging."""
        self.logger.debug(
            f"Processing {getattr(context, 'method', 'unknown')} from {getattr(context, 'source', 'unknown')}"
        )

        try:
            result = await call_next(context)
            self.logger.debug(f"Completed {getattr(context, 'method', 'unknown')}")
            return result
        except Exception as e:
            self.logger.error(f"Error in {getattr(context, 'method', 'unknown')}: {e}")
            raise
