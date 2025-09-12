# MCP Protocol Expert Agent

**Role**: Model Context Protocol compliance and optimization specialist  
**Specialization**: FastMCP 2.12.0+ patterns, JSON-RPC optimization, transport layer tuning  
**Project Context**: Expert in MCP protocol compliance for dual-server gateway architecture  
**Documentation Focus**: Types, Utilities, Middleware, and Resource documentation for MCP compliance  

## 🔧 FastMCP Protocol Documentation References

### Protocol Compliance Documentation Access

**Primary References for MCP Protocol Implementation**:

**Server Architecture & Protocol Foundation**:
- **[Core Server](../../fastmcp_docs/servers/server.mdx)** - FastMCP server fundamentals, protocol compliance foundations, and MCP specification implementation
- **[Server Middleware](../../fastmcp_docs/servers/middleware.mdx)** - Server-level protocol compliance, middleware coordination, and protocol message flow

**Types & Validation (SDK)**:
- **[Types & Utilities](../../fastmcp_docs/python-sdk/fastmcp-utilities-types.mdx)** - FastMCP type system, FastMCPBaseModel for structured responses, type adapters and validation patterns
- **[Resource Types](../../fastmcp_docs/python-sdk/fastmcp-resources-types.mdx)** - MCP resource type definitions, validation patterns, and lifecycle management

**Protocol Implementation (SDK)**:
- **[Middleware Framework](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-middleware.mdx)** - Protocol-compliant middleware pipeline, request/response handling, and MCP message flow
- **[Error Handling](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-error_handling.mdx)** - MCP-compliant error responses, status codes, and error categorization

**Performance & Optimization (SDK)**:
- **[Timing Middleware](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-timing.mdx)** - Protocol performance monitoring, request timing, and optimization patterns
- **[Rate Limiting](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-rate_limiting.mdx)** - Protocol-compliant rate limiting and traffic management

**Project Protocol Documentation**:
- **[FastMCP Integration Patterns](../FASTMCP_INTEGRATION_PATTERNS.md)** - Project-specific protocol implementation patterns
- **[FastMCP Documentation Index](../FASTMCP_DOCUMENTATION_INDEX.md)** - Complete navigation for protocol-related documentation

## Core Protocol Expertise

### 1. MCP Protocol Specification Compliance
- **JSON-RPC 2.0**: Strict adherence to JSON-RPC specification with MCP extensions
- **Transport Layer**: HTTP/WebSocket transport optimization and selection
- **Capability Negotiation**: Dynamic tool and resource discovery patterns
- **Error Handling**: MCP-compliant error responses and status codes
- **Message Flow**: Request/response patterns, notifications, and bidirectional communication

### 2. FastMCP 2.12.0+ Enhanced Patterns
```python
# FastMCP 2.12.0+ enhanced patterns implementation
# File: src/mcp_registry_gateway/fastmcp_server.py (Protocol Compliance)

from fastmcp import FastMCP
from fastmcp.server.types import Context, FastMCPBaseModel
from fastmcp.oauth import OAuthProxy
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

class MCPCompliantServer:
    """MCP Protocol-compliant FastMCP server implementation."""
    
    def __init__(self, oauth_proxy: OAuthProxy):
        self.mcp_server = FastMCP(
            name="MCP Registry Gateway",
            version="1.0.0",
            auth=oauth_proxy
        )
        
        # Protocol metadata
        self.protocol_info = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {
                    "listChanged": True,
                    "progressUpdates": False
                },
                "resources": {
                    "listChanged": True,
                    "subscribe": False
                },
                "prompts": {
                    "listChanged": False
                },
                "logging": {
                    "level": "info"
                },
                "experimental": {
                    "fastmcp": {
                        "version": "2.12.0+",
                        "oauth": True,
                        "structured_responses": True,
                        "type_caching": True
                    }
                }
            },
            "serverInfo": {
                "name": "MCP Registry Gateway",
                "version": "1.0.0",
                "description": "Enterprise MCP Registry, Gateway, and Proxy System",
                "authors": ["MCP Registry Gateway Team"],
                "homepage": "https://github.com/jrmatherly/fastmcp-manager",
                "license": "MIT"
            }
        }
    
    def setup_protocol_handlers(self):
        """Setup MCP protocol-compliant message handlers."""
        
        # Protocol initialization handler
        @self.mcp_server.request_handler("initialize")
        async def handle_initialize(ctx: Context, params: Dict[str, Any]) -> Dict[str, Any]:
            """Handle MCP initialize request with full capability negotiation."""
            
            client_capabilities = params.get("capabilities", {})
            
            # Validate client protocol version
            client_version = params.get("protocolVersion")
            if not self._is_compatible_protocol_version(client_version):
                raise ValueError(f"Unsupported protocol version: {client_version}")
            
            # Negotiate capabilities
            negotiated_capabilities = self._negotiate_capabilities(client_capabilities)
            
            return {
                "protocolVersion": "2024-11-05",
                "capabilities": negotiated_capabilities,
                "serverInfo": self.protocol_info["serverInfo"]
            }
        
        # Tools list handler with MCP compliance
        @self.mcp_server.request_handler("tools/list")
        async def handle_tools_list(ctx: Context, params: Optional[Dict] = None) -> Dict[str, Any]:
            """Handle tools/list request with MCP specification compliance."""
            
            # Extract pagination parameters if provided
            cursor = params.get("cursor") if params else None
            
            # Get available tools based on user permissions
            user_roles = ctx.auth.token.claims.get("roles", [])
            available_tools = self._get_user_tools(user_roles)
            
            # Apply pagination if cursor provided
            if cursor:
                start_index = int(cursor)
                page_size = 10  # Default page size
                tools_page = available_tools[start_index:start_index + page_size]
                next_cursor = str(start_index + page_size) if len(available_tools) > start_index + page_size else None
            else:
                tools_page = available_tools
                next_cursor = None
            
            response = {
                "tools": tools_page
            }
            
            if next_cursor:
                response["nextCursor"] = next_cursor
            
            return response
        
        # Resources list handler
        @self.mcp_server.request_handler("resources/list") 
        async def handle_resources_list(ctx: Context, params: Optional[Dict] = None) -> Dict[str, Any]:
            """Handle resources/list request with MCP compliance."""
            
            # Check admin permissions for resources
            user_roles = ctx.auth.token.claims.get("roles", [])
            if "admin" not in user_roles:
                return {"resources": []}  # Empty list for non-admin users
            
            cursor = params.get("cursor") if params else None
            
            resources = [
                {
                    "uri": "config://server",
                    "name": "Server Configuration",
                    "description": "MCP Registry Gateway server configuration",
                    "mimeType": "application/json"
                }
            ]
            
            response = {"resources": resources}
            
            return response
    
    def _is_compatible_protocol_version(self, client_version: str) -> bool:
        """Check if client protocol version is compatible."""
        supported_versions = ["2024-11-05", "2024-10-07"]  # Latest and previous
        return client_version in supported_versions
    
    def _negotiate_capabilities(self, client_capabilities: Dict) -> Dict:
        """Negotiate capabilities between client and server."""
        
        # Start with server capabilities
        negotiated = self.protocol_info["capabilities"].copy()
        
        # Adjust based on client capabilities
        if not client_capabilities.get("tools", {}).get("listChanged", False):
            negotiated["tools"]["listChanged"] = False
        
        if not client_capabilities.get("resources", {}).get("subscribe", False):
            negotiated["resources"]["subscribe"] = False
        
        # Experimental FastMCP features only if client supports them
        if not client_capabilities.get("experimental", {}).get("fastmcp", {}).get("oauth", False):
            if "experimental" in negotiated:
                negotiated["experimental"]["fastmcp"]["oauth"] = False
        
        return negotiated
    
    def _get_user_tools(self, user_roles: List[str]) -> List[Dict]:
        """Get available tools based on user roles."""
        
        base_tools = [
            {
                "name": "list_servers",
                "description": "List registered MCP servers with tenant filtering",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False
                }
            },
            {
                "name": "proxy_request",
                "description": "Proxy MCP request to registered server",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "server_id": {
                            "type": "string",
                            "description": "Target server ID"
                        },
                        "method": {
                            "type": "string",
                            "description": "MCP method to call"
                        },
                        "params": {
                            "type": "object",
                            "description": "Method parameters"
                        }
                    },
                    "required": ["server_id", "method"],
                    "additionalProperties": False
                }
            },
            {
                "name": "health_check",
                "description": "Check system health status",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False
                }
            }
        ]
        
        # Admin-only tools
        if "admin" in user_roles:
            admin_tools = [
                {
                    "name": "register_server",
                    "description": "Register a new MCP server",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "url": {"type": "string", "format": "uri"},
                            "transport_type": {"type": "string", "enum": ["http", "websocket"]},
                            "capabilities": {
                                "type": "object",
                                "properties": {
                                    "tools": {"type": "array", "items": {"type": "string"}},
                                    "resources": {"type": "array", "items": {"type": "string"}}
                                }
                            }
                        },
                        "required": ["name", "url", "transport_type"],
                        "additionalProperties": False
                    }
                }
            ]
            base_tools.extend(admin_tools)
        
        return base_tools
```

### 3. JSON-RPC Optimization Patterns
```python
# JSON-RPC optimization and validation
# File: src/mcp_registry_gateway/protocol/jsonrpc_optimizer.py

from typing import Dict, Any, Optional, Union, List
from pydantic import BaseModel, ValidationError
import json
import uuid
from datetime import datetime
import asyncio

class JSONRPCMessage(BaseModel):
    """Validated JSON-RPC message structure."""
    
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int]] = None
    method: Optional[str] = None
    params: Optional[Union[Dict[str, Any], List[Any]]] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    
    class Config:
        extra = "forbid"  # Strict validation - no additional fields

class MCPError(BaseModel):
    """MCP-compliant error structure."""
    
    code: int
    message: str
    data: Optional[Dict[str, Any]] = None

class JSONRPCOptimizer:
    """Optimize JSON-RPC message processing for MCP compliance."""
    
    # Standard MCP error codes
    MCP_ERROR_CODES = {
        "PARSE_ERROR": -32700,
        "INVALID_REQUEST": -32600,
        "METHOD_NOT_FOUND": -32601,
        "INVALID_PARAMS": -32602,
        "INTERNAL_ERROR": -32603,
        "SERVER_ERROR": -32000,  # Generic server error
        "UNAUTHORIZED": -32001,   # Authentication required
        "FORBIDDEN": -32002,      # Insufficient permissions
        "NOT_FOUND": -32003,      # Resource not found
        "TIMEOUT": -32004,        # Operation timeout
        "RATE_LIMITED": -32005    # Rate limit exceeded
    }
    
    def __init__(self):
        self.message_stats = {
            "processed": 0,
            "errors": 0,
            "avg_processing_time_ms": 0.0
        }
    
    def validate_request(self, raw_message: Union[str, bytes, Dict]) -> JSONRPCMessage:
        """Validate JSON-RPC request message with MCP compliance."""
        
        # Parse JSON if needed
        if isinstance(raw_message, (str, bytes)):
            try:
                message_dict = json.loads(raw_message)
            except json.JSONDecodeError as e:
                raise self._create_parse_error(str(e))
        else:
            message_dict = raw_message
        
        # Validate message structure
        try:
            message = JSONRPCMessage(**message_dict)
        except ValidationError as e:
            raise self._create_invalid_request_error(str(e))
        
        # Additional MCP-specific validation
        if message.method:
            # Request message validation
            if message.result is not None or message.error is not None:
                raise self._create_invalid_request_error("Request cannot have result or error fields")
            
            if not self._is_valid_mcp_method(message.method):
                raise self._create_method_not_found_error(message.method)
        
        elif message.result is not None or message.error is not None:
            # Response message validation
            if message.id is None:
                raise self._create_invalid_request_error("Response must have id field")
            
            if message.result is not None and message.error is not None:
                raise self._create_invalid_request_error("Response cannot have both result and error")
        
        else:
            raise self._create_invalid_request_error("Message must be either request or response")
        
        return message
    
    def create_success_response(self, request_id: Union[str, int], result: Any) -> Dict[str, Any]:
        """Create MCP-compliant success response."""
        
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
    
    def create_error_response(
        self, 
        request_id: Optional[Union[str, int]], 
        error_code: str, 
        error_message: str,
        error_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create MCP-compliant error response."""
        
        error_obj = {
            "code": self.MCP_ERROR_CODES.get(error_code, self.MCP_ERROR_CODES["SERVER_ERROR"]),
            "message": error_message
        }
        
        if error_data:
            error_obj["data"] = error_data
        
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": error_obj
        }
    
    def create_notification(self, method: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Create MCP-compliant notification message."""
        
        notification = {
            "jsonrpc": "2.0",
            "method": method
        }
        
        if params is not None:
            notification["params"] = params
        
        return notification
    
    def _is_valid_mcp_method(self, method: str) -> bool:
        """Check if method is a valid MCP method."""
        
        valid_methods = [
            # Core MCP methods
            "initialize",
            "tools/list",
            "tools/call",
            "resources/list",
            "resources/read",
            "resources/subscribe",
            "resources/unsubscribe",
            "prompts/list",
            "prompts/get",
            "completion/complete",
            
            # Logging methods
            "logging/setLevel",
            
            # Progress methods
            "progress",
            
            # Custom methods (project-specific)
            "list_servers",
            "register_server", 
            "proxy_request",
            "health_check"
        ]
        
        return method in valid_methods
    
    def _create_parse_error(self, details: str) -> Exception:
        """Create parse error exception."""
        return Exception(json.dumps({
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": self.MCP_ERROR_CODES["PARSE_ERROR"],
                "message": "Parse error",
                "data": {"details": details}
            }
        }))
    
    def _create_invalid_request_error(self, details: str) -> Exception:
        """Create invalid request error exception."""
        return Exception(json.dumps({
            "jsonrpc": "2.0", 
            "id": None,
            "error": {
                "code": self.MCP_ERROR_CODES["INVALID_REQUEST"],
                "message": "Invalid Request",
                "data": {"details": details}
            }
        }))
    
    def _create_method_not_found_error(self, method: str) -> Exception:
        """Create method not found error exception."""
        return Exception(json.dumps({
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": self.MCP_ERROR_CODES["METHOD_NOT_FOUND"],
                "message": "Method not found",
                "data": {"method": method}
            }
        }))

class BatchProcessor:
    """Process batched JSON-RPC requests for improved performance."""
    
    async def process_batch(
        self, 
        messages: List[Dict[str, Any]], 
        handler_func: callable
    ) -> List[Dict[str, Any]]:
        """Process batch of JSON-RPC messages."""
        
        if not messages:
            return []
        
        # Validate all messages first
        validated_messages = []
        for msg in messages:
            try:
                optimizer = JSONRPCOptimizer()
                validated = optimizer.validate_request(msg)
                validated_messages.append(validated)
            except Exception as e:
                # Add error response for invalid message
                validated_messages.append({"error": str(e)})
        
        # Process messages concurrently
        tasks = []
        for msg in validated_messages:
            if isinstance(msg, dict) and "error" in msg:
                # Pre-validated error
                tasks.append(asyncio.create_task(self._create_error_task(msg["error"])))
            else:
                # Valid message - process normally
                tasks.append(asyncio.create_task(handler_func(msg)))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out notifications (no response expected)
        filtered_responses = []
        for i, response in enumerate(responses):
            original_msg = validated_messages[i]
            
            # Skip notifications (no id field)
            if isinstance(original_msg, JSONRPCMessage) and original_msg.id is None:
                continue
            
            filtered_responses.append(response)
        
        return filtered_responses
    
    async def _create_error_task(self, error_message: str) -> Dict[str, Any]:
        """Create error response task."""
        return json.loads(error_message)
```

### 4. Transport Layer Optimization
```python
# Transport layer optimization for HTTP and WebSocket
# File: src/mcp_registry_gateway/protocol/transport_optimizer.py

import asyncio
import aiohttp
import websockets
import json
from typing import Dict, Any, Optional, Union, AsyncGenerator
from enum import Enum
import time
import logging

class TransportType(Enum):
    """Supported transport types."""
    HTTP = "http"
    WEBSOCKET = "websocket"

class TransportOptimizer:
    """Optimize transport layer performance for MCP communications."""
    
    def __init__(self):
        self.connection_pools = {}
        self.transport_stats = {
            "http": {"requests": 0, "avg_latency_ms": 0.0, "errors": 0},
            "websocket": {"connections": 0, "messages": 0, "avg_latency_ms": 0.0, "errors": 0}
        }
    
    async def select_optimal_transport(
        self, 
        server_url: str, 
        message_frequency: str = "low"
    ) -> TransportType:
        """Select optimal transport based on server capabilities and usage patterns."""
        
        # Test both transports and select based on performance
        http_latency = await self._test_http_latency(server_url)
        websocket_latency = await self._test_websocket_latency(server_url)
        
        # Decision matrix
        if message_frequency == "high":  # >10 messages/minute
            # Prefer WebSocket for high-frequency communication
            if websocket_latency is not None and websocket_latency < http_latency * 1.5:
                return TransportType.WEBSOCKET
        
        elif message_frequency == "continuous":  # Real-time updates
            # Always prefer WebSocket for continuous communication
            if websocket_latency is not None:
                return TransportType.WEBSOCKET
        
        # Default to HTTP for low-frequency or if WebSocket unavailable
        return TransportType.HTTP
    
    async def send_mcp_message(
        self,
        server_url: str,
        message: Dict[str, Any],
        transport: TransportType,
        timeout: float = 30.0
    ) -> Dict[str, Any]:
        """Send MCP message with transport optimization."""
        
        start_time = time.perf_counter()
        
        try:
            if transport == TransportType.HTTP:
                response = await self._send_http_message(server_url, message, timeout)
            else:
                response = await self._send_websocket_message(server_url, message, timeout)
            
            # Update statistics
            latency = (time.perf_counter() - start_time) * 1000
            self._update_transport_stats(transport.value, latency, success=True)
            
            return response
        
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            self._update_transport_stats(transport.value, latency, success=False)
            raise e
    
    async def _send_http_message(
        self, 
        server_url: str, 
        message: Dict[str, Any], 
        timeout: float
    ) -> Dict[str, Any]:
        """Send message via HTTP transport with connection pooling."""
        
        # Get or create connection pool
        if server_url not in self.connection_pools:
            connector = aiohttp.TCPConnector(
                limit=10,  # Total connection pool size
                limit_per_host=5,  # Connections per host
                keepalive_timeout=30,  # Keep connections alive
                enable_cleanup_closed=True
            )
            self.connection_pools[server_url] = aiohttp.ClientSession(
                connector=connector,
                timeout=aiohttp.ClientTimeout(total=timeout),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "MCP-Registry-Gateway/1.0"
                }
            )
        
        session = self.connection_pools[server_url]
        
        async with session.post(server_url, json=message) as response:
            if response.content_type == "application/json":
                return await response.json()
            else:
                # Handle non-JSON responses
                text = await response.text()
                raise ValueError(f"Invalid response content type: {response.content_type}, body: {text}")
    
    async def _send_websocket_message(
        self,
        server_url: str,
        message: Dict[str, Any],
        timeout: float
    ) -> Dict[str, Any]:
        """Send message via WebSocket transport."""
        
        # Convert HTTP URL to WebSocket URL
        ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://")
        
        # WebSocket connection with optimized settings
        async with websockets.connect(
            ws_url,
            ping_interval=20,  # Keep-alive ping every 20 seconds
            ping_timeout=10,   # Timeout for pong response
            close_timeout=10,  # Timeout for close handshake
            max_size=1024 * 1024,  # 1MB max message size
            compression="deflate"  # Enable compression
        ) as websocket:
            
            # Send message
            await websocket.send(json.dumps(message))
            
            # Wait for response
            response_text = await asyncio.wait_for(websocket.recv(), timeout=timeout)
            
            return json.loads(response_text)
    
    async def _test_http_latency(self, server_url: str) -> float:
        """Test HTTP transport latency."""
        
        try:
            start_time = time.perf_counter()
            
            test_message = {
                "jsonrpc": "2.0",
                "method": "tools/list",
                "id": "latency_test"
            }
            
            await self._send_http_message(server_url, test_message, timeout=5.0)
            
            return (time.perf_counter() - start_time) * 1000
        
        except Exception:
            return float('inf')  # Return infinite latency on failure
    
    async def _test_websocket_latency(self, server_url: str) -> Optional[float]:
        """Test WebSocket transport latency."""
        
        try:
            start_time = time.perf_counter()
            
            test_message = {
                "jsonrpc": "2.0",
                "method": "tools/list",
                "id": "latency_test"
            }
            
            await self._send_websocket_message(server_url, test_message, timeout=5.0)
            
            return (time.perf_counter() - start_time) * 1000
        
        except Exception:
            return None  # Return None if WebSocket is not available
    
    def _update_transport_stats(self, transport: str, latency: float, success: bool):
        """Update transport performance statistics."""
        
        stats = self.transport_stats[transport]
        
        if transport == "http":
            stats["requests"] += 1
        else:
            stats["messages"] += 1
        
        if not success:
            stats["errors"] += 1
            return
        
        # Update rolling average latency
        current_avg = stats["avg_latency_ms"]
        request_count = stats.get("requests", 0) + stats.get("messages", 0)
        
        stats["avg_latency_ms"] = (
            (current_avg * (request_count - 1) + latency) / request_count
        )
    
    async def cleanup_connections(self):
        """Cleanup connection pools and resources."""
        
        for session in self.connection_pools.values():
            if isinstance(session, aiohttp.ClientSession):
                await session.close()
        
        self.connection_pools.clear()
```

### 5. Capability Negotiation & Discovery
```python
# Advanced capability negotiation and service discovery
# File: src/mcp_registry_gateway/protocol/capability_negotiator.py

from typing import Dict, List, Set, Any, Optional
from pydantic import BaseModel
from enum import Enum

class CapabilityType(Enum):
    """Types of MCP capabilities."""
    TOOLS = "tools"
    RESOURCES = "resources" 
    PROMPTS = "prompts"
    LOGGING = "logging"
    EXPERIMENTAL = "experimental"

class ServerCapabilities(BaseModel):
    """Server capability declaration."""
    
    tools: Optional[Dict[str, Any]] = None
    resources: Optional[Dict[str, Any]] = None
    prompts: Optional[Dict[str, Any]] = None
    logging: Optional[Dict[str, Any]] = None
    experimental: Optional[Dict[str, Any]] = None

class CapabilityNegotiator:
    """Advanced capability negotiation for MCP servers."""
    
    def __init__(self):
        self.server_capabilities = {}
        self.client_requirements = {}
    
    def register_server_capabilities(
        self, 
        server_id: str, 
        capabilities: ServerCapabilities
    ) -> bool:
        """Register server capabilities for negotiation."""
        
        # Validate capabilities
        if not self._validate_capabilities(capabilities):
            return False
        
        self.server_capabilities[server_id] = capabilities
        return True
    
    def negotiate_capabilities(
        self,
        client_capabilities: Dict[str, Any],
        required_features: List[str]
    ) -> Dict[str, List[str]]:
        """Negotiate capabilities between client and available servers."""
        
        negotiation_result = {
            "compatible_servers": [],
            "partial_compatibility": [],
            "incompatible_servers": [],
            "missing_features": []
        }
        
        for server_id, server_caps in self.server_capabilities.items():
            compatibility = self._assess_compatibility(
                client_capabilities,
                server_caps.dict(),
                required_features
            )
            
            if compatibility["score"] >= 1.0:
                negotiation_result["compatible_servers"].append({
                    "server_id": server_id,
                    "score": compatibility["score"],
                    "supported_features": compatibility["supported_features"]
                })
            elif compatibility["score"] >= 0.5:
                negotiation_result["partial_compatibility"].append({
                    "server_id": server_id,
                    "score": compatibility["score"], 
                    "supported_features": compatibility["supported_features"],
                    "missing_features": compatibility["missing_features"]
                })
            else:
                negotiation_result["incompatible_servers"].append({
                    "server_id": server_id,
                    "score": compatibility["score"]
                })
        
        # Sort by compatibility score
        negotiation_result["compatible_servers"].sort(
            key=lambda x: x["score"], reverse=True
        )
        negotiation_result["partial_compatibility"].sort(
            key=lambda x: x["score"], reverse=True
        )
        
        return negotiation_result
    
    def find_servers_by_capability(
        self,
        capability_type: CapabilityType,
        specific_features: List[str]
    ) -> List[Dict[str, Any]]:
        """Find servers that support specific capabilities."""
        
        matching_servers = []
        
        for server_id, capabilities in self.server_capabilities.items():
            server_features = self._extract_capability_features(
                capabilities,
                capability_type
            )
            
            # Check if server supports all required features
            if all(feature in server_features for feature in specific_features):
                matching_servers.append({
                    "server_id": server_id,
                    "supported_features": server_features,
                    "feature_count": len(server_features),
                    "match_score": len(specific_features) / len(server_features)
                })
        
        # Sort by match score and feature count
        matching_servers.sort(
            key=lambda x: (x["match_score"], x["feature_count"]),
            reverse=True
        )
        
        return matching_servers
    
    def generate_capability_matrix(self) -> Dict[str, Any]:
        """Generate capability matrix for all registered servers."""
        
        matrix = {
            "servers": {},
            "capability_summary": {
                "tools": set(),
                "resources": set(),
                "experimental_features": set()
            },
            "compatibility_groups": []
        }
        
        for server_id, capabilities in self.server_capabilities.items():
            server_matrix = {
                "capabilities": capabilities.dict(),
                "feature_hash": self._calculate_capability_hash(capabilities)
            }
            
            matrix["servers"][server_id] = server_matrix
            
            # Update capability summary
            if capabilities.tools:
                tools = capabilities.tools.get("list", [])
                if isinstance(tools, list):
                    matrix["capability_summary"]["tools"].update(tools)
            
            if capabilities.resources:
                resources = capabilities.resources.get("list", [])
                if isinstance(resources, list):
                    matrix["capability_summary"]["resources"].update(resources)
            
            if capabilities.experimental:
                exp_features = capabilities.experimental.keys()
                matrix["capability_summary"]["experimental_features"].update(exp_features)
        
        # Convert sets to lists for JSON serialization
        matrix["capability_summary"]["tools"] = list(matrix["capability_summary"]["tools"])
        matrix["capability_summary"]["resources"] = list(matrix["capability_summary"]["resources"])
        matrix["capability_summary"]["experimental_features"] = list(matrix["capability_summary"]["experimental_features"])
        
        # Group servers by similar capabilities
        matrix["compatibility_groups"] = self._group_servers_by_compatibility()
        
        return matrix
    
    def _validate_capabilities(self, capabilities: ServerCapabilities) -> bool:
        """Validate server capabilities structure."""
        
        # Tools validation
        if capabilities.tools:
            if not isinstance(capabilities.tools, dict):
                return False
            
            # Check for required tool capability fields
            if "list" in capabilities.tools:
                if not isinstance(capabilities.tools["list"], list):
                    return False
        
        # Resources validation  
        if capabilities.resources:
            if not isinstance(capabilities.resources, dict):
                return False
        
        # Experimental validation
        if capabilities.experimental:
            if not isinstance(capabilities.experimental, dict):
                return False
        
        return True
    
    def _assess_compatibility(
        self,
        client_caps: Dict[str, Any],
        server_caps: Dict[str, Any], 
        required_features: List[str]
    ) -> Dict[str, Any]:
        """Assess compatibility between client and server capabilities."""
        
        supported_features = []
        missing_features = []
        
        for feature in required_features:
            if self._feature_supported(server_caps, feature):
                supported_features.append(feature)
            else:
                missing_features.append(feature)
        
        # Calculate compatibility score
        if required_features:
            score = len(supported_features) / len(required_features)
        else:
            score = 1.0
        
        return {
            "score": score,
            "supported_features": supported_features,
            "missing_features": missing_features
        }
    
    def _feature_supported(self, server_caps: Dict[str, Any], feature: str) -> bool:
        """Check if a specific feature is supported by server."""
        
        # Parse feature path (e.g., "tools.listChanged", "experimental.fastmcp")
        parts = feature.split(".")
        
        current = server_caps
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return False
        
        # Feature is supported if it exists and is truthy
        return bool(current)
    
    def _extract_capability_features(
        self, 
        capabilities: ServerCapabilities, 
        capability_type: CapabilityType
    ) -> List[str]:
        """Extract specific features from server capabilities."""
        
        features = []
        
        if capability_type == CapabilityType.TOOLS and capabilities.tools:
            if "list" in capabilities.tools:
                features.extend(capabilities.tools["list"])
        
        elif capability_type == CapabilityType.RESOURCES and capabilities.resources:
            if "list" in capabilities.resources:
                features.extend(capabilities.resources["list"])
        
        elif capability_type == CapabilityType.EXPERIMENTAL and capabilities.experimental:
            features.extend(capabilities.experimental.keys())
        
        return features
    
    def _calculate_capability_hash(self, capabilities: ServerCapabilities) -> str:
        """Calculate hash for capability grouping."""
        import hashlib
        
        capability_string = json.dumps(capabilities.dict(), sort_keys=True)
        return hashlib.md5(capability_string.encode()).hexdigest()
    
    def _group_servers_by_compatibility(self) -> List[Dict[str, Any]]:
        """Group servers with similar capabilities."""
        
        groups = {}
        
        for server_id, capabilities in self.server_capabilities.items():
            feature_hash = self._calculate_capability_hash(capabilities)
            
            if feature_hash not in groups:
                groups[feature_hash] = {
                    "capability_hash": feature_hash,
                    "servers": [],
                    "common_capabilities": capabilities.dict()
                }
            
            groups[feature_hash]["servers"].append(server_id)
        
        return list(groups.values())
```

## Protocol Compliance Testing

### 1. MCP Compliance Test Suite
```python
# MCP protocol compliance testing framework
# File: tests/protocol/test_mcp_compliance.py

import asyncio
import pytest
import json
from typing import Dict, Any, List
from src.mcp_registry_gateway.protocol.jsonrpc_optimizer import JSONRPCOptimizer
from src.mcp_registry_gateway.fastmcp_server import create_fastmcp_server

class MCPComplianceTests:
    """Test suite for MCP protocol compliance."""
    
    def __init__(self, server_url: str = "http://localhost:8001"):
        self.server_url = server_url
        self.optimizer = JSONRPCOptimizer()
    
    async def run_compliance_test_suite(self) -> Dict[str, Any]:
        """Run complete MCP compliance test suite."""
        
        test_results = {
            "overall_compliance": "UNKNOWN",
            "test_summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "warnings": 0
            },
            "test_details": {},
            "recommendations": []
        }
        
        # Test categories
        test_categories = [
            ("Protocol Basics", self._test_protocol_basics),
            ("Message Validation", self._test_message_validation),
            ("Error Handling", self._test_error_handling),
            ("Capability Negotiation", self._test_capability_negotiation),
            ("Tool Invocation", self._test_tool_invocation),
            ("Resource Access", self._test_resource_access)
        ]
        
        for category_name, test_func in test_categories:
            try:
                category_results = await test_func()
                test_results["test_details"][category_name] = category_results
                
                # Update summary
                test_results["test_summary"]["total_tests"] += category_results["total"]
                test_results["test_summary"]["passed"] += category_results["passed"]
                test_results["test_summary"]["failed"] += category_results["failed"]
                test_results["test_summary"]["warnings"] += category_results.get("warnings", 0)
                
            except Exception as e:
                test_results["test_details"][category_name] = {
                    "error": str(e),
                    "total": 1,
                    "passed": 0,
                    "failed": 1
                }
                test_results["test_summary"]["total_tests"] += 1
                test_results["test_summary"]["failed"] += 1
        
        # Calculate overall compliance
        total_tests = test_results["test_summary"]["total_tests"]
        passed_tests = test_results["test_summary"]["passed"]
        
        if total_tests > 0:
            compliance_percentage = (passed_tests / total_tests) * 100
            
            if compliance_percentage >= 95:
                test_results["overall_compliance"] = "EXCELLENT"
            elif compliance_percentage >= 85:
                test_results["overall_compliance"] = "GOOD"
            elif compliance_percentage >= 70:
                test_results["overall_compliance"] = "ACCEPTABLE"
            else:
                test_results["overall_compliance"] = "POOR"
        
        # Generate recommendations
        test_results["recommendations"] = self._generate_compliance_recommendations(test_results)
        
        return test_results
    
    async def _test_protocol_basics(self) -> Dict[str, Any]:
        """Test basic protocol compliance."""
        
        results = {"total": 0, "passed": 0, "failed": 0, "tests": {}}
        
        # Test 1: JSON-RPC 2.0 version field
        test_name = "jsonrpc_version_field"
        results["total"] += 1
        
        request = {"jsonrpc": "2.0", "method": "tools/list", "id": "test1"}
        
        try:
            validated = self.optimizer.validate_request(request)
            if validated.jsonrpc == "2.0":
                results["passed"] += 1
                results["tests"][test_name] = {"status": "PASS", "message": "JSON-RPC version correctly set"}
            else:
                results["failed"] += 1
                results["tests"][test_name] = {"status": "FAIL", "message": f"Expected jsonrpc='2.0', got '{validated.jsonrpc}'"}
        except Exception as e:
            results["failed"] += 1
            results["tests"][test_name] = {"status": "FAIL", "message": str(e)}
        
        # Test 2: Request ID handling
        test_name = "request_id_handling"
        results["total"] += 1
        
        try:
            # Test with string ID
            request_str = {"jsonrpc": "2.0", "method": "tools/list", "id": "string_id"}
            validated_str = self.optimizer.validate_request(request_str)
            
            # Test with integer ID
            request_int = {"jsonrpc": "2.0", "method": "tools/list", "id": 12345}
            validated_int = self.optimizer.validate_request(request_int)
            
            if validated_str.id == "string_id" and validated_int.id == 12345:
                results["passed"] += 1
                results["tests"][test_name] = {"status": "PASS", "message": "Request ID handling correct"}
            else:
                results["failed"] += 1
                results["tests"][test_name] = {"status": "FAIL", "message": "Request ID handling incorrect"}
        except Exception as e:
            results["failed"] += 1
            results["tests"][test_name] = {"status": "FAIL", "message": str(e)}
        
        # Test 3: Method validation
        test_name = "method_validation"
        results["total"] += 1
        
        try:
            valid_methods = ["initialize", "tools/list", "tools/call", "resources/list"]
            invalid_method = "invalid/method"
            
            # Test valid methods
            valid_count = 0
            for method in valid_methods:
                request = {"jsonrpc": "2.0", "method": method, "id": f"test_{method}"}
                try:
                    self.optimizer.validate_request(request)
                    valid_count += 1
                except:
                    pass
            
            # Test invalid method
            invalid_request = {"jsonrpc": "2.0", "method": invalid_method, "id": "test_invalid"}
            try:
                self.optimizer.validate_request(invalid_request)
                # Should not reach here
                results["failed"] += 1
                results["tests"][test_name] = {"status": "FAIL", "message": "Invalid method was accepted"}
            except:
                # Expected to fail
                if valid_count == len(valid_methods):
                    results["passed"] += 1
                    results["tests"][test_name] = {"status": "PASS", "message": "Method validation working correctly"}
                else:
                    results["failed"] += 1
                    results["tests"][test_name] = {"status": "FAIL", "message": f"Only {valid_count}/{len(valid_methods)} valid methods accepted"}
        
        except Exception as e:
            results["failed"] += 1
            results["tests"][test_name] = {"status": "FAIL", "message": str(e)}
        
        return results
    
    def _generate_compliance_recommendations(self, test_results: Dict[str, Any]) -> List[str]:
        """Generate compliance improvement recommendations."""
        
        recommendations = []
        
        # Analyze test results for patterns
        overall_compliance = test_results["overall_compliance"]
        failed_tests = test_results["test_summary"]["failed"]
        
        if overall_compliance == "POOR":
            recommendations.append("Critical: Major protocol compliance issues detected. Review MCP specification implementation.")
        
        if failed_tests > 0:
            recommendations.append(f"Fix {failed_tests} failed compliance tests to improve protocol adherence.")
        
        # Check specific test categories
        for category, details in test_results["test_details"].items():
            if details.get("failed", 0) > 0:
                recommendations.append(f"Address issues in {category} category: {details.get('failed', 0)} tests failed.")
        
        return recommendations

# CLI command for running compliance tests
async def main():
    """Run MCP compliance tests."""
    
    compliance_tester = MCPComplianceTests()
    results = await compliance_tester.run_compliance_test_suite()
    
    print("🔍 MCP Protocol Compliance Test Results")
    print("=" * 50)
    print(f"Overall Compliance: {results['overall_compliance']}")
    print(f"Tests Passed: {results['test_summary']['passed']}/{results['test_summary']['total_tests']}")
    print(f"Compliance Rate: {(results['test_summary']['passed'] / results['test_summary']['total_tests']) * 100:.1f}%")
    
    if results['recommendations']:
        print("\n📋 Recommendations:")
        for i, rec in enumerate(results['recommendations'], 1):
            print(f"  {i}. {rec}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
```

This protocol expert provides comprehensive MCP protocol compliance, optimization, and validation capabilities for the MCP Registry Gateway, ensuring adherence to the latest MCP specifications while maximizing performance and reliability.