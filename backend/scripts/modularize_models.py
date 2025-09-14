#!/usr/bin/env python3
"""
Script to modularize the monolithic models.py file into separate module files.

This script extracts model classes from models.py and creates separate files
for each logical group in the models/ directory.
"""

import os
import re
from pathlib import Path


def extract_models_from_file(file_path):
    """Extract model definitions from the original models.py file."""
    with open(file_path, "r") as f:
        content = f.read()

    # Define model groups and their corresponding classes
    model_groups = {
        "auth.py": [
            "User", "Session", "APIKey", "EnhancedAPIKey"
        ],
        "registry.py": [
            "MCPServer", "ServerTool", "ServerResource", "ServerMetric",
            "ServerAccessControl"
        ],
        "routing.py": [
            "RoutingRule"
        ],
        "audit.py": [
            "AuditLog", "RequestLog", "FastMCPAuditLog"
        ],
        "system.py": [
            "SystemConfig", "CircuitBreaker", "ConnectionPool", "RequestQueue",
            "DataRetentionPolicy", "MaterializedView", "PerformanceAlert"
        ]
    }

    # Extract class definitions
    class_pattern = re.compile(
        r'^class\s+(\w+).*?(?=^class\s+|\Z)',
        re.MULTILINE | re.DOTALL
    )

    classes = {}
    for match in class_pattern.finditer(content):
        class_name = match.group(1)
        class_def = match.group(0)
        classes[class_name] = class_def

    return classes, model_groups


def create_module_files(classes, model_groups, models_dir):
    """Create separate module files for each group of models."""

    # Create auth.py
    auth_content = '''"""
Authentication and authorization models for MCP Registry Gateway.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from .base import UserRole, UUIDModel

if TYPE_CHECKING:
    from .registry import MCPServer
    from .tenant import Tenant


'''

    # Create registry.py
    registry_content = '''"""
MCP server registry models.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from .base import ServerStatus, TransportType, UUIDModel, utc_now

if TYPE_CHECKING:
    from .auth import User
    from .tenant import Tenant


'''

    # Create routing.py
    routing_content = '''"""
Routing and rule models for MCP Registry Gateway.
"""

from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import UUIDModel


'''

    # Create audit.py
    audit_content = '''"""
Audit logging models for MCP Registry Gateway.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import UUIDModel, utc_now


'''

    # Create system.py
    system_content = '''"""
System configuration and monitoring models.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import UUIDModel, utc_now


'''

    # Map of file to base content
    file_contents = {
        "auth.py": auth_content,
        "registry.py": registry_content,
        "routing.py": routing_content,
        "audit.py": audit_content,
        "system.py": system_content
    }

    # Add classes to appropriate files
    for filename, class_names in model_groups.items():
        content = file_contents.get(filename, "")

        for class_name in class_names:
            if class_name in classes:
                # Clean up the class definition
                class_def = classes[class_name]
                # Remove extra newlines at the end
                class_def = class_def.rstrip() + "\n\n\n"
                content += class_def

        # Write the file
        file_path = models_dir / filename
        with open(file_path, "w") as f:
            f.write(content.rstrip() + "\n")

        print(f"Created {file_path}")


def main():
    """Main function to modularize models."""
    # Paths
    backend_dir = Path(__file__).parent.parent
    models_py = backend_dir / "src" / "mcp_registry_gateway" / "db" / "models.py"
    models_dir = backend_dir / "src" / "mcp_registry_gateway" / "db" / "models"

    if not models_py.exists():
        print(f"Error: {models_py} not found")
        return 1

    # Create models directory if it doesn't exist
    models_dir.mkdir(exist_ok=True)

    print(f"Extracting models from {models_py}")
    classes, model_groups = extract_models_from_file(models_py)

    print(f"Found {len(classes)} model classes")
    print(f"Creating module files in {models_dir}")

    create_module_files(classes, model_groups, models_dir)

    print("\nModularization complete!")
    print("\nNext steps:")
    print("1. Review the generated files for correctness")
    print("2. Update imports in other modules")
    print("3. Test that all models are still accessible")
    print("4. Consider removing or renaming the original models.py")

    return 0


if __name__ == "__main__":
    exit(main())