#!/usr/bin/env python3
"""
MCP Registry Gateway Demonstration.

This script demonstrates the complete MCP Registry Gateway functionality:
1. Server registration
2. Service discovery
3. Request proxying
4. Load balancing and health monitoring

Run this after starting the gateway service to see it in action.
"""

import asyncio
import logging
import os
import uuid
from typing import Any

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

console = Console()

# Read from environment variable set by CLI, fallback to port 8000 (matches README)
GATEWAY_BASE_URL = os.environ.get("GATEWAY_BASE_URL", "http://localhost:8000")


class GatewayDemo:
    """Demonstration of MCP Registry Gateway functionality."""

    def __init__(self, base_url: str = GATEWAY_BASE_URL) -> None:
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self.registered_servers: list[dict[str, Any]] = []

    async def __aenter__(self) -> "GatewayDemo":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.client.aclose()

    async def check_gateway_health(self) -> bool:
        """Check if the gateway is running and healthy."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            response.raise_for_status()
            health_data = response.json()

            console.print(
                Panel.fit(
                    f"[green]Gateway Status: {health_data['status'].upper()}[/green]",
                    title="🏥 Health Check",
                )
            )

            # Show component status
            components = health_data.get("components", {})
            if components:
                table = Table(title="Component Status")
                table.add_column("Component", style="cyan")
                table.add_column("Status", style="magenta")

                for component, info in components.items():
                    status = info.get("status", "unknown")
                    color = "green" if status == "healthy" else "red"
                    table.add_row(component, f"[{color}]{status}[/{color}]")

                console.print(table)

            return bool(health_data["status"] == "healthy")

        except httpx.HTTPStatusError as e:
            console.print(
                f"[red]❌ Gateway health check failed: HTTP {e.response.status_code}[/red]"
            )
            return False
        except httpx.ConnectError:
            console.print(f"[red]❌ Cannot connect to gateway at {self.base_url}[/red]")
            return False
        except Exception as e:
            console.print(f"[red]❌ Gateway health check failed: {e}[/red]")
            return False

    async def register_demo_servers(self) -> None:
        """Register some demo MCP servers for testing."""
        console.print(
            Panel.fit("Registering Demo MCP Servers", title="📝 Registration")
        )

        # First, cleanup any existing demo servers to avoid conflicts
        await self.cleanup_demo_servers()

        demo_servers = [
            {
                "name": "file-tools-server",
                "endpoint_url": "http://localhost:3001",
                "transport_type": "http",
                "version": "1.0.0",
                "description": "File system operations and text processing",
                "capabilities": {
                    "tools": ["read_file", "write_file", "list_files", "search_files"],
                    "resources": ["file://"],
                },
                "tags": ["filesystem", "tools", "productivity"],
            },
            {
                "name": "database-server",
                "endpoint_url": "http://localhost:3002",
                "transport_type": "http",
                "version": "2.1.0",
                "description": "Database query and management tools",
                "capabilities": {
                    "tools": ["execute_query", "describe_table", "create_index"],
                    "resources": ["db://", "table://"],
                },
                "tags": ["database", "sql", "analytics"],
            },
            {
                "name": "api-client-server",
                "endpoint_url": "ws://localhost:3003",
                "transport_type": "websocket",
                "version": "1.5.2",
                "description": "HTTP API client and web scraping tools",
                "capabilities": {
                    "tools": ["http_request", "parse_html", "extract_data"],
                    "resources": ["https://", "http://"],
                },
                "tags": ["api", "web", "scraping"],
            },
        ]

        for server_config in demo_servers:
            try:
                response = await self.client.post(
                    f"{self.base_url}/api/v1/servers", json=server_config
                )
                response.raise_for_status()

                server_data = response.json()
                self.registered_servers.append(server_data)
                console.print(f"[green]✅ Registered: {server_config['name']}[/green]")

            except httpx.HTTPStatusError as e:
                error_detail = "Unknown error"
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", str(error_data))
                except Exception:
                    error_detail = e.response.text
                console.print(
                    f"[red]❌ Failed to register {server_config['name']}: {error_detail}[/red]"
                )
            except Exception as e:
                console.print(
                    f"[red]❌ Error registering {server_config['name']}: {e}[/red]"
                )

    async def demonstrate_discovery(self) -> None:
        """Demonstrate server discovery capabilities."""
        console.print(
            Panel.fit("Demonstrating Service Discovery", title="🔍 Discovery")
        )

        # List all servers
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/servers")
            response.raise_for_status()
            servers = response.json()

            if servers:
                table = Table(title="Registered Servers")
                table.add_column("Name", style="cyan")
                table.add_column("Type", style="magenta")
                table.add_column("Health", style="green")
                table.add_column("Tags", style="yellow")

                for server in servers:
                    health_status = server.get("health_status", "unknown")
                    health_color = "green" if health_status == "healthy" else "red"
                    tags = server.get("tags", [])
                    tag_str = ", ".join(tags) if tags else "none"

                    table.add_row(
                        server["name"],
                        server["transport_type"],
                        f"[{health_color}]{health_status}[/{health_color}]",
                        tag_str,
                    )

                console.print(table)
            else:
                console.print("[yellow]No servers registered yet[/yellow]")

            # Tool-based discovery
            console.print("\n[cyan]🔧 Tool-based Discovery:[/cyan]")
            try:
                response = await self.client.get(
                    f"{self.base_url}/api/v1/discovery/tools?tools=read_file,write_file"
                )
                response.raise_for_status()
                discovery_data = response.json()

                console.print(
                    f"Servers with file tools: {len(discovery_data.get('servers', []))}"
                )
                for server in discovery_data.get("servers", []):
                    tools = server.get("tools", [])
                    tool_names = [t.get("name", "unknown") for t in tools]
                    console.print(f"  • {server['name']}: {tool_names}")
            except httpx.HTTPStatusError as e:
                console.print(
                    f"[yellow]⚠️ Tool discovery unavailable: HTTP {e.response.status_code}[/yellow]"
                )

        except httpx.HTTPStatusError as e:
            console.print(
                f"[red]❌ Discovery failed: HTTP {e.response.status_code}[/red]"
            )
        except Exception as e:
            console.print(f"[red]❌ Discovery failed: {e}[/red]")

    async def demonstrate_proxying(self) -> None:
        """Demonstrate MCP request proxying."""
        console.print(Panel.fit("Demonstrating MCP Request Proxying", title="🚀 Proxy"))

        # Example MCP requests - use unique IDs to avoid database conflicts
        demo_requests = [
            {
                "name": "List Tools",
                "request": {
                    "jsonrpc": "2.0",
                    "id": f"demo-{uuid.uuid4().hex[:8]}",
                    "method": "tools/list",
                    "params": {},
                },
            },
            {
                "name": "Get Resources",
                "request": {
                    "jsonrpc": "2.0",
                    "id": f"demo-{uuid.uuid4().hex[:8]}",
                    "method": "resources/list",
                    "params": {},
                },
            },
            {
                "name": "File Read (with routing)",
                "request": {
                    "jsonrpc": "2.0",
                    "id": f"demo-{uuid.uuid4().hex[:8]}",
                    "method": "tools/call",
                    "params": {
                        "name": "read_file",
                        "arguments": {"path": "/etc/hosts"},
                    },
                    "required_tools": ["read_file"],
                    "timeout": 15.0,
                },
            },
        ]

        for demo in demo_requests:
            console.print(f"\n[cyan]📨 {demo['name']}:[/cyan]")

            try:
                # Try the advanced proxy endpoint first
                if "required_tools" in demo["request"]:
                    response = await self.client.post(
                        f"{self.base_url}/mcp/proxy", json=demo["request"]
                    )
                else:
                    # Use simple proxy endpoint
                    response = await self.client.post(
                        f"{self.base_url}/mcp", json=demo["request"]
                    )

                response.raise_for_status()
                result = response.json()

                # Show routing info for advanced proxy
                if "server_id" in result:
                    console.print(
                        f"  Routed to server: {result.get('server_id', 'unknown')}"
                    )
                    console.print(
                        f"  Response time: {result.get('response_time_ms', 0):.2f}ms"
                    )
                    console.print(f"  Success: {result.get('success', False)}")

                # Show response preview
                if "result" in result:
                    result_preview = str(result["result"])[:100]
                    if len(str(result["result"])) > 100:
                        result_preview += "..."
                    console.print(f"  Result: {result_preview}")
                elif "error" in result:
                    console.print(f"  [red]Error: {result['error']}[/red]")
                else:
                    console.print(f"  Response: {result}")

            except httpx.HTTPStatusError as e:
                error_detail = "Unknown error"
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", str(error_data))
                except Exception:
                    error_detail = e.response.text[:200]
                console.print(
                    f"  [red]HTTP {e.response.status_code}: {error_detail}[/red]"
                )
            except Exception as e:
                console.print(f"  [red]❌ Request failed: {e}[/red]")

    async def demonstrate_monitoring(self) -> None:
        """Demonstrate monitoring and metrics."""
        console.print(Panel.fit("System Monitoring & Metrics", title="📊 Monitoring"))

        try:
            # System stats
            response = await self.client.get(f"{self.base_url}/api/v1/admin/stats")
            response.raise_for_status()
            stats = response.json()

            console.print("[cyan]📈 System Statistics:[/cyan]")
            console.print(f"  Total servers: {stats.get('total_servers', 0)}")
            console.print(f"  By status: {stats.get('servers_by_status', {})}")
            console.print(f"  By transport: {stats.get('servers_by_transport', {})}")

            # Router metrics
            try:
                response = await self.client.get(
                    f"{self.base_url}/api/v1/router/metrics"
                )
                response.raise_for_status()
                metrics = response.json()

                console.print("\n[cyan]⚖️ Load Balancer Metrics:[/cyan]")
                metrics_data = metrics.get("metrics", {})
                if metrics_data:
                    for server_metrics in metrics_data.values():
                        console.print(
                            f"  {server_metrics.get('server_name', 'unknown')}:"
                        )
                        console.print(
                            f"    Active connections: {server_metrics.get('active_connections', 0)}"
                        )
                        console.print(
                            f"    Total requests: {server_metrics.get('total_requests', 0)}"
                        )
                        console.print(
                            f"    Success rate: {server_metrics.get('success_rate', 0):.2%}"
                        )
                        console.print(
                            f"    Avg response time: {server_metrics.get('avg_response_time_ms', 0):.2f}ms"
                        )
                else:
                    console.print("  No metrics data available")
            except httpx.HTTPStatusError as e:
                console.print(
                    f"[yellow]⚠️ Router metrics unavailable: HTTP {e.response.status_code}[/yellow]"
                )

            # Active requests
            try:
                response = await self.client.get(
                    f"{self.base_url}/api/v1/proxy/active-requests"
                )
                response.raise_for_status()
                active = response.json()

                console.print("\n[cyan]🔄 Active Requests:[/cyan]")
                console.print(
                    f"  Currently processing: {active.get('active_request_count', 0)}"
                )
            except httpx.HTTPStatusError as e:
                console.print(
                    f"[yellow]⚠️ Active requests info unavailable: HTTP {e.response.status_code}[/yellow]"
                )

        except httpx.HTTPStatusError as e:
            console.print(
                f"[red]❌ Monitoring failed: HTTP {e.response.status_code}[/red]"
            )
        except Exception as e:
            console.print(f"[red]❌ Monitoring failed: {e}[/red]")

    async def cleanup_demo_servers(self) -> None:
        """Clean up registered demo servers."""
        console.print(Panel.fit("Cleaning Up Demo Servers", title="🧹 Cleanup"))

        for server in self.registered_servers:
            try:
                response = await self.client.delete(
                    f"{self.base_url}/api/v1/servers/{server['id']}"
                )
                response.raise_for_status()
                console.print(f"[green]✅ Unregistered: {server['name']}[/green]")

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    console.print(
                        f"[yellow]⚠️ Server {server['name']} not found (already deleted)[/yellow]"
                    )
                else:
                    console.print(
                        f"[red]❌ Failed to unregister {server['name']}: HTTP {e.response.status_code}[/red]"
                    )
            except Exception as e:
                console.print(
                    f"[red]❌ Error unregistering {server['name']}: {e}[/red]"
                )


async def main() -> None:
    """Run the complete gateway demonstration."""
    console.print(
        Panel.fit(
            "[bold cyan]MCP Registry Gateway Demonstration[/bold cyan]\n"
            + "This demo shows the complete gateway functionality including:\n"
            + "• Server registration and discovery\n"
            + "• Intelligent request routing\n"
            + "• Load balancing and health monitoring\n"
            + "• Real-time metrics and observability",
            title="🌟 Welcome",
        )
    )

    async with GatewayDemo() as demo:
        # Check gateway health
        if not await demo.check_gateway_health():
            console.print(
                "[red]❌ Gateway is not healthy. Please start the gateway first:[/red]"
            )
            console.print("[yellow]uv run mcp-gateway serve --port 8000[/yellow]")
            return

        try:
            # Run demonstration
            await demo.register_demo_servers()
            await asyncio.sleep(2)  # Give servers time to be processed

            await demo.demonstrate_discovery()
            await asyncio.sleep(1)

            await demo.demonstrate_proxying()
            await asyncio.sleep(1)

            await demo.demonstrate_monitoring()

            # Wait for user input
            console.print("\n[cyan]Press Enter to cleanup and exit...[/cyan]")
            input()

        finally:
            # Cleanup
            await demo.cleanup_demo_servers()

    console.print(
        Panel.fit(
            "[bold green]Demo Complete![/bold green]\n"
            + "The MCP Registry Gateway is now ready for production use.",
            title="🎉 Success",
        )
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Demo interrupted by user[/yellow]")
    except Exception as e:
        console.print(f"[red]❌ Demo failed: {e}[/red]")
