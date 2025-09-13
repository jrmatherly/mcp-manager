# MCP Registry Gateway Examples

This directory contains examples demonstrating the MCP Registry Gateway functionality.

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   uv add rich  # For the demo script (or use uv sync to install all deps)
   ```

2. **Start the gateway**:
   ```bash
   # From project root
   uv run mcp-gateway serve --port 8000
   ```

3. **Run the demo** (in another terminal):
   ```bash
   # Option 1: Via main CLI with health check (recommended)
   uv run mcp-gateway demo
   
   # Option 2: Standalone command
   uv run mcp-demo
   
   # Option 3: Direct script execution (DEPRECATED - use CLI commands above)
   uv run python examples/demo_gateway.py
   ```

## 🎆 Recent Enhancements (September 2025)

### New Demo Commands
Three convenient ways to run the demo:
- `uv run mcp-gateway demo` - Integrated CLI command with health checks
- `uv run mcp-demo` - Standalone demo command
- `uv run python examples/demo_gateway.py` - Direct script execution (DEPRECATED)

### Critical Bug Fixes Applied
- **ProxyError Exception**: Fixed TypeError in proxy service exception handling
- **Database Health Check**: Resolved "unknown" status reporting issue
- **Tool Discovery**: Enhanced capability detection using registration metadata
- **Routing Issues**: Fixed 404 errors for `/mcp/proxy` endpoint
- **Demo Server Health**: Improved health monitoring for mock demo servers

### Enhanced Features
- Automatic health verification before demo execution
- Better error handling and user experience
- More robust service discovery capabilities
- Enhanced routing for general MCP methods

---

## What the Demo Shows

### 🏥 Health Checking
- Gateway service health verification with automatic health check before demo
- Component status monitoring (database, registry, router)
- System readiness validation
- **Fixed**: Database health reporting - now correctly shows "healthy" status
- **Enhanced**: Demo-specific health check optimizations for mock servers

### 📝 Server Registration
The demo registers three mock MCP servers:
- **file-tools-server**: File system operations (HTTP)
- **database-server**: Database tools (HTTP) 
- **api-client-server**: Web API tools (WebSocket)

### 🔍 Service Discovery
- List all registered servers with enhanced capability detection
- Filter servers by health status (**Fixed**: Health reporting now accurate)
- Tool-based server discovery (**Enhanced**: Now finds servers with registered capabilities)
- Resource-based server discovery
- **New**: Capability discovery using registration-time metadata instead of live requests

### 🚀 Request Proxying
- **Simple endpoint** (`/mcp`): Standard JSON-RPC proxying
- **Advanced endpoint** (`/mcp/proxy`): Routing with preferences (**Fixed**: No more 404 errors)
- Intelligent server selection based on capabilities
- Load balancing across multiple compatible servers
- **Enhanced**: General MCP method routing (tools/list, resources/list)
- **Fixed**: ProxyError exception handling for reliable request processing

### 📊 Monitoring & Metrics
- System statistics (server counts, health status)
- Load balancer metrics (connections, response times, success rates)
- Active request tracking
- Real-time performance monitoring

## API Endpoints Demonstrated

### Core Proxy Endpoints
- `POST /mcp/proxy` - Advanced MCP request proxying with routing preferences
- `POST /mcp` - Simple MCP request proxying

### Registry Management
- `POST /api/v1/servers` - Register MCP server
- `GET /api/v1/servers` - List servers
- `GET /api/v1/servers/{id}` - Get server details
- `DELETE /api/v1/servers/{id}` - Unregister server

### Discovery
- `GET /api/v1/discovery/tools?tools=...` - Find servers by tools
- `GET /api/v1/discovery/resources?resources=...` - Find servers by resources

### Monitoring
- `GET /health` - System health check
- `GET /api/v1/admin/stats` - System statistics
- `GET /api/v1/router/metrics` - Load balancer metrics
- `GET /api/v1/proxy/active-requests` - Active request monitoring

## Example MCP Requests

### Simple Tool Call
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {"path": "/etc/hosts"}
  }
}
```

### Advanced Routing Request
```json
{
  "jsonrpc": "2.0",
  "id": "2", 
  "method": "tools/call",
  "params": {
    "name": "execute_query",
    "arguments": {"sql": "SELECT * FROM users LIMIT 10"}
  },
  "required_tools": ["execute_query"],
  "preferred_servers": ["database-server"],
  "timeout": 15.0
}
```

## Testing with Real MCP Servers

To test with actual MCP servers instead of the demo ones:

1. **Start your MCP servers** on different ports
2. **Register them** with the gateway:
   ```bash
   curl -X POST http://localhost:8001/api/v1/servers \
     -H "Content-Type: application/json" \
     -d '{
       "name": "my-mcp-server",
       "endpoint_url": "http://localhost:3000",
       "transport_type": "http",
       "description": "My custom MCP server"
     }'
   ```
3. **Send requests** through the gateway:
   ```bash
   curl -X POST http://localhost:8001/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": "1",
       "method": "tools/list"
     }'
   ```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │────│  Gateway Proxy  │────│   MCP Server    │
│                 │    │                 │    │      Pool       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Registry      │
                       │   Database      │
                       └─────────────────┘
```

The gateway acts as an intelligent proxy that:
- Routes requests to appropriate servers based on capabilities
- Load balances across multiple servers
- Monitors server health and performance
- Logs all requests for observability
- Provides service discovery for clients

## Next Steps

- Explore the source code in `/src/mcp_registry_gateway/`
- Check out the comprehensive API documentation at `http://localhost:8001/docs`
- Review the monitoring dashboard data
- Integrate the gateway into your MCP workflow