# Minimal MCP Server Example

A basic FastMCP server demonstrating core patterns following MCP Registry Gateway project standards with FastMCP 2.12.0+ implementation.

## Features

- **FastMCP 2.12.0+ Patterns**: Modern FastMCP implementation with enhanced features
- **FastMCPBaseModel Responses**: Performance-optimized structured responses
- **Async/Await**: Modern Python patterns throughout
- **MREG_ Environment Variables**: Following project naming conventions
- **Tool Implementation**: Text analysis, statistics calculation, data summarization
- **Resource Access**: Configuration retrieval with structured responses
- **Prompt Templates**: Dynamic prompt generation with parameterization
- **Type Safety**: Comprehensive validation with FastMCPBaseModel
- **Error Handling**: Robust error boundaries with graceful degradation
- **Logging**: Structured logging for debugging and monitoring

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   # Or using uv (recommended for MCP Registry Gateway project)
   uv sync
   ```

2. **Configure Environment** (optional):
   ```bash
   export MREG_SERVER_NAME="my-minimal-server"
   export MREG_SERVER_VERSION="1.0.0"
   export MREG_LOG_LEVEL="DEBUG"
   ```

3. **Run the Server**:
   ```bash
   python server.py
   # Or using uv
   uv run python server.py
   ```

4. **Test with Claude Desktop**:
   Add to your MCP client configuration:
   ```json
   {
     "mcp": {
       "servers": {
         "minimal-server": {
           "command": "python",
           "args": ["/path/to/server.py"],
           "transport": "stdio",
           "env": {
             "MREG_SERVER_NAME": "minimal-server",
             "MREG_LOG_LEVEL": "INFO"
           }
         }
       }
     }
   }
   ```

## Available Tools

### `analyze_text`
Analyze text content with multiple analysis types:
- **basic**: Word count, sentence count, basic statistics
- **detailed**: Vocabulary analysis, word frequency
- **sentiment**: Simple sentiment analysis

**Example**:
```python
result = analyze_text("Hello world! This is a test.", "detailed")
```

### `calculate_statistics`
Calculate statistics for numerical data:
- Mean, median, mode
- Standard deviation, variance
- Min, max, range

**Example**:
```python
stats = calculate_statistics([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
```

### `generate_summary`
Generate intelligent summaries of data items:
- Automatic categorization
- Context-aware summarization
- Confidence scoring

**Example**:
```python
summary = generate_summary(["item1", "item2", "item3"], "technical")
```

## Available Resources

### `file://config/{config_name}`
Retrieve configuration data with structured responses:
- `server`: Server configuration
- `database`: Database settings
- `cache`: Cache configuration

**Returns**: `ConfigResponse` with structured data

**Example**:
```python
config = await get_config("server")
# Returns: ConfigResponse(config_name="server", data={...}, success=True)
```

## Available Prompts

### `analysis_prompt`
Generate analysis prompt templates with customizable detail levels:
- **basic**: High-level overview
- **medium**: Detailed analysis with evidence
- **detailed**: Comprehensive analysis with methodology

**Example**:
```python
prompt = analysis_prompt("customer_data", "detailed")
```

## Error Handling

The server implements comprehensive error handling:
- Input validation with clear error messages
- Graceful degradation for partial failures
- Structured error responses with debugging information
- Logging for troubleshooting and monitoring

## Type Safety

All tools use FastMCPBaseModel for:
- Input validation with performance optimization
- Structured output definition
- Automatic schema generation
- Runtime type checking with caching
- 20-50% performance improvement over standard Pydantic models

## Architecture Patterns

This example demonstrates MCP Registry Gateway project patterns:
- **FastMCP 2.12.0+ Implementation**: Modern FastMCP patterns with enhanced features
- **FastMCPBaseModel Responses**: Performance-optimized structured responses
- **MREG_ Environment Variables**: Following project naming conventions
- **Async/Await Patterns**: Modern Python throughout
- **Production-Ready Code**: Error handling, logging, validation
- **Type Safety**: Comprehensive validation and performance optimization

## Environment Variables

Supported MREG_ environment variables:
- `MREG_SERVER_NAME`: Server name (default: "minimal-mcp-server")
- `MREG_SERVER_VERSION`: Server version (default: "1.0.0")
- `MREG_LOG_LEVEL`: Logging level (default: "INFO")

## Testing

Run basic tests using the testing framework:
```bash
# Test with the MCP compliance framework
python ../testing-framework/test_mcp_compliance.py --server-command "python server.py"

# Using pytest for unit tests (if implemented)
pytest test_server.py
```

## Integration with MCP Registry Gateway

This minimal server can be registered with the MCP Registry Gateway:

```bash
# Register with the gateway (requires running gateway)
curl -X POST http://localhost:8000/api/v1/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "minimal-server",
    "endpoint_url": "stdio://python server.py",
    "transport_type": "stdio",
    "tags": {"example": "minimal", "type": "demo"}
  }'
```

## Next Steps

Use this minimal server as a foundation for:
1. Adding domain-specific tools and resources
2. Implementing authentication (see enterprise-auth-server example)
3. Adding database connectivity and caching
4. Integrating monitoring and observability
5. Scaling to production environments

For more advanced examples, see:
- `../enterprise-auth-server/` - Azure OAuth authentication with middleware
- `../testing-framework/` - Comprehensive protocol compliance validation
- Main project: `../../../src/mcp_registry_gateway/` - Full enterprise implementation