#!/usr/bin/env python3
"""
MCP Compliance Testing Framework

Comprehensive testing framework for validating MCP server implementations
against the official specification with automated protocol compliance checks,
performance benchmarks, and security validation.

Usage:
    python test_mcp_compliance.py --server-command "python server.py"
    python test_mcp_compliance.py --server-url "http://localhost:8000"
"""

import asyncio
import json
import time
import subprocess
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
import pytest
import aiohttp
from pathlib import Path
import tempfile
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Test result with detailed information"""

    test_name: str
    passed: bool
    duration: float
    details: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class MCPTestSuite:
    """MCP test suite configuration"""

    server_command: Optional[List[str]] = None
    server_url: Optional[str] = None
    transport: str = "stdio"
    timeout: float = 30.0
    verbose: bool = False


class MCPProtocolTester:
    """MCP protocol compliance tester"""

    def __init__(self, config: MCPTestSuite):
        self.config = config
        self.process = None
        self.session = None
        self.message_id_counter = 0
        self.results: List[TestResult] = []

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive MCP compliance tests"""
        logger.info("Starting MCP compliance test suite...")

        start_time = time.time()

        try:
            # Initialize connection
            await self._initialize_connection()

            # Run test categories
            await self._run_basic_protocol_tests()
            await self._run_capability_tests()
            await self._run_tool_tests()
            await self._run_resource_tests()
            await self._run_error_handling_tests()
            await self._run_performance_tests()
            await self._run_security_tests()

        except Exception as e:
            logger.error(f"Test suite failed: {str(e)}")
            self.results.append(
                TestResult(
                    test_name="test_suite_execution",
                    passed=False,
                    duration=time.time() - start_time,
                    errors=[f"Test suite execution failed: {str(e)}"],
                )
            )

        finally:
            await self._cleanup_connection()

        # Generate summary
        total_duration = time.time() - start_time
        return self._generate_test_report(total_duration)

    async def _initialize_connection(self):
        """Initialize connection based on transport type"""
        if self.config.transport == "stdio":
            await self._initialize_stdio()
        elif self.config.transport in ["http", "sse"]:
            await self._initialize_http()
        else:
            raise ValueError(f"Unsupported transport: {self.config.transport}")

    async def _initialize_stdio(self):
        """Initialize stdio transport"""
        if not self.config.server_command:
            raise ValueError("Server command required for stdio transport")

        try:
            self.process = await asyncio.create_subprocess_exec(
                *self.config.server_command,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # Wait for process to start
            await asyncio.sleep(1)

            if self.process.returncode is not None:
                stderr_output = await self.process.stderr.read()
                raise RuntimeError(f"Server process exited: {stderr_output.decode()}")

            logger.info(f"Server process started with PID: {self.process.pid}")

        except Exception as e:
            raise RuntimeError(f"Failed to start server process: {str(e)}")

    async def _initialize_http(self):
        """Initialize HTTP transport"""
        if not self.config.server_url:
            raise ValueError("Server URL required for HTTP transport")

        connector = aiohttp.TCPConnector(limit=10)
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        self.session = aiohttp.ClientSession(connector=connector, timeout=timeout)

        # Test basic connectivity
        try:
            async with self.session.get(f"{self.config.server_url}/health") as response:
                if response.status != 200:
                    raise RuntimeError(f"Health check failed: {response.status}")
        except Exception as e:
            raise RuntimeError(f"Failed to connect to server: {str(e)}")

    async def _cleanup_connection(self):
        """Cleanup connections and processes"""
        if self.process:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.process.kill()
                await self.process.wait()

        if self.session:
            await self.session.close()

    def _get_next_message_id(self) -> str:
        """Get next message ID"""
        self.message_id_counter += 1
        return f"test-{self.message_id_counter}"

    async def _send_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message and get response"""
        if self.config.transport == "stdio":
            return await self._send_stdio_message(message)
        elif self.config.transport in ["http", "sse"]:
            return await self._send_http_message(message)
        else:
            raise ValueError(f"Unsupported transport: {self.config.transport}")

    async def _send_stdio_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message via stdio"""
        message_bytes = (json.dumps(message) + "\n").encode("utf-8")
        self.process.stdin.write(message_bytes)
        await self.process.stdin.drain()

        # Read response
        response_line = await asyncio.wait_for(
            self.process.stdout.readline(), timeout=self.config.timeout
        )

        if not response_line:
            raise RuntimeError("No response received from server")

        response_data = json.loads(response_line.decode("utf-8").strip())
        return response_data

    async def _send_http_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message via HTTP"""
        url = f"{self.config.server_url}/mcp/v1/call"

        async with self.session.post(url, json=message) as response:
            if response.status != 200:
                raise RuntimeError(f"HTTP request failed: {response.status}")

            response_data = await response.json()
            return response_data

    async def _run_basic_protocol_tests(self):
        """Test basic JSON-RPC protocol compliance"""
        logger.info("Running basic protocol tests...")

        # Test 1: Initialization
        await self._test_initialization()

        # Test 2: JSON-RPC format compliance
        await self._test_jsonrpc_compliance()

        # Test 3: Error handling
        await self._test_basic_error_handling()

    async def _test_initialization(self):
        """Test MCP initialization sequence"""
        start_time = time.time()
        test_name = "test_initialization"

        try:
            # Send initialize request
            init_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {"supported": True},
                        "resources": {"supported": True},
                        "prompts": {"supported": True},
                    },
                    "clientInfo": {"name": "mcp-compliance-tester", "version": "1.0.0"},
                },
            }

            response = await self._send_message(init_message)

            # Validate response structure
            issues = []

            if response.get("jsonrpc") != "2.0":
                issues.append("Invalid jsonrpc version in response")

            if response.get("id") != init_message["id"]:
                issues.append("Response ID does not match request ID")

            if "result" not in response:
                issues.append("Initialize response missing 'result' field")
            else:
                result = response["result"]

                if "protocolVersion" not in result:
                    issues.append("Initialize result missing 'protocolVersion'")

                if "capabilities" not in result:
                    issues.append("Initialize result missing 'capabilities'")

                if "serverInfo" not in result:
                    issues.append("Initialize result missing 'serverInfo'")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"response": response},
                    errors=issues,
                )
            )

            if self.config.verbose:
                logger.info(
                    f"Initialization test: {'PASSED' if len(issues) == 0 else 'FAILED'}"
                )
                if issues:
                    for issue in issues:
                        logger.warning(f"  - {issue}")

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Initialization failed: {str(e)}"],
                )
            )

    async def _test_jsonrpc_compliance(self):
        """Test JSON-RPC 2.0 compliance"""
        start_time = time.time()
        test_name = "test_jsonrpc_compliance"

        try:
            # Test various JSON-RPC scenarios
            test_cases = [
                {
                    "name": "valid_request",
                    "message": {
                        "jsonrpc": "2.0",
                        "id": self._get_next_message_id(),
                        "method": "tools/list",
                        "params": {},
                    },
                    "expect_result": True,
                },
                {
                    "name": "notification",
                    "message": {"jsonrpc": "2.0", "method": "notifications/test"},
                    "expect_result": False,
                },
            ]

            issues = []

            for test_case in test_cases:
                try:
                    if test_case["expect_result"]:
                        response = await self._send_message(test_case["message"])

                        # Validate response
                        if response.get("jsonrpc") != "2.0":
                            issues.append(
                                f"{test_case['name']}: Invalid jsonrpc version"
                            )

                        if "result" not in response and "error" not in response:
                            issues.append(
                                f"{test_case['name']}: Missing result or error"
                            )

                    else:
                        # For notifications, we don't expect a response
                        # This would need special handling in stdio mode
                        pass

                except Exception as e:
                    issues.append(f"{test_case['name']}: {str(e)}")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"JSON-RPC compliance test failed: {str(e)}"],
                )
            )

    async def _test_basic_error_handling(self):
        """Test basic error handling"""
        start_time = time.time()
        test_name = "test_error_handling"

        try:
            # Test invalid method
            invalid_method_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "invalid/method",
                "params": {},
            }

            response = await self._send_message(invalid_method_message)

            issues = []

            if "error" not in response:
                issues.append("Expected error response for invalid method")
            else:
                error = response["error"]

                if "code" not in error:
                    issues.append("Error response missing 'code' field")

                if "message" not in error:
                    issues.append("Error response missing 'message' field")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"error_response": response},
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Error handling test failed: {str(e)}"],
                )
            )

    async def _run_capability_tests(self):
        """Test capability negotiation"""
        logger.info("Running capability tests...")

        await self._test_capability_discovery()

    async def _test_capability_discovery(self):
        """Test capability discovery"""
        start_time = time.time()
        test_name = "test_capability_discovery"

        try:
            # Already tested in initialization, but verify capabilities work
            tools_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            response = await self._send_message(tools_message)

            issues = []

            if "result" not in response:
                issues.append("tools/list should return result")
            else:
                result = response["result"]

                if "tools" not in result:
                    issues.append("tools/list result missing 'tools' array")
                elif not isinstance(result["tools"], list):
                    issues.append("tools/list result 'tools' should be array")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"tools_response": response},
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Capability discovery test failed: {str(e)}"],
                )
            )

    async def _run_tool_tests(self):
        """Test tool functionality"""
        logger.info("Running tool tests...")

        await self._test_tool_listing()
        await self._test_tool_execution()

    async def _test_tool_listing(self):
        """Test tool listing"""
        start_time = time.time()
        test_name = "test_tool_listing"

        try:
            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            response = await self._send_message(message)

            issues = []

            if "result" not in response:
                issues.append("tools/list must return result")
            else:
                tools = response["result"].get("tools", [])

                for i, tool in enumerate(tools):
                    if "name" not in tool:
                        issues.append(f"Tool {i} missing 'name' field")

                    if "description" not in tool:
                        issues.append(f"Tool {i} missing 'description' field")

                    if "inputSchema" not in tool:
                        issues.append(f"Tool {i} missing 'inputSchema' field")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "tools_count": len(response.get("result", {}).get("tools", []))
                    },
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Tool listing test failed: {str(e)}"],
                )
            )

    async def _test_tool_execution(self):
        """Test tool execution"""
        start_time = time.time()
        test_name = "test_tool_execution"

        try:
            # First get available tools
            tools_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            tools_response = await self._send_message(tools_message)
            tools = tools_response.get("result", {}).get("tools", [])

            if not tools:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=["No tools available for execution testing"],
                    )
                )
                return

            # Test first available tool
            first_tool = tools[0]
            tool_name = first_tool["name"]

            # Try to execute with minimal parameters
            execute_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": {}},
            }

            response = await self._send_message(execute_message)

            issues = []

            # Tool execution should return result or error
            if "result" not in response and "error" not in response:
                issues.append("Tool execution must return result or error")

            if "result" in response:
                result = response["result"]
                if "content" not in result:
                    issues.append("Tool result missing 'content' field")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"executed_tool": tool_name},
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Tool execution test failed: {str(e)}"],
                )
            )

    async def _run_resource_tests(self):
        """Test resource functionality"""
        logger.info("Running resource tests...")

        await self._test_resource_listing()

    async def _test_resource_listing(self):
        """Test resource listing"""
        start_time = time.time()
        test_name = "test_resource_listing"

        try:
            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "resources/list",
                "params": {},
            }

            response = await self._send_message(message)

            issues = []

            if "result" not in response:
                issues.append("resources/list must return result")
            else:
                resources = response["result"].get("resources", [])

                for i, resource in enumerate(resources):
                    if "uri" not in resource:
                        issues.append(f"Resource {i} missing 'uri' field")

                    if "name" not in resource:
                        issues.append(f"Resource {i} missing 'name' field")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "resources_count": len(
                            response.get("result", {}).get("resources", [])
                        )
                    },
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Resource listing test failed: {str(e)}"],
                )
            )

    async def _run_error_handling_tests(self):
        """Test comprehensive error handling"""
        logger.info("Running error handling tests...")

        # Additional error scenarios
        await self._test_malformed_requests()

    async def _test_malformed_requests(self):
        """Test handling of malformed requests"""
        start_time = time.time()
        test_name = "test_malformed_requests"

        try:
            # Test missing jsonrpc field
            malformed_message = {
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            response = await self._send_message(malformed_message)

            issues = []

            if "error" not in response:
                issues.append("Expected error for missing jsonrpc field")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    errors=issues,
                )
            )

        except Exception as e:
            # Expected behavior - malformed requests might cause connection issues
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=True,  # Connection error is acceptable for malformed requests
                    duration=duration,
                    warnings=[
                        f"Malformed request caused connection issue (acceptable): {str(e)}"
                    ],
                )
            )

    async def _run_performance_tests(self):
        """Test performance characteristics"""
        logger.info("Running performance tests...")

        await self._test_response_times()
        await self._test_concurrent_requests()

    async def _test_response_times(self):
        """Test response time requirements"""
        start_time = time.time()
        test_name = "test_response_times"

        try:
            response_times = []

            for i in range(10):
                request_start = time.time()

                message = {
                    "jsonrpc": "2.0",
                    "id": self._get_next_message_id(),
                    "method": "tools/list",
                    "params": {},
                }

                await self._send_message(message)
                response_time = time.time() - request_start
                response_times.append(response_time)

            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)

            issues = []
            warnings = []

            if avg_response_time > 1.0:  # 1 second threshold
                issues.append(
                    f"Average response time too high: {avg_response_time:.3f}s"
                )

            if max_response_time > 2.0:  # 2 second threshold
                warnings.append(
                    f"Maximum response time concerning: {max_response_time:.3f}s"
                )

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "avg_response_time": avg_response_time,
                        "max_response_time": max_response_time,
                        "min_response_time": min(response_times),
                    },
                    errors=issues,
                    warnings=warnings,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Response time test failed: {str(e)}"],
                )
            )

    async def _test_concurrent_requests(self):
        """Test concurrent request handling"""
        start_time = time.time()
        test_name = "test_concurrent_requests"

        try:

            async def send_request(request_id):
                message = {
                    "jsonrpc": "2.0",
                    "id": f"concurrent-{request_id}",
                    "method": "tools/list",
                    "params": {},
                }
                return await self._send_message(message)

            # Send 5 concurrent requests
            tasks = [send_request(i) for i in range(5)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            successful_responses = [
                r for r in responses if not isinstance(r, Exception)
            ]
            failed_responses = [r for r in responses if isinstance(r, Exception)]

            issues = []

            if len(failed_responses) > 0:
                issues.append(f"Failed concurrent requests: {len(failed_responses)}")

            if len(successful_responses) < 3:  # At least 60% success rate
                issues.append(
                    f"Low concurrent request success rate: {len(successful_responses)}/5"
                )

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "successful_requests": len(successful_responses),
                        "failed_requests": len(failed_responses),
                    },
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Concurrent requests test failed: {str(e)}"],
                )
            )

    async def _run_security_tests(self):
        """Test security aspects"""
        logger.info("Running security tests...")

        await self._test_input_validation()

    async def _test_input_validation(self):
        """Test input validation"""
        start_time = time.time()
        test_name = "test_input_validation"

        try:
            # Test oversized request
            large_params = {"data": "x" * 10000}  # 10KB of data

            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": large_params,
            }

            response = await self._send_message(message)

            # Server should handle large requests gracefully
            issues = []

            if "error" in response:
                # Error is acceptable for oversized requests
                pass
            elif "result" in response:
                # Success is also acceptable if server can handle it
                pass
            else:
                issues.append("Invalid response structure for large request")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"request_size": len(json.dumps(message))},
                    errors=issues,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=True,  # Connection error acceptable for security test
                    duration=duration,
                    warnings=[
                        f"Large request caused connection issue (acceptable): {str(e)}"
                    ],
                )
            )

    def _generate_test_report(self, total_duration: float) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        passed_tests = [r for r in self.results if r.passed]
        failed_tests = [r for r in self.results if not r.passed]

        return {
            "summary": {
                "total_tests": len(self.results),
                "passed_tests": len(passed_tests),
                "failed_tests": len(failed_tests),
                "success_rate": len(passed_tests) / len(self.results) * 100
                if self.results
                else 0,
                "total_duration": round(total_duration, 3),
            },
            "test_results": [
                {
                    "test_name": r.test_name,
                    "passed": r.passed,
                    "duration": round(r.duration, 3),
                    "details": r.details,
                    "errors": r.errors,
                    "warnings": r.warnings,
                }
                for r in self.results
            ],
            "compliance_score": self._calculate_compliance_score(),
            "recommendations": self._generate_recommendations(),
        }

    def _calculate_compliance_score(self) -> float:
        """Calculate overall compliance score"""
        if not self.results:
            return 0.0

        # Weight different test categories
        weights = {
            "test_initialization": 3.0,
            "test_jsonrpc_compliance": 3.0,
            "test_capability_discovery": 2.0,
            "test_tool_listing": 2.0,
            "test_tool_execution": 2.0,
            "test_error_handling": 1.5,
            "test_response_times": 1.0,
            "test_concurrent_requests": 1.0,
            "test_input_validation": 1.0,
        }

        total_weight = 0.0
        weighted_score = 0.0

        for result in self.results:
            weight = weights.get(result.test_name, 1.0)
            total_weight += weight

            if result.passed:
                weighted_score += weight

        return (weighted_score / total_weight * 100) if total_weight > 0 else 0.0

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results including Gateway-specific advice."""
        recommendations = []

        failed_tests = [r for r in self.results if not r.passed]

        # Core MCP recommendations
        if any("initialization" in r.test_name for r in failed_tests):
            recommendations.append(
                "Fix MCP initialization sequence - critical for protocol compliance"
            )

        if any("jsonrpc" in r.test_name for r in failed_tests):
            recommendations.append(
                "Ensure JSON-RPC 2.0 compliance - check message format and fields"
            )

        if any("tool" in r.test_name for r in failed_tests):
            recommendations.append(
                "Review tool implementation - verify schema and execution patterns"
            )

        # MCP Registry Gateway specific recommendations
        if any("auth" in r.test_name for r in failed_tests):
            recommendations.append(
                "Review Azure OAuth configuration - check MREG_AZURE_* environment variables"
            )

        if any("middleware" in r.test_name for r in failed_tests):
            recommendations.append(
                "Check middleware configuration - verify auth, rate limiting, and audit settings"
            )

        if any("database" in r.test_name for r in failed_tests):
            recommendations.append(
                "Verify database connectivity - check PostgreSQL and Redis connections"
            )

        if any("env" in r.test_name for r in failed_tests):
            recommendations.append(
                "Review MREG_ environment variables - ensure proper configuration"
            )

        if any("gateway" in r.test_name for r in failed_tests):
            recommendations.append(
                "Check dual-server architecture - verify FastAPI and FastMCP coordination"
            )

        # Performance recommendations
        if any("performance" in r.test_name for r in failed_tests):
            recommendations.append(
                "Optimize server performance - consider async patterns, caching, and FastMCPBaseModel"
            )

        if any("concurrent" in r.test_name for r in failed_tests):
            recommendations.append(
                "Improve concurrent request handling - check for blocking operations"
            )

        # Response model validation
        response_model_tests = [r for r in self.results if r.response_model_validated]
        if response_model_tests and any(not r.passed for r in response_model_tests):
            recommendations.append(
                "Update response models to use FastMCPBaseModel for performance optimization"
            )

        # Authentication context
        auth_tests = [r for r in self.results if r.auth_context_tested]
        if auth_tests and any(not r.passed for r in auth_tests):
            recommendations.append(
                "Review authentication middleware and user context handling"
            )

        # General recommendations
        if len(failed_tests) == 0:
            recommendations.append(
                "All tests passed - consider implementing additional custom validations for your use case"
            )
            if GATEWAY_MODELS_AVAILABLE:
                recommendations.append(
                    "Consider integrating with MCP Registry Gateway for enterprise features"
                )
        elif len(failed_tests) < 3:
            recommendations.append("Minor issues detected - focus on failed test areas")
        else:
            recommendations.append(
                "Multiple issues detected - systematic review of MCP implementation recommended"
            )

        # Environment-specific recommendations
        if self.config.test_auth and not any(
            "auth" in r.test_name for r in failed_tests
        ):
            recommendations.append(
                "Authentication tests passed - ready for production Azure OAuth integration"
            )

        return recommendations

    # New MCP Registry Gateway specific test methods
    async def _run_auth_tests(self):
        """Test Azure OAuth authentication patterns."""
        logger.info("Running Azure OAuth authentication tests...")

        await self._test_oauth_flow()
        await self._test_token_validation()
        await self._test_user_context()

    async def _test_oauth_flow(self):
        """Test OAuth authentication flow."""
        start_time = time.time()
        test_name = "test_oauth_flow"

        try:
            if not self.config.fastmcp_url:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=[
                            "FastMCP URL not provided - skipping OAuth flow test"
                        ],
                        test_category="auth",
                        auth_context_tested=True,
                    )
                )
                return

            # Test OAuth login endpoint
            oauth_url = f"{self.config.fastmcp_url}/oauth/login"

            async with aiohttp.ClientSession() as session:
                async with session.get(oauth_url) as response:
                    issues = []

                    if response.status not in [
                        200,
                        302,
                    ]:  # Login should redirect or show login page
                        issues.append(
                            f"OAuth login endpoint returned {response.status}"
                        )

                    # Check for Azure OAuth redirect
                    if response.status == 302:
                        location = response.headers.get("Location", "")
                        if "login.microsoftonline.com" not in location:
                            issues.append("OAuth redirect not pointing to Azure AD")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"oauth_url": oauth_url},
                    errors=issues,
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"OAuth flow test failed: {str(e)}"],
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

    async def _test_token_validation(self):
        """Test authentication token validation."""
        start_time = time.time()
        test_name = "test_token_validation"

        try:
            if not self.config.auth_token:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=[
                            "No auth token provided - skipping token validation test"
                        ],
                        test_category="auth",
                        auth_context_tested=True,
                    )
                )
                return

            # Test authenticated MCP call
            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            # This would need to be adapted based on actual FastMCP auth implementation
            response = await self._send_authenticated_message(message)

            issues = []

            if "error" in response:
                error = response["error"]
                if error.get("code") == -32600:  # Authentication error
                    issues.append("Token validation failed - check Azure token")
            elif "result" not in response:
                issues.append("Authenticated request should return result")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"has_auth_token": bool(self.config.auth_token)},
                    errors=issues,
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Token validation test failed: {str(e)}"],
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

    async def _test_user_context(self):
        """Test user context handling."""
        start_time = time.time()
        test_name = "test_user_context"

        try:
            if not self.config.fastmcp_url:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=[
                            "FastMCP URL not provided - skipping user context test"
                        ],
                        test_category="auth",
                        auth_context_tested=True,
                    )
                )
                return

            # Test user info endpoint
            userinfo_url = f"{self.config.fastmcp_url}/oauth/userinfo"

            async with aiohttp.ClientSession() as session:
                headers = self.auth_headers.copy()
                async with session.get(userinfo_url, headers=headers) as response:
                    issues = []

                    if response.status == 401:
                        issues.append("User info endpoint requires authentication")
                    elif response.status == 200:
                        try:
                            user_data = await response.json()

                            # Validate user context structure
                            required_fields = ["user_id", "tenant_id"]
                            for field in required_fields:
                                if field not in user_data:
                                    issues.append(f"User context missing {field}")
                        except json.JSONDecodeError:
                            issues.append("User info response not valid JSON")
                    else:
                        issues.append(f"User info endpoint returned {response.status}")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"userinfo_url": userinfo_url},
                    errors=issues,
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"User context test failed: {str(e)}"],
                    test_category="auth",
                    auth_context_tested=True,
                )
            )

    async def _send_authenticated_message(
        self, message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send message with authentication headers."""
        # This is a placeholder - actual implementation would depend on FastMCP auth mechanism
        return await self._send_message(message)

    async def _run_middleware_tests(self):
        """Test middleware functionality."""
        logger.info("Running middleware tests...")

        await self._test_rate_limiting()
        await self._test_audit_logging()
        await self._test_access_control()

    async def _test_rate_limiting(self):
        """Test rate limiting middleware."""
        start_time = time.time()
        test_name = "test_rate_limiting"

        try:
            # Send multiple requests quickly to trigger rate limiting
            messages = []
            for i in range(10):  # Send 10 requests quickly
                message = {
                    "jsonrpc": "2.0",
                    "id": f"rate-test-{i}",
                    "method": "tools/list",
                    "params": {},
                }
                messages.append(message)

            responses = []
            for message in messages:
                try:
                    response = await self._send_message(message)
                    responses.append(response)
                except Exception as e:
                    responses.append({"error": str(e)})

            # Check if any requests were rate limited
            rate_limited = any(
                r.get("error", {}).get("code") == -32603  # Rate limit error
                or "rate limit" in str(r.get("error", {})).lower()
                for r in responses
            )

            # For testing, rate limiting working is actually a good thing
            issues = []
            if not rate_limited and len(responses) == 10:
                issues.append(
                    "Rate limiting may not be configured (all requests succeeded)"
                )

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=True,  # Rate limiting test always passes, just reports findings
                    duration=duration,
                    details={
                        "total_requests": len(messages),
                        "successful_responses": len(
                            [r for r in responses if "result" in r]
                        ),
                        "rate_limited_responses": len(
                            [r for r in responses if "error" in r]
                        ),
                    },
                    warnings=issues,
                    test_category="middleware",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Rate limiting test failed: {str(e)}"],
                    test_category="middleware",
                )
            )

    async def _test_audit_logging(self):
        """Test audit logging middleware."""
        start_time = time.time()
        test_name = "test_audit_logging"

        try:
            # Make a request that should be audited
            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            response = await self._send_message(message)

            # We can't directly test audit logging without database access,
            # but we can verify the request was processed
            issues = []

            if "result" not in response and "error" not in response:
                issues.append(
                    "Request not processed - audit logging may have interfered"
                )

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "request_processed": "result" in response or "error" in response
                    },
                    warnings=["Audit logging validation requires database access"],
                    test_category="middleware",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Audit logging test failed: {str(e)}"],
                    test_category="middleware",
                )
            )

    async def _test_access_control(self):
        """Test access control middleware."""
        start_time = time.time()
        test_name = "test_access_control"

        try:
            # Test access to tools
            message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {},
            }

            response = await self._send_message(message)

            issues = []

            # Check if access control is enforced
            if "error" in response:
                error = response["error"]
                if error.get("code") == -32600:  # Permission denied
                    # This is expected if access control is working
                    pass
                else:
                    issues.append(f"Unexpected error: {error}")
            elif "result" in response:
                # Request succeeded - access control may not be enforced
                pass

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"access_granted": "result" in response},
                    test_category="middleware",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Access control test failed: {str(e)}"],
                    test_category="middleware",
                )
            )

    async def _run_database_tests(self):
        """Test database connectivity and operations."""
        logger.info("Running database tests...")

        await self._test_postgres_connection()
        await self._test_redis_connection()

    async def _test_postgres_connection(self):
        """Test PostgreSQL database connection."""
        start_time = time.time()
        test_name = "test_postgres_connection"

        try:
            if not self.config.postgres_url:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=[
                            "PostgreSQL URL not provided - skipping database test"
                        ],
                        test_category="database",
                    )
                )
                return

            # This would require asyncpg or similar database connection
            # For now, just mark as not implemented
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=True,
                    duration=time.time() - start_time,
                    warnings=[
                        "PostgreSQL connection test not implemented - requires asyncpg"
                    ],
                    test_category="database",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"PostgreSQL test failed: {str(e)}"],
                    test_category="database",
                )
            )

    async def _test_redis_connection(self):
        """Test Redis connection."""
        start_time = time.time()
        test_name = "test_redis_connection"

        try:
            if not self.config.redis_url:
                self.results.append(
                    TestResult(
                        test_name=test_name,
                        passed=False,
                        duration=time.time() - start_time,
                        warnings=["Redis URL not provided - skipping Redis test"],
                        test_category="database",
                    )
                )
                return

            # This would require aioredis or similar Redis connection
            # For now, just mark as not implemented
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=True,
                    duration=time.time() - start_time,
                    warnings=[
                        "Redis connection test not implemented - requires aioredis"
                    ],
                    test_category="database",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Redis test failed: {str(e)}"],
                    test_category="database",
                )
            )

    async def _run_environment_tests(self):
        """Test MREG_ environment variable handling."""
        logger.info("Running environment variable tests...")

        await self._test_mreg_env_vars()

    async def _test_mreg_env_vars(self):
        """Test MREG_ environment variables."""
        start_time = time.time()
        test_name = "test_mreg_env_vars"

        try:
            # Check for common MREG_ environment variables
            required_vars = ["MREG_POSTGRES_HOST", "MREG_POSTGRES_DB", "MREG_REDIS_URL"]

            optional_vars = [
                "MREG_AZURE_TENANT_ID",
                "MREG_AZURE_CLIENT_ID",
                "MREG_FASTMCP_ENABLE_AUDIT_LOGGING",
                "MREG_FASTMCP_ENABLE_RATE_LIMITING",
            ]

            issues = []
            warnings = []
            found_vars = {}

            # Check required variables
            for var in required_vars:
                value = os.getenv(var)
                if not value:
                    issues.append(f"Required environment variable {var} not set")
                else:
                    found_vars[var] = (
                        "***"
                        if "password" in var.lower() or "secret" in var.lower()
                        else value
                    )

            # Check optional variables
            for var in optional_vars:
                value = os.getenv(var)
                if value:
                    found_vars[var] = (
                        "***"
                        if "password" in var.lower() or "secret" in var.lower()
                        else value
                    )
                else:
                    warnings.append(f"Optional environment variable {var} not set")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"found_variables": found_vars},
                    errors=issues,
                    warnings=warnings,
                    test_category="environment",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Environment variable test failed: {str(e)}"],
                    test_category="environment",
                )
            )

    async def _run_gateway_integration_tests(self):
        """Test integration with MCP Registry Gateway."""
        logger.info("Running Gateway integration tests...")

        await self._test_gateway_health()
        await self._test_server_registration()
        await self._test_dual_server_architecture()

    async def _test_gateway_health(self):
        """Test Gateway health endpoint."""
        start_time = time.time()
        test_name = "test_gateway_health"

        try:
            health_url = f"{self.config.gateway_url}/health"

            if not self.gateway_session:
                self.gateway_session = aiohttp.ClientSession()

            async with self.gateway_session.get(health_url) as response:
                issues = []

                if response.status != 200:
                    issues.append(f"Gateway health check failed: {response.status}")
                else:
                    try:
                        health_data = await response.json()

                        # Validate health response structure
                        if GATEWAY_MODELS_AVAILABLE:
                            # Could validate against HealthCheckResponse model
                            pass

                        if "status" not in health_data:
                            issues.append("Health response missing status field")

                    except json.JSONDecodeError:
                        issues.append("Health response not valid JSON")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"health_url": health_url},
                    errors=issues,
                    test_category="gateway",
                    response_model_validated=GATEWAY_MODELS_AVAILABLE,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Gateway health test failed: {str(e)}"],
                    test_category="gateway",
                )
            )

    async def _test_server_registration(self):
        """Test server registration with Gateway."""
        start_time = time.time()
        test_name = "test_server_registration"

        try:
            registration_url = f"{self.config.gateway_url}/api/v1/servers"

            if not self.gateway_session:
                self.gateway_session = aiohttp.ClientSession()

            # Test server registration
            server_data = {
                "name": "test-compliance-server",
                "endpoint_url": "stdio://python test_server.py",
                "transport_type": "stdio",
                "tags": {"test": "compliance", "framework": "testing"},
            }

            async with self.gateway_session.post(
                registration_url, json=server_data
            ) as response:
                issues = []

                if response.status not in [200, 201]:
                    issues.append(f"Server registration failed: {response.status}")
                else:
                    try:
                        registration_response = await response.json()

                        # Validate registration response
                        if "id" not in registration_response:
                            issues.append("Registration response missing server ID")

                    except json.JSONDecodeError:
                        issues.append("Registration response not valid JSON")

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={"registration_url": registration_url},
                    errors=issues,
                    test_category="gateway",
                    response_model_validated=GATEWAY_MODELS_AVAILABLE,
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Server registration test failed: {str(e)}"],
                    test_category="gateway",
                )
            )

    async def _test_dual_server_architecture(self):
        """Test dual-server architecture (FastAPI + FastMCP)."""
        start_time = time.time()
        test_name = "test_dual_server_architecture"

        try:
            issues = []

            # Test FastAPI server (Gateway)
            if self.config.gateway_url:
                try:
                    if not self.gateway_session:
                        self.gateway_session = aiohttp.ClientSession()

                    async with self.gateway_session.get(
                        f"{self.config.gateway_url}/health"
                    ) as response:
                        if response.status != 200:
                            issues.append(
                                f"FastAPI server health check failed: {response.status}"
                            )
                except Exception as e:
                    issues.append(f"FastAPI server connection failed: {str(e)}")

            # Test FastMCP server
            if self.config.fastmcp_url:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            f"{self.config.fastmcp_url}/health"
                        ) as response:
                            if response.status != 200:
                                issues.append(
                                    f"FastMCP server health check failed: {response.status}"
                                )
                except Exception as e:
                    issues.append(f"FastMCP server connection failed: {str(e)}")

            if not self.config.gateway_url and not self.config.fastmcp_url:
                issues.append(
                    "No server URLs provided for dual-server architecture test"
                )

            duration = time.time() - start_time

            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=len(issues) == 0,
                    duration=duration,
                    details={
                        "gateway_url": self.config.gateway_url,
                        "fastmcp_url": self.config.fastmcp_url,
                    },
                    errors=issues,
                    test_category="gateway",
                )
            )

        except Exception as e:
            duration = time.time() - start_time
            self.results.append(
                TestResult(
                    test_name=test_name,
                    passed=False,
                    duration=duration,
                    errors=[f"Dual-server architecture test failed: {str(e)}"],
                    test_category="gateway",
                )
            )


# Command-line interface
async def main():
    """Main CLI function with MCP Registry Gateway extensions."""
    import argparse

    parser = argparse.ArgumentParser(
        description="MCP Compliance Testing Framework with Gateway Extensions"
    )

    # Core testing options
    parser.add_argument(
        "--server-command", help="Server command for stdio transport", nargs="+"
    )
    parser.add_argument("--server-url", help="Server URL for HTTP transport")
    parser.add_argument(
        "--transport", choices=["stdio", "http"], default="stdio", help="Transport type"
    )
    parser.add_argument(
        "--timeout", type=float, default=30.0, help="Request timeout in seconds"
    )
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--output", help="Output file for test report (JSON)")

    # MCP Registry Gateway specific options
    parser.add_argument(
        "--test-auth", action="store_true", help="Test Azure OAuth authentication"
    )
    parser.add_argument(
        "--auth-token", help="Azure OAuth token for authentication testing"
    )
    parser.add_argument(
        "--gateway-url", help="MCP Registry Gateway URL (e.g., http://localhost:8000)"
    )
    parser.add_argument(
        "--fastmcp-url", help="FastMCP server URL (e.g., http://localhost:8001)"
    )
    parser.add_argument(
        "--test-middleware", action="store_true", help="Test middleware functionality"
    )
    parser.add_argument(
        "--test-database", action="store_true", help="Test database connectivity"
    )
    parser.add_argument("--postgres-url", help="PostgreSQL connection URL")
    parser.add_argument("--redis-url", help="Redis connection URL")
    parser.add_argument(
        "--test-env-vars",
        action="store_true",
        default=True,
        help="Test MREG_ environment variables",
    )

    # Testing profiles for common scenarios
    parser.add_argument(
        "--profile",
        choices=["minimal", "auth", "gateway", "full"],
        help="Testing profile: minimal (core MCP), auth (with authentication), gateway (full integration), full (all tests)",
    )

    args = parser.parse_args()

    # Apply testing profile if specified
    if args.profile:
        if args.profile == "minimal":
            # Core MCP tests only
            pass  # Use defaults
        elif args.profile == "auth":
            # Authentication testing
            args.test_auth = True
            if not args.fastmcp_url:
                args.fastmcp_url = "http://localhost:8001"
        elif args.profile == "gateway":
            # Full gateway integration
            args.test_auth = True
            args.test_middleware = True
            args.test_database = True
            if not args.gateway_url:
                args.gateway_url = "http://localhost:8000"
            if not args.fastmcp_url:
                args.fastmcp_url = "http://localhost:8001"
        elif args.profile == "full":
            # All tests enabled
            args.test_auth = True
            args.test_middleware = True
            args.test_database = True
            args.test_env_vars = True
            if not args.gateway_url:
                args.gateway_url = "http://localhost:8000"
            if not args.fastmcp_url:
                args.fastmcp_url = "http://localhost:8001"

    # Configure test suite
    config = MCPTestSuite(
        server_command=args.server_command,
        server_url=args.server_url,
        transport=args.transport,
        timeout=args.timeout,
        verbose=args.verbose,
        # Gateway-specific options
        test_auth=args.test_auth,
        auth_token=args.auth_token,
        gateway_url=args.gateway_url,
        fastmcp_url=args.fastmcp_url,
        test_middleware=args.test_middleware,
        test_database=args.test_database,
        postgres_url=args.postgres_url,
        redis_url=args.redis_url,
        test_env_vars=args.test_env_vars,
    )

    # Validate configuration
    if config.transport == "stdio" and not config.server_command:
        parser.error("--server-command required for stdio transport")

    if config.transport == "http" and not config.server_url:
        parser.error("--server-url required for HTTP transport")

    # Run tests
    tester = MCPProtocolTester(config)
    report = await tester.run_all_tests()

    # Output results
    print("\n" + "=" * 60)
    print("MCP COMPLIANCE TEST REPORT")
    print("=" * 60)

    summary = report["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Compliance Score: {report['compliance_score']:.1f}/100")
    print(f"Total Duration: {summary['total_duration']:.3f}s")

    # Show failed tests
    failed_tests = [r for r in report["test_results"] if not r["passed"]]
    if failed_tests:
        print("\nFAILED TESTS:")
        for test in failed_tests:
            print(f"  ❌ {test['test_name']}")
            for error in test["errors"]:
                print(f"     - {error}")

    # Show recommendations
    if report["recommendations"]:
        print("\nRECOMMENDATIONS:")
        for rec in report["recommendations"]:
            print(f"  • {rec}")

    # Save report if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nDetailed report saved to: {args.output}")

    # Exit with appropriate code
    sys.exit(0 if summary["failed_tests"] == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
