#!/usr/bin/env python3
"""
Quick integration test for MCP Registry Gateway examples.

This script tests both the minimal and enterprise server examples
using the enhanced testing framework.

Usage:
    python integration_test.py
"""

import asyncio
import subprocess
import sys
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExampleTester:
    """Test runner for MCP server examples."""

    def __init__(self):
        self.examples_dir = Path(__file__).parent.parent
        self.test_results = []

    async def run_all_tests(self):
        """Run tests for all examples."""
        logger.info("Starting MCP examples integration testing...")

        # Test minimal server
        await self._test_minimal_server()

        # Test enterprise server (if configured)
        await self._test_enterprise_server()

        # Print summary
        self._print_summary()

    async def _test_minimal_server(self):
        """Test the minimal MCP server example."""
        logger.info("Testing minimal MCP server...")

        server_path = self.examples_dir / "minimal-mcp-server" / "server.py"

        try:
            # Run compliance test against minimal server
            result = subprocess.run(
                [
                    sys.executable,
                    "test_mcp_compliance.py",
                    "--profile",
                    "minimal",
                    "--server-command",
                    "python",
                    str(server_path),
                    "--timeout",
                    "15",
                    "--verbose",
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )

            success = result.returncode == 0
            self.test_results.append(
                {
                    "name": "minimal-server",
                    "success": success,
                    "output": result.stdout,
                    "errors": result.stderr,
                }
            )

            if success:
                logger.info("✅ Minimal server tests passed")
            else:
                logger.error("❌ Minimal server tests failed")
                logger.error(f"Error output: {result.stderr}")

        except subprocess.TimeoutExpired:
            logger.error("❌ Minimal server test timed out")
            self.test_results.append(
                {
                    "name": "minimal-server",
                    "success": False,
                    "output": "",
                    "errors": "Test timed out",
                }
            )
        except Exception as e:
            logger.error(f"❌ Error testing minimal server: {e}")
            self.test_results.append(
                {
                    "name": "minimal-server",
                    "success": False,
                    "output": "",
                    "errors": str(e),
                }
            )

    async def _test_enterprise_server(self):
        """Test the enterprise MCP server example."""
        logger.info("Testing enterprise MCP server...")

        server_path = self.examples_dir / "enterprise-auth-server" / "server.py"

        try:
            # Run basic compliance test (without auth for now)
            result = subprocess.run(
                [
                    sys.executable,
                    "test_mcp_compliance.py",
                    "--profile",
                    "minimal",  # Use minimal profile since no auth token
                    "--server-command",
                    "python",
                    str(server_path),
                    "--timeout",
                    "15",
                    "--verbose",
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )

            success = result.returncode == 0
            self.test_results.append(
                {
                    "name": "enterprise-server",
                    "success": success,
                    "output": result.stdout,
                    "errors": result.stderr,
                }
            )

            if success:
                logger.info("✅ Enterprise server tests passed")
            else:
                logger.error("❌ Enterprise server tests failed")
                logger.error(f"Error output: {result.stderr}")

        except subprocess.TimeoutExpired:
            logger.error("❌ Enterprise server test timed out")
            self.test_results.append(
                {
                    "name": "enterprise-server",
                    "success": False,
                    "output": "",
                    "errors": "Test timed out",
                }
            )
        except Exception as e:
            logger.error(f"❌ Error testing enterprise server: {e}")
            self.test_results.append(
                {
                    "name": "enterprise-server",
                    "success": False,
                    "output": "",
                    "errors": str(e),
                }
            )

    def _print_summary(self):
        """Print test summary."""
        logger.info("\n" + "=" * 60)
        logger.info("MCP EXAMPLES INTEGRATION TEST SUMMARY")
        logger.info("=" * 60)

        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)

        logger.info(f"Total Tests: {total}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {total - passed}")
        logger.info(f"Success Rate: {(passed / total * 100):.1f}%")

        for result in self.test_results:
            status = "✅ PASSED" if result["success"] else "❌ FAILED"
            logger.info(f"  {result['name']}: {status}")
            if not result["success"] and result["errors"]:
                logger.info(f"    Error: {result['errors']}")

        if passed == total:
            logger.info("\n🎉 All tests passed! Examples are working correctly.")
        else:
            logger.info("\n⚠️  Some tests failed. Check the output above for details.")


async def main():
    """Main function."""
    tester = ExampleTester()
    await tester.run_all_tests()

    # Exit with appropriate code
    passed = sum(1 for result in tester.test_results if result["success"])
    total = len(tester.test_results)
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    asyncio.run(main())
