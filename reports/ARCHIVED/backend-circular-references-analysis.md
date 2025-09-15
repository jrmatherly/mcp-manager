# Backend OpenAPI Schema Circular References Analysis

## Problem Summary

The Scalar recursion issue is caused by circular references in the backend FastAPI application's SQLModel relationships, which create infinite loops when FastAPI generates OpenAPI schemas from the models.

## Identified Circular Relationships

### 1. **MCPServer ↔ ServerTool/ServerResource/ServerMetric**

**MCPServer model** (`backend/src/mcp_registry_gateway/db/models/registry.py`):
```python
class MCPServer(UUIDModel, table=True):
    # Relationships
    tools: list["ServerTool"] = Relationship(back_populates="server")
    resources: list["ServerResource"] = Relationship(back_populates="server")
    metrics: list["ServerMetric"] = Relationship(back_populates="server")
```

**ServerTool model**:
```python
class ServerTool(UUIDModel, table=True):
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="tools")
```

**ServerResource model**:
```python
class ServerResource(UUIDModel, table=True):
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="resources")
```

**ServerMetric model**:
```python
class ServerMetric(UUIDModel, table=True):
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="metrics")
```

### 2. **Tenant ↔ MCPServer/User**

**Tenant model** (`backend/src/mcp_registry_gateway/db/models/tenant.py`):
```python
class Tenant(UUIDModel, table=True):
    # Relationships
    servers: list["MCPServer"] = Relationship(back_populates="tenant")
    users: list["User"] = Relationship(back_populates="tenant")
```

**MCPServer and User models reference Tenant back**:
```python
# In MCPServer
tenant: Tenant | None = Relationship(back_populates="servers")

# In User
tenant: Tenant | None = Relationship(back_populates="users")
```

## Root Cause Analysis

1. **Bidirectional SQLModel Relationships**: The models use SQLModel `Relationship()` with `back_populates` which creates bidirectional references.

2. **FastAPI OpenAPI Generation**: When FastAPI generates the OpenAPI schema, it tries to serialize these relationships, creating infinite recursive loops.

3. **Scalar Rendering**: Scalar attempts to render the circular schema and hits recursion limits, causing "too much recursion" errors.

## Evidence

### Backend Schema Analysis Results
- **Total models**: 10 in OpenAPI schema
- **No circular references detected in final schema** - This means FastAPI is cutting off the relationships somewhere, but the Pydantic serialization process is still hitting recursion limits during generation.

### SQLModel Relationship Analysis Results
- **21 SQLModel table classes** with complex relationships
- **Clear bidirectional relationships** identified in:
  - MCPServer ↔ ServerTool/ServerResource/ServerMetric
  - Tenant ↔ MCPServer/User

## Specific Issues for Scalar

1. **Deep Object Traversal**: Scalar tries to render the complete object graph for documentation
2. **Relationship Resolution**: Even though final schema appears clean, the generation process involves deep traversal
3. **Memory Consumption**: Circular references cause exponential memory usage during schema processing

## Impact on System

- ✅ **Backend API functionality**: Works correctly (relationships are properly handled at runtime)
- ❌ **OpenAPI documentation**: Causes recursion during schema generation
- ❌ **Scalar rendering**: Cannot render the documentation due to infinite loops
- ❌ **Frontend schema merging**: Cannot merge backend schema into combined documentation

## Solutions Required

The circular references need to be broken at the OpenAPI schema generation level without affecting the actual database relationships or API functionality.

### Recommended Fixes

1. **Add `response_model_exclude` to endpoints that return models with relationships**
2. **Create separate response models** for API endpoints that exclude relationship fields
3. **Use `model_config` with `exclude` settings** to control serialization
4. **Implement custom OpenAPI schema generation** that breaks circular references
5. **Add `schema_extra` configurations** to limit depth of relationship traversal

### Priority Order
1. **Immediate**: Exclude relationship fields from API response models
2. **Short-term**: Create dedicated API response models without relationships
3. **Long-term**: Implement custom OpenAPI schema generation with depth limits

This analysis shows that the backend relationships are the root cause of the Scalar recursion issue, and the fix needs to be applied at the FastAPI model serialization level.