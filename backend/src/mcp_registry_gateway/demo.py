"""
Standalone entry point for the MCP Registry Gateway demo.

This module provides a simple command-line interface for running the gateway demo.
"""

import subprocess
import sys
from pathlib import Path

from rich.console import Console


console = Console()


def main() -> None:
    """Run the MCP Registry Gateway demonstration."""
    try:
        # Find the demo script - try multiple possible locations
        current_dir = Path.cwd()
        possible_locations = [
            current_dir / "examples" / "demo_gateway.py",  # From project root
            Path(__file__).parent.parent.parent.parent
            / "examples"
            / "demo_gateway.py",  # Relative to package
        ]

        demo_script = None
        for location in possible_locations:
            if location.exists():
                demo_script = location
                break

        if demo_script is None:
            console.print("❌ Demo script not found. Tried the following locations:")
            for location in possible_locations:
                console.print(f"   {location}")
            console.print("Make sure you're running from the project root directory.")
            sys.exit(1)

        console.print("🚀 Starting MCP Registry Gateway Demo")
        console.print(f"📂 Demo script: {demo_script}")
        console.print("📍 Gateway URL: http://localhost:8001 (default)")
        console.print()
        console.print("💡 Make sure the gateway is running first:")
        console.print("   uv run mcp-gateway serve --port 8001")
        console.print()

        # Run the demo script
        project_root = demo_script.parent.parent  # examples -> project_root
        result = subprocess.run(
            [sys.executable, str(demo_script)],
            cwd=project_root,
        )

        sys.exit(result.returncode)

    except KeyboardInterrupt:
        console.print("\n👋 Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        console.print(f"❌ Demo failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
