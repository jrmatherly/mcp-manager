# MCP Compliance Testing Framework for MCP Registry Gateway

Comprehensive testing framework following MCP Registry Gateway patterns with:
- FastMCP 2.12.0+ server testing
- Azure OAuth authentication testing
- Middleware testing (auth, rate limiting, audit)
- Database testing (PostgreSQL + Redis)
- Dual-server architecture testing (FastAPI + FastMCP)
- FastMCPBaseModel response validation
- MREG_ environment variable testing
- Core MCP protocol compliance validation

## Features

### Core MCP Testing
- **Protocol Compliance**: Automated validation against MCP specification
- **JSON-RPC Compliance**: Complete JSON-RPC 2.0 protocol testing
- **Transport Testing**: stdio, HTTP, and SSE transport validation
- **Capability Negotiation**: Feature detection and compatibility testing
- **Performance Benchmarking**: Load testing and performance metrics
- **Security Validation**: Input validation and security boundary testing

### MCP Registry Gateway Extensions
- **Azure OAuth Testing**: Authentication flow and token validation
- **Middleware Testing**: Rate limiting, audit logging, access control
- **Database Testing**: PostgreSQL and Redis connectivity
- **Dual-Server Architecture**: FastAPI + FastMCP coordination testing
- **Environment Variables**: MREG_ configuration validation
- **FastMCPBaseModel Validation**: Structured response testing
- **Gateway Integration**: Server registration and discovery testing

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Test Local Server**:
   ```bash
   python test_mcp_compliance.py --server-command "python ../minimal-mcp-server/server.py"
   ```

3. **Test Remote Server**:
   ```bash
   python test_mcp_compliance.py --server-url "http://localhost:8000"
   ```

4. **Generate Report**:
   ```bash
   python test_mcp_compliance.py --server-command "python server.py" --report compliance_report.json
   ```

## Testing Categories

### Protocol Compliance Tests
- **Initialization**: Server startup and capability negotiation
- **Tool Discovery**: Tool enumeration and schema validation
- **Resource Access**: Resource listing and content retrieval
- **Prompt Templates**: Prompt discovery and parameter validation

### JSON-RPC 2.0 Tests
- **Message Format**: Request/response structure validation
- **Error Handling**: Error code and message compliance
- **Batch Requests**: Multiple request processing
- **Notification Handling**: One-way message processing

### Transport Layer Tests
- **stdio Transport**: Process communication validation
- **HTTP Transport**: RESTful API compliance
- **SSE Transport**: Server-sent events functionality
- **WebSocket Transport**: Bidirectional communication

### Security Tests
- **Input Validation**: Malformed request handling
- **Authentication**: OAuth and JWT validation
- **Authorization**: Scope and permission testing
- **Rate Limiting**: DoS protection validation

### Performance Tests
- **Throughput**: Requests per second measurement
- **Latency**: Response time analysis
- **Memory Usage**: Resource consumption monitoring
- **Concurrent Connections**: Multi-client testing

## Test Configuration

### Basic Configuration
```python
test_config = {
    "server_command": "python server.py",
    "timeout": 30,
    "max_connections": 10,
    "test_suites": ["protocol", "security", "performance"]
}
```

### Advanced Configuration
```python
advanced_config = {
    "transport_tests": {
        "stdio": True,
        "http": True,
        "sse": True
    },
    "performance_tests": {
        "load_test_duration": 60,
        "concurrent_clients": 50,
        "ramp_up_time": 10
    },
    "security_tests": {
        "fuzzing_enabled": True,
        "auth_testing": True,
        "injection_tests": True
    }
}
```

## Test Results

### Compliance Scoring
The framework generates a compliance score based on:
- Protocol adherence (40%)
- Security compliance (30%)
- Performance benchmarks (20%)
- Documentation quality (10%)

### Report Format
```json
{
  "overall_score": 95.2,
  "test_results": {
    "protocol_compliance": {
      "score": 98.5,
      "tests_passed": 47,
      "tests_failed": 1,
      "details": {...}
    },
    "security_validation": {
      "score": 92.1,
      "vulnerabilities": [],
      "recommendations": [...]
    },
    "performance_metrics": {
      "score": 94.8,
      "avg_response_time": 45.2,
      "throughput": 1250.5,
      "memory_usage": "peak: 128MB"
    }
  }
}
```

## Usage Examples

### Test Minimal Server
```bash
python test_mcp_compliance.py \
  --server-command "python ../minimal-mcp-server/server.py" \
  --test-suites protocol security \
  --output-format json
```

### Test Enterprise Server
```bash
python test_mcp_compliance.py \
  --server-command "python ../enterprise-auth-server/server.py" \
  --test-suites protocol security performance \
  --auth-token "your-jwt-token" \
  --report enterprise_compliance.json
```

### Continuous Integration
```bash
# Run in CI/CD pipeline
python test_mcp_compliance.py \
  --server-command "python server.py" \
  --ci-mode \
  --fail-threshold 90 \
  --output-format junit
```

## Test Suite Details

### Protocol Tests
- Capability negotiation flow
- Tool registration and discovery
- Resource listing and access
- Prompt template validation
- Error handling compliance

### Security Tests
- Input sanitization validation
- Authentication flow testing
- Authorization boundary checks
- Rate limiting verification
- Security header validation

### Performance Tests
- Response time measurement
- Throughput benchmarking
- Memory usage profiling
- Connection handling
- Concurrent request processing

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run MCP Compliance Tests
  run: |
    python examples/testing-framework/test_mcp_compliance.py \
      --server-command "python server.py" \
      --ci-mode \
      --fail-threshold 85
```

### Pre-commit Hooks
```bash
### Project Makefile Integration
```makefile
# Add to main project Makefile
.PHONY: test-compliance
test-compliance:
	docker-compose up -d postgres redis
	uv run mcp-gateway serve --port 8000 &
	sleep 5
	cd docs/project_context/examples/testing-framework && \
	  python test_mcp_compliance.py --profile gateway
	docker-compose down
```
```

## Extending the Framework

### Custom Test Cases
```python
class CustomMCPTest(MCPTestCase):
    async def test_custom_tool(self):
        result = await self.call_tool("custom_tool", {"param": "value"})
        self.assertEqual(result["status"], "success")
```

### Custom Validators
```python
def custom_response_validator(response):
    """Custom validation logic for specific requirements"""
    return response.get("custom_field") is not None
```

## Next Steps

Use this testing framework for:
1. Validating MCP server implementations
2. Continuous integration testing
3. Performance regression detection
4. Security compliance verification
5. Protocol conformance validation

## Integration with Main Project Testing

### Using with Project Scripts
```bash
# Integration with main project test script
./scripts/test.sh

# Then run compliance testing
cd docs/project_context/examples/testing-framework
python test_mcp_compliance.py --profile gateway
```

### Development Workflow
1. **Code Changes**: Make changes to MCP server implementation
2. **Unit Tests**: Run project unit tests (`./scripts/test.sh`)
3. **Compliance Testing**: Run MCP compliance tests
4. **Integration Testing**: Test with Gateway if applicable
5. **Performance Validation**: Check performance metrics

### Next Steps

Use this testing framework for:
1. **MCP Server Validation**: Test any MCP server implementation
2. **Gateway Integration**: Validate servers work with the Gateway
3. **Authentication Testing**: Test Azure OAuth integration
4. **Performance Monitoring**: Track response times and throughput
5. **CI/CD Integration**: Automated testing in pipelines
6. **Production Readiness**: Validate deployment configurations

### Advanced Testing Scenarios
- **Load Testing**: High-volume request testing with multiple clients
- **Security Testing**: Authentication bypass attempts and input fuzzing  
- **Network Testing**: Timeout handling and connection reliability
- **Database Testing**: Connection pool exhaustion and failover
- **Multi-Tenant Testing**: Tenant isolation and access control
- **Performance Regression**: Automated performance baseline comparison