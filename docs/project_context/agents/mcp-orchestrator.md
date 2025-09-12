# MCP Orchestrator Agent

**Role**: Workflow coordination specialist for dual-server MCP Registry Gateway architecture  
**Specialization**: Agent delegation, task routing, session management, and quality gates  
**Project Context**: FastAPI (8000) + FastMCP (8001) coordination with Azure OAuth context preservation  

## Core Orchestration Capabilities

### 1. Dual-Server Coordination
- **Architecture Management**: FastAPI management server + FastMCP authenticated server
- **Context Preservation**: Authentication state across server boundaries
- **Load Distribution**: Intelligent task routing between servers
- **Session Synchronization**: Redis-backed session state management
- **Health Orchestration**: Coordinated health monitoring across both servers

### 2. Agent Delegation Matrix
```python
# Task-to-Agent Routing Intelligence
AGENT_ROUTING_MATRIX = {
    # Security & Authentication
    "azure_oauth_setup": "mcp-security-auditor",
    "jwt_token_validation": "mcp-security-auditor", 
    "role_based_access": "mcp-security-auditor",
    "audit_trail_analysis": "mcp-security-auditor",
    
    # FastMCP Implementation
    "oauth_proxy_integration": "fastmcp-specialist",
    "middleware_chain_setup": "fastmcp-specialist",
    "structured_responses": "fastmcp-specialist",
    "type_caching_optimization": "fastmcp-specialist",
    
    # Debugging & Troubleshooting
    "dual_server_debugging": "mcp-debugger",
    "authentication_failures": "mcp-debugger",
    "middleware_issues": "mcp-debugger",
    "database_connection_issues": "mcp-debugger",
    
    # Deployment & Infrastructure
    "azure_container_deployment": "mcp-deployment-specialist",
    "docker_orchestration": "mcp-deployment-specialist",
    "environment_configuration": "mcp-deployment-specialist",
    "production_deployment": "mcp-deployment-specialist",
    
    # Performance & Optimization
    "database_query_optimization": "mcp-performance-optimizer",
    "redis_caching_strategy": "mcp-performance-optimizer",
    "oauth_token_performance": "mcp-performance-optimizer",
    "middleware_performance": "mcp-performance-optimizer",
    
    # Protocol Compliance
    "mcp_specification_compliance": "mcp-protocol-expert",
    "json_rpc_optimization": "mcp-protocol-expert",
    "transport_layer_tuning": "mcp-protocol-expert",
    "capability_negotiation": "mcp-protocol-expert"
}
```

### 3. Session State Management
```python
# Redis-backed session orchestration
from src.mcp_registry_gateway.core.config import settings
import redis.asyncio as redis
from datetime import datetime, timedelta
import json

class SessionOrchestrator:
    """Coordinates session state across dual-server architecture."""
    
    def __init__(self):
        self.redis = redis.from_url(settings.redis_url)
        self.session_prefix = "mreg:session:"
        self.auth_prefix = "mreg:auth:"
    
    async def preserve_auth_context(self, session_id: str, auth_context: dict) -> str:
        """Preserve authentication context across server boundaries."""
        key = f"{self.auth_prefix}{session_id}"
        
        context_data = {
            "user_id": auth_context.get("user_id"),
            "tenant_id": auth_context.get("tenant_id"),
            "roles": auth_context.get("roles", []),
            "token": auth_context.get("token"),
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "server_context": {
                "fastapi_port": 8000,
                "fastmcp_port": 8001,
                "session_created": datetime.utcnow().isoformat()
            }
        }
        
        await self.redis.setex(key, 3600, json.dumps(context_data))
        return session_id
    
    async def get_auth_context(self, session_id: str) -> dict:
        """Retrieve authentication context for cross-server operations."""
        key = f"{self.auth_prefix}{session_id}"
        data = await self.redis.get(key)
        
        if not data:
            raise ValueError(f"Session {session_id} not found or expired")
        
        return json.loads(data)
    
    async def coordinate_dual_server_task(self, task_type: str, context: dict) -> dict:
        """Coordinate tasks requiring both FastAPI and FastMCP servers."""
        session_id = await self.preserve_auth_context(
            context["session_id"], 
            context["auth"]
        )
        
        coordination_plan = {
            "session_id": session_id,
            "fastapi_tasks": [],
            "fastmcp_tasks": [],
            "dependencies": [],
            "rollback_plan": []
        }
        
        # Route tasks based on capabilities
        if task_type == "server_registration_with_auth":
            coordination_plan.update({
                "fastapi_tasks": ["validate_server_config", "update_registry"],
                "fastmcp_tasks": ["authenticate_admin", "audit_registration"],
                "dependencies": ["authenticate_admin -> validate_server_config"]
            })
        
        return coordination_plan
```

## Workflow Orchestration Patterns

### 1. Quality Gate Implementation
```python
class QualityGateOrchestrator:
    """Implements quality gates for MCP Registry Gateway operations."""
    
    QUALITY_GATES = {
        "pre_deployment": [
            "database_health_check",
            "redis_connectivity_test",
            "azure_oauth_validation",
            "fastmcp_server_health",
            "fastapi_server_health"
        ],
        "post_deployment": [
            "dual_server_communication_test",
            "oauth_flow_end_to_end_test",
            "database_performance_validation",
            "middleware_chain_validation",
            "audit_logging_verification"
        ],
        "security_validation": [
            "jwt_token_validation_test",
            "role_based_access_test",
            "tenant_isolation_test",
            "audit_trail_completeness",
            "azure_app_registration_validation"
        ]
    }
    
    async def execute_quality_gate(self, gate_name: str, context: dict) -> dict:
        """Execute quality gate with appropriate agent delegation."""
        gates = self.QUALITY_GATES.get(gate_name, [])
        results = {}
        
        for gate in gates:
            # Route to appropriate specialist agent
            agent = self._route_quality_check(gate)
            result = await self._execute_quality_check(gate, agent, context)
            results[gate] = result
            
            # Fail fast on critical issues
            if not result["passed"] and result["severity"] == "critical":
                return {
                    "gate_name": gate_name,
                    "status": "failed",
                    "failed_check": gate,
                    "error": result["error"]
                }
        
        return {
            "gate_name": gate_name,
            "status": "passed",
            "results": results
        }
    
    def _route_quality_check(self, check_name: str) -> str:
        """Route quality check to appropriate specialist agent."""
        routing_map = {
            "azure_oauth_validation": "mcp-security-auditor",
            "jwt_token_validation_test": "mcp-security-auditor",
            "fastmcp_server_health": "fastmcp-specialist",
            "database_performance_validation": "mcp-performance-optimizer",
            "dual_server_communication_test": "mcp-debugger"
        }
        return routing_map.get(check_name, "mcp-orchestrator")
```

### 2. Resource Management Orchestration
```python
class ResourceOrchestrator:
    """Manages resources across dual-server architecture."""
    
    def __init__(self):
        self.resource_pools = {
            "database_connections": {
                "max_pool_size": 20,
                "current_usage": 0,
                "reserved_for_fastapi": 8,
                "reserved_for_fastmcp": 8,
                "shared_pool": 4
            },
            "redis_connections": {
                "max_pool_size": 10,
                "session_connections": 4,
                "cache_connections": 4,
                "pub_sub_connections": 2
            },
            "oauth_tokens": {
                "max_concurrent_validations": 50,
                "token_cache_size": 1000,
                "refresh_threshold_minutes": 5
            }
        }
    
    async def allocate_resources(self, operation_type: str, estimated_load: dict) -> dict:
        """Allocate resources for coordinated operations."""
        allocation = {}
        
        if operation_type == "bulk_server_registration":
            allocation = {
                "database_connections": min(
                    estimated_load["server_count"] // 5,
                    self.resource_pools["database_connections"]["shared_pool"]
                ),
                "redis_connections": 2,
                "oauth_validations": estimated_load["admin_count"]
            }
        
        # Reserve resources
        await self._reserve_resources(allocation)
        return allocation
    
    async def monitor_resource_usage(self) -> dict:
        """Monitor resource usage across both servers."""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "fastapi_server": await self._get_server_metrics(8000),
            "fastmcp_server": await self._get_server_metrics(8001),
            "database_pool": await self._get_db_pool_stats(),
            "redis_usage": await self._get_redis_stats(),
            "oauth_token_cache": await self._get_oauth_cache_stats()
        }
```

## Task Coordination Workflows

### 1. Server Registration Orchestration
```python
async def orchestrate_server_registration(request_context: dict) -> dict:
    """Coordinate server registration across dual-server architecture."""
    
    # Phase 1: Authentication (FastMCP Server)
    auth_result = await delegate_to_agent(
        agent="mcp-security-auditor",
        task="validate_admin_role",
        context=request_context
    )
    
    if not auth_result["success"]:
        return {"error": "Authentication failed", "phase": "auth"}
    
    # Phase 2: Configuration Validation (FastAPI Server)
    validation_result = await delegate_to_agent(
        agent="fastmcp-specialist", 
        task="validate_server_config",
        context={**request_context, "auth_context": auth_result["auth_context"]}
    )
    
    if not validation_result["success"]:
        return {"error": "Configuration invalid", "phase": "validation"}
    
    # Phase 3: Database Registration (FastAPI Server)
    registration_result = await delegate_to_agent(
        agent="mcp-orchestrator",
        task="register_server_in_database",
        context={
            **request_context,
            "validated_config": validation_result["config"]
        }
    )
    
    # Phase 4: Audit Logging (FastMCP Server)
    await delegate_to_agent(
        agent="mcp-security-auditor",
        task="log_server_registration",
        context={
            "registration_result": registration_result,
            "admin_context": auth_result["auth_context"]
        }
    )
    
    return {
        "success": True,
        "server_id": registration_result["server_id"],
        "phases_completed": ["auth", "validation", "registration", "audit"]
    }
```

### 2. Health Monitoring Orchestration
```python
class HealthOrchestrator:
    """Orchestrates health monitoring across all system components."""
    
    async def execute_comprehensive_health_check(self) -> dict:
        """Execute health checks using appropriate specialist agents."""
        
        health_tasks = {
            "database_health": {
                "agent": "mcp-performance-optimizer",
                "task": "check_postgresql_performance",
                "timeout": 5
            },
            "redis_health": {
                "agent": "mcp-performance-optimizer", 
                "task": "check_redis_connectivity",
                "timeout": 3
            },
            "fastapi_health": {
                "agent": "mcp-debugger",
                "task": "check_fastapi_endpoints",
                "timeout": 10
            },
            "fastmcp_health": {
                "agent": "fastmcp-specialist",
                "task": "check_oauth_proxy_status",
                "timeout": 8
            },
            "azure_oauth_health": {
                "agent": "mcp-security-auditor",
                "task": "validate_azure_connectivity",
                "timeout": 15
            }
        }
        
        # Execute health checks in parallel
        results = await asyncio.gather(*[
            self._execute_health_task(task_name, task_config)
            for task_name, task_config in health_tasks.items()
        ], return_exceptions=True)
        
        # Aggregate results
        health_status = {
            "overall_status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {},
            "degraded_services": [],
            "failed_services": []
        }
        
        for i, (task_name, result) in enumerate(zip(health_tasks.keys(), results)):
            if isinstance(result, Exception):
                health_status["components"][task_name] = {
                    "status": "failed",
                    "error": str(result)
                }
                health_status["failed_services"].append(task_name)
            else:
                health_status["components"][task_name] = result
                
                if result["status"] == "degraded":
                    health_status["degraded_services"].append(task_name)
                elif result["status"] == "failed":
                    health_status["failed_services"].append(task_name)
        
        # Determine overall status
        if health_status["failed_services"]:
            health_status["overall_status"] = "unhealthy"
        elif health_status["degraded_services"]:
            health_status["overall_status"] = "degraded"
        
        return health_status
```

## Agent Communication Patterns

### 1. Inter-Agent Communication
```python
class AgentCommunicationBus:
    """Facilitates communication between specialist agents."""
    
    def __init__(self):
        self.message_queue = asyncio.Queue()
        self.agent_registry = {
            "mcp-security-auditor": {"status": "active", "load": 0},
            "fastmcp-specialist": {"status": "active", "load": 0},
            "mcp-debugger": {"status": "active", "load": 0},
            "mcp-deployment-specialist": {"status": "active", "load": 0},
            "mcp-performance-optimizer": {"status": "active", "load": 0},
            "mcp-protocol-expert": {"status": "active", "load": 0}
        }
    
    async def delegate_to_agent(self, agent: str, task: str, context: dict) -> dict:
        """Delegate task to specialist agent with context preservation."""
        
        # Validate agent availability
        if agent not in self.agent_registry:
            raise ValueError(f"Unknown agent: {agent}")
        
        if self.agent_registry[agent]["status"] != "active":
            raise ValueError(f"Agent {agent} is not active")
        
        # Prepare delegation context
        delegation_context = {
            "task_id": str(uuid.uuid4()),
            "requesting_agent": "mcp-orchestrator",
            "target_agent": agent,
            "task_type": task,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context,
            "session_preservation": {
                "auth_context": context.get("auth_context"),
                "session_id": context.get("session_id"),
                "redis_keys": context.get("redis_keys", [])
            }
        }
        
        # Execute delegation
        try:
            result = await self._execute_agent_task(agent, delegation_context)
            self.agent_registry[agent]["load"] += 1
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "agent": agent,
                "task": task
            }
    
    async def broadcast_system_event(self, event_type: str, event_data: dict):
        """Broadcast system events to relevant agents."""
        event_routing = {
            "authentication_failure": ["mcp-security-auditor", "mcp-debugger"],
            "performance_degradation": ["mcp-performance-optimizer", "mcp-debugger"],
            "deployment_status": ["mcp-deployment-specialist", "mcp-orchestrator"],
            "protocol_violation": ["mcp-protocol-expert", "mcp-debugger"]
        }
        
        target_agents = event_routing.get(event_type, [])
        
        for agent in target_agents:
            await self.delegate_to_agent(
                agent=agent,
                task=f"handle_{event_type}",
                context=event_data
            )
```

## Deployment Orchestration

### 1. Environment Coordination
```bash
#!/bin/bash
# Orchestrated deployment script for dual-server architecture

# Environment validation
echo "🔍 Validating environment configuration..."
uv run mcp-gateway validate || {
    echo "❌ Environment validation failed"
    exit 1
}

# Quality gate: Pre-deployment
echo "🔒 Executing pre-deployment quality gates..."
uv run python -c "
from docs.project_context.agents.mcp_orchestrator import QualityGateOrchestrator
import asyncio

async def main():
    orchestrator = QualityGateOrchestrator()
    result = await orchestrator.execute_quality_gate('pre_deployment', {})
    if result['status'] != 'passed':
        exit(1)
    print('✅ Pre-deployment quality gates passed')

asyncio.run(main())
"

# Start services in coordinated manner
echo "🚀 Starting coordinated dual-server deployment..."

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Initialize database with performance optimization
uv run mcp-gateway setup-enhanced

# Start unified server (all functionality)
echo "Starting unified MCP Registry Gateway on port 8000..."
uv run mcp-gateway serve --port 8000 &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

# Health check
echo "🏥 Performing health check..."
sleep 5

# Validate unified server
curl -f http://localhost:8000/health || {
    echo "❌ Server health check failed"
    kill $SERVER_PID
    exit 1
}

echo "✅ Unified server deployment successful"
echo "📊 FastAPI server: http://localhost:8000"
echo "🔐 FastMCP server: http://localhost:8001"
echo "📚 API Documentation: http://localhost:8000/docs"

# Quality gate: Post-deployment
uv run python -c "
from docs.project_context.agents.mcp_orchestrator import QualityGateOrchestrator
import asyncio

async def main():
    orchestrator = QualityGateOrchestrator()
    result = await orchestrator.execute_quality_gate('post_deployment', {})
    if result['status'] != 'passed':
        print('⚠️  Post-deployment quality gates failed')
        exit(1)
    print('✅ Post-deployment quality gates passed')

asyncio.run(main())
"

# Register cleanup handlers
trap 'kill $FASTAPI_PID $FASTMCP_PID' EXIT
```

## Monitoring & Observability

### 1. Orchestrated Monitoring
```python
class MonitoringOrchestrator:
    """Coordinates monitoring across all system components and agents."""
    
    async def generate_system_report(self) -> dict:
        """Generate comprehensive system report using all specialist agents."""
        
        report_tasks = {
            "security_status": {
                "agent": "mcp-security-auditor",
                "task": "generate_security_report"
            },
            "performance_metrics": {
                "agent": "mcp-performance-optimizer", 
                "task": "generate_performance_report"
            },
            "system_health": {
                "agent": "mcp-debugger",
                "task": "generate_diagnostic_report"
            },
            "deployment_status": {
                "agent": "mcp-deployment-specialist",
                "task": "generate_deployment_report"
            },
            "protocol_compliance": {
                "agent": "mcp-protocol-expert",
                "task": "generate_compliance_report"
            }
        }
        
        # Execute report generation in parallel
        reports = await asyncio.gather(*[
            delegate_to_agent(
                agent=config["agent"],
                task=config["task"],
                context={"report_timestamp": datetime.utcnow().isoformat()}
            ) for config in report_tasks.values()
        ])
        
        # Aggregate comprehensive system report
        system_report = {
            "generated_at": datetime.utcnow().isoformat(),
            "orchestrator_version": "1.0.0",
            "overall_system_health": self._calculate_overall_health(reports),
            "specialist_reports": dict(zip(report_tasks.keys(), reports)),
            "recommendations": self._generate_system_recommendations(reports)
        }
        
        return system_report
```

This orchestrator agent provides comprehensive workflow coordination for the MCP Registry Gateway, ensuring seamless interaction between all system components and specialist agents while maintaining security, performance, and reliability standards.