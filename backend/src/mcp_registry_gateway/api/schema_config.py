"""
OpenAPI schema configuration and circular reference prevention.

This module provides utilities to prevent circular references in OpenAPI schema
generation while maintaining proper API documentation.
"""

from collections.abc import Callable
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def create_safe_openapi_schema(app: FastAPI) -> dict[str, Any]:
    """
    Generate OpenAPI schema with circular reference prevention.

    This function creates a safe OpenAPI schema by:
    1. Limiting relationship depth traversal
    2. Breaking circular references in components
    3. Ensuring Scalar-compatible schema structure

    Args:
        app: FastAPI application instance

    Returns:
        Safe OpenAPI schema dictionary
    """
    if app.openapi_schema:
        return app.openapi_schema

    # Generate base schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Apply circular reference fixes
    openapi_schema = fix_circular_references(openapi_schema)

    # Cache the schema
    app.openapi_schema = openapi_schema
    return app.openapi_schema


def fix_circular_references(schema: dict[str, Any]) -> dict[str, Any]:
    """
    Fix circular references in OpenAPI schema components.

    Args:
        schema: Raw OpenAPI schema dictionary

    Returns:
        Fixed schema with circular references removed
    """
    if "components" not in schema or "schemas" not in schema["components"]:
        return schema

    components = schema["components"]["schemas"]
    visited_models: set[str] = set()

    # Process each component schema
    for model_name, model_schema in components.items():
        if model_name not in visited_models:
            components[model_name] = _fix_model_schema(
                model_schema, visited_models, model_name, depth=0, max_depth=3
            )

    return schema


def _fix_model_schema(
    model_schema: dict[str, Any],
    visited: set[str],
    current_model: str,
    depth: int = 0,
    max_depth: int = 3,
) -> dict[str, Any]:
    """
    Recursively fix circular references in a model schema.

    Args:
        model_schema: Model schema dictionary
        visited: Set of already visited model names
        current_model: Current model name being processed
        depth: Current recursion depth
        max_depth: Maximum allowed recursion depth

    Returns:
        Fixed model schema
    """
    if depth > max_depth:
        # Return simplified schema at max depth
        return {
            "type": "object",
            "title": f"{current_model}Reference",
            "description": f"Reference to {current_model} (depth limited)",
        }

    if not isinstance(model_schema, dict):
        return model_schema  # type: ignore[unreachable]

    # Mark current model as visited
    visited.add(current_model)

    fixed_schema = model_schema.copy()

    # Process properties
    if "properties" in fixed_schema:
        fixed_properties = {}
        for prop_name, prop_schema in fixed_schema["properties"].items():
            fixed_properties[prop_name] = _fix_property_schema(
                prop_schema, visited, current_model, depth + 1, max_depth
            )
        fixed_schema["properties"] = fixed_properties

    # Process array items
    if "items" in fixed_schema:
        fixed_schema["items"] = _fix_property_schema(
            fixed_schema["items"], visited, current_model, depth + 1, max_depth
        )

    # Process anyOf, oneOf, allOf
    for key in ["anyOf", "oneOf", "allOf"]:
        if key in fixed_schema:
            fixed_schema[key] = [
                _fix_property_schema(item, visited, current_model, depth + 1, max_depth)
                for item in fixed_schema[key]
            ]

    return fixed_schema


def _fix_property_schema(
    prop_schema: dict[str, Any],
    visited: set[str],
    current_model: str,
    depth: int,
    max_depth: int,
) -> dict[str, Any]:
    """
    Fix circular references in property schemas.

    Args:
        prop_schema: Property schema dictionary
        visited: Set of visited models
        current_model: Current model name
        depth: Current depth
        max_depth: Maximum depth

    Returns:
        Fixed property schema
    """
    if not isinstance(prop_schema, dict):
        return prop_schema  # type: ignore[unreachable]

    # Check for $ref circular references
    if "$ref" in prop_schema:
        ref_model = prop_schema["$ref"].split("/")[-1]

        # If we've seen this model before, or we're at max depth, create a reference
        if ref_model in visited or depth >= max_depth:
            return {
                "type": "object",
                "title": f"{ref_model}Reference",
                "description": f"Reference to {ref_model} (circular reference prevented)",
                "properties": {
                    "id": {"type": "string", "description": f"{ref_model} ID"},
                    "name": {"type": "string", "description": f"{ref_model} name"},
                },
            }

    # Recursively process nested objects
    return _fix_model_schema(prop_schema, visited, current_model, depth, max_depth)


class CircularReferenceConfig:
    """Configuration for handling circular references in specific models."""

    # Models that should have their relationships excluded from OpenAPI schema
    EXCLUDE_RELATIONSHIPS = {
        "MCPServer": ["tools", "resources", "metrics", "tenant"],
        "Tenant": ["servers", "users"],
        "ServerTool": ["server"],
        "ServerResource": ["server"],
        "ServerMetric": ["server"],
        "User": ["tenant"],
    }

    # Maximum depth for relationship traversal
    MAX_RELATIONSHIP_DEPTH = 2

    # Models that should be simplified in nested contexts
    SIMPLIFY_NESTED = {
        "MCPServer",
        "Tenant",
        "User",
        "ServerTool",
        "ServerResource",
        "ServerMetric",
    }


def apply_model_config_excludes() -> None:
    """
    Apply model configuration to exclude circular reference fields.

    This should be called during application startup to configure
    SQLModel classes with proper exclusions for API serialization.
    """
    try:
        from ..db.models import (
            MCPServer,
            ServerMetric,
            ServerResource,
            ServerTool,
            Tenant,
            User,
        )

        # Configure schema generation to exclude relationship fields
        models_to_configure = [
            (MCPServer, ["tools", "resources", "metrics"]),
            (Tenant, ["servers", "users"]),
            (User, ["tenant"]),
            (ServerTool, ["server"]),
            (ServerResource, ["server"]),
            (ServerMetric, ["server"]),
        ]

        for model_class, exclude_fields in models_to_configure:
            # Configure the model to exclude relationship fields from JSON schema
            if hasattr(model_class, "__pydantic_json_schema__"):
                original_json_schema = model_class.__pydantic_json_schema__

                def make_safe_json_schema(
                    exclude_relationships: list[str], original_schema_func: Callable[..., dict[str, Any]]
                ) -> Callable[..., dict[str, Any]]:
                    def safe_json_schema(schema_generator: Any, handler: Any) -> dict[str, Any]:
                        schema = original_schema_func(schema_generator, handler)
                        # Remove relationship properties from schema
                        if "properties" in schema:
                            for field in exclude_relationships:
                                schema["properties"].pop(field, None)
                        return schema

                    return safe_json_schema

                model_class.__pydantic_json_schema__ = make_safe_json_schema(
                    exclude_fields, original_json_schema
                )

    except ImportError:
        # Models not available, skip configuration
        pass


def configure_sqlmodel_schema_exclusions() -> None:
    """
    Configure SQLModel classes to prevent circular references in OpenAPI schema.

    This function should be called during application startup to ensure
    relationship fields are excluded from API documentation.
    """
    try:
        # Import at function level to avoid circular imports
        from ..db.models.auth import User
        from ..db.models.registry import (
            MCPServer,
            ServerMetric,
            ServerResource,
            ServerTool,
        )
        from ..db.models.tenant import Tenant

        # Configure field exclusions for schema generation
        relationship_exclusions = {
            MCPServer: {"tools", "resources", "metrics", "tenant"},
            ServerTool: {"server"},
            ServerResource: {"server"},
            ServerMetric: {"server"},
            Tenant: {"servers", "users"},
            User: {"tenant"},
        }

        for model_class, excluded_fields in relationship_exclusions.items():
            # Add exclude=True to Field definitions for relationship fields
            if hasattr(model_class, "model_fields"):
                model_fields = getattr(model_class, "model_fields", {})
                for field_name in excluded_fields:
                    if field_name in model_fields:
                        field_info = model_fields[field_name]
                        # Mark field as excluded from serialization
                        if hasattr(field_info, "exclude"):
                            field_info.exclude = True

    except ImportError:
        pass


def get_safe_response_model_config() -> dict[str, Any]:
    """
    Get model configuration for safe API responses.

    Returns:
        Dictionary of model configuration options
    """
    return {
        "exclude_unset": True,
        "exclude_none": True,
        "exclude_defaults": False,
        "by_alias": True,
        "json_encoders": {
            # Add custom encoders if needed
        },
    }
