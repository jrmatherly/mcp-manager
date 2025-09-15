# Scalar API Reference Recursion Fix

## Problem Description

The Scalar API Reference component was experiencing a "too much recursion" error when rendering the OpenAPI documentation at the `/reference` endpoint. This was caused by circular references in the OpenAPI schema generated from FastAPI/Pydantic models.

### Error Details
- **Error Type**: `InternalError: too much recursion`
- **Location**: `standalone.js` in Scalar component
- **Stack Trace**: Recursive calls between `get`, `xo`, `Ia`, `Ua`, and `map` functions
- **Root Cause**: Circular references in OpenAPI schema from self-referential Pydantic models

## Immediate Fix Applied

### 1. Scalar Version Downgrade
Initially attempted to downgrade from latest to v1.25.11, but this alone did not resolve the issue.

```bash
cd frontend
npm install @scalar/api-reference@1.25.11
```

## Comprehensive Solution Implemented

### Frontend Changes

#### 1. Schema Preprocessing (`frontend/src/lib/scalar-utils.ts`)

Added comprehensive schema preprocessing to detect and break circular references:

```typescript
// Detect circular references in schema
function detectCircularReferences(obj: unknown, visited = new Set<unknown>()): boolean

// Preprocess schema to remove circular references
function preprocessSchema(schema: unknown): unknown

// Create safe schema configuration with depth limiting
function createSafeSchemaConfig(config: Record<string, unknown>): Record<string, unknown>

// Limit schema depth to prevent infinite recursion
function limitSchemaDepth(obj: unknown, maxDepth = 5, currentDepth = 0): unknown
```

**Key Features:**
- Circular reference detection using visited set
- Depth limiting to maximum 5 levels
- Safe schema preprocessing before passing to Scalar
- Comprehensive error handling

#### 2. Callback Safety (`frontend/src/lib/scalar-utils.ts`)

Modified `createScalarCallbacks()` to return `undefined` instead of serialized functions to prevent recursion from callback execution.

#### 3. Route Configuration (`frontend/src/app/reference/route.ts`)

Enhanced the reference route with:
- Explicit callback disabling
- Enhanced error handling with recursion detection
- Safe configuration options
- Comprehensive logging for debugging

#### 4. Combined Schema Safety (`frontend/src/app/api/docs/combined-schema/route.ts`)

Applied preprocessing to merged schemas:
- Safe preprocessing of all combined schemas
- Error handling for schema generation failures
- Detailed logging for troubleshooting

### Backend Changes

#### 1. Schema Configuration (`backend/src/mcp_registry_gateway/api/schema_config.py`)

Implemented comprehensive circular reference prevention:

```python
# Configure models to exclude circular references
def configure_pydantic_schema_exclusions() -> None

# Configure SQLModel exclusions
def configure_sqlmodel_schema_exclusions() -> None

# Create safe OpenAPI schema
def create_safe_openapi_schema(
    app: FastAPI,
    title: str,
    version: str,
    config: CircularReferenceConfig | None = None
) -> dict[str, Any]
```

**Key Features:**
- Automatic detection of circular references
- Relationship field exclusion from schemas
- Depth limiting for recursive models
- Safe schema generation with fallbacks

#### 2. Unified App Integration (`backend/src/mcp_registry_gateway/unified_app.py`)

Integrated safe schema generation:
- Applied to both app and backend schemas
- Comprehensive error handling
- Fallback schemas on generation failure

## Features Preserved

All existing functionality has been maintained:

✅ **OAuth authentication callbacks**
✅ **Server configuration and switching**
✅ **Role-based access control**
✅ **Custom theming and styling**
✅ **Schema merging for unified docs**
✅ **Environment-aware configuration**
✅ **Analytics and event tracking**

## Testing and Validation

### Backend Tests
```bash
cd backend
uv run pytest tests/                  # Run all tests
uv run ruff check .                   # Linting
uv run mypy .                         # Type checking
```

### Frontend Tests
```bash
cd frontend
npm run test                          # Run Vitest tests
npm run lint                          # ESLint checks
npm run type-check                    # TypeScript checks
```

### Manual Testing
```bash
# Test different schema endpoints
curl http://localhost:3000/reference
curl http://localhost:3000/reference?schema=auth
curl http://localhost:3000/reference?schema=app
curl http://localhost:3000/reference?schema=combined

# Check combined schema directly
curl http://localhost:3000/api/docs/combined-schema
```

## Future Enhancements

### Medium-term: Advanced Schema Preprocessing

Install and implement `@apidevtools/json-schema-ref-parser`:

```bash
npm install @apidevtools/json-schema-ref-parser
```

```typescript
import $RefParser from "@apidevtools/json-schema-ref-parser";

async function advancedPreprocessing(schema: any) {
  const bundled = await $RefParser.bundle(schema);
  return await $RefParser.dereference(bundled, {
    dereference: {
      circular: "ignore"
    }
  });
}
```

### Long-term: Backend Model Refactoring

1. **Use ID References**: Replace nested objects with ID references
2. **Separate Input/Output Schemas**: Break bidirectional relationships
3. **Implement Depth Limiting**: Add max depth to recursive models
4. **Custom Schema Generation**: Override default OpenAPI generation

### Monitoring Scalar Updates

Monitor the Scalar GitHub repository for official fixes:
- [Issue #5213](https://github.com/scalar/scalar/issues/5213)
- [Issue #5261](https://github.com/scalar/scalar/issues/5261)

When Scalar releases an official fix, consider upgrading from v1.25.11.

## Configuration Notes

### Critical Settings

```typescript
// Frontend scalar-utils.ts
const MAX_SCHEMA_DEPTH = 5;  // Maximum nesting depth

// Backend schema_config.py
max_depth = 5  # Maximum recursion depth
exclude_circular = True  # Exclude circular references
```

### Environment Variables

No new environment variables required. The fix works with existing configuration.

## Troubleshooting

### If Recursion Error Persists

1. Check browser console for specific error details
2. Verify Scalar version: `npm list @scalar/api-reference`
3. Check schema preprocessing is applied: Look for debug logs
4. Test with minimal schema: `?schema=health`
5. Verify backend schema generation: `/api/docs/openapi`

### Debug Mode

Enable debug logging by setting:
```typescript
// In scalar-utils.ts
const DEBUG = true;  // Temporarily enable for troubleshooting
```

## References

- [Scalar GitHub Issues](https://github.com/scalar/scalar/issues)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [FastAPI Schema Generation](https://fastapi.tiangolo.com/tutorial/schema-extra-example/)
- [Pydantic Recursive Models](https://docs.pydantic.dev/latest/concepts/models/#recursive-models)