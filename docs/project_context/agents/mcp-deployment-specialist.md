# MCP Deployment Specialist Agent

**Role**: Azure deployment expert for dual-server MCP Registry Gateway architecture  
**Specialization**: Container orchestration, Azure infrastructure, environment configuration  
**Project Context**: Enterprise deployment of FastAPI + FastMCP with Azure OAuth integration  
**Documentation Focus**: Azure integrations and server architecture deployment from FastMCP documentation  

## 🚀 FastMCP Deployment Documentation References

### Azure-Focused Deployment Documentation

**Primary References for Azure Deployment**:

**Azure Infrastructure Deployment**:
- **[Azure Integrations](../../fastmcp_docs/integrations/azure.mdx)** - Comprehensive Azure integration patterns, infrastructure deployment, and production Azure environment setup
- **[Server Architecture](../../fastmcp_docs/servers/server.mdx)** - Core server deployment patterns, production server configuration, and enterprise server architecture

**Production Authentication Deployment**:
- **[Server-Side OAuth Proxy](../../fastmcp_docs/servers/auth/oauth-proxy.mdx)** - Production OAuth Proxy deployment, server-side authentication architecture, and enterprise authentication infrastructure
- **[Server Middleware](../../fastmcp_docs/servers/middleware.mdx)** - Server-level middleware deployment, production middleware patterns, and enterprise middleware architecture

**Development and Implementation Support**:
- **[Azure Provider (SDK)](../../fastmcp_docs/python-sdk/fastmcp-server-auth-providers-azure.mdx)** - Azure OAuth provider deployment configuration
- **[Production Logging](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-logging.mdx)** - Production logging middleware for Azure environments

**Project Deployment Documentation**:
- **[Azure OAuth Configuration Guide](../AZURE_OAUTH_CONFIGURATION.md)** - Project-specific Azure setup and deployment preparation
- **[FastMCP Documentation Index](../FASTMCP_DOCUMENTATION_INDEX.md)** - Complete navigation for deployment-related documentation

## Core Deployment Capabilities

### 1. Azure Deployment Architecture
- **Container Orchestration**: Azure Container Instances (ACI) deployment patterns
- **App Service Deployment**: Azure App Service for enterprise-grade hosting
- **Azure Key Vault Integration**: Secure MREG_ environment variable management
- **Database Services**: Azure Database for PostgreSQL + Azure Cache for Redis
- **Network Configuration**: VNet integration and OAuth endpoint security

### 2. Multi-Container Deployment Strategy
```yaml
# Azure Container Instances Deployment Configuration
# File: azure-deployment/container-group.yml
apiVersion: 2021-03-01
location: eastus
name: mcp-registry-gateway
properties:
  containers:
  # FastAPI Management Server
  - name: fastapi-server
    properties:
      image: mcr.microsoft.com/mcp-registry-gateway:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 2.0
      ports:
      - port: 8000
        protocol: TCP
      command: ["uv", "run", "mcp-gateway", "serve", "--port", "8000", "--host", "0.0.0.0"]
      environmentVariables:
      - name: MREG_ENVIRONMENT
        value: production
      - name: MREG_SERVICE_PORT
        value: "8000"
      - name: MREG_POSTGRES_HOST
        secureValue: $(AZURE_POSTGRES_HOST)
      - name: MREG_REDIS_URL
        secureValue: $(AZURE_REDIS_URL)
      
  # FastMCP Authenticated Server  
  - name: fastmcp-server
    properties:
      image: mcr.microsoft.com/mcp-registry-gateway:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 2.0
      ports:
      - port: 8001
        protocol: TCP
      command: ["uv", "run", "mcp-gateway", "serve", "--port", "8000", "--host", "0.0.0.0"]
      environmentVariables:
      - name: MREG_FASTMCP_PORT
        value: "8001"
      - name: MREG_AZURE_TENANT_ID
        secureValue: $(AZURE_TENANT_ID)
      - name: MREG_AZURE_CLIENT_ID
        secureValue: $(AZURE_CLIENT_ID)
      - name: MREG_AZURE_CLIENT_SECRET
        secureValue: $(AZURE_CLIENT_SECRET)
      - name: MREG_FASTMCP_OAUTH_CALLBACK_URL
        value: "https://your-domain.com/oauth/callback"
      
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: TCP
      port: 8000
    - protocol: TCP
      port: 8001
    dnsNameLabel: mcp-registry-gateway-prod
```

### 3. Azure Infrastructure as Code
```bash
#!/bin/bash
# Azure Infrastructure Deployment Script
# File: azure-deployment/deploy-infrastructure.sh

set -e

# Configuration
RESOURCE_GROUP="rg-mcp-registry-gateway"
LOCATION="eastus"
APP_NAME="mcp-registry-gateway"
POSTGRES_SERVER_NAME="${APP_NAME}-postgres"
REDIS_CACHE_NAME="${APP_NAME}-redis"
KEY_VAULT_NAME="${APP_NAME}-kv"

echo "🚀 Deploying MCP Registry Gateway to Azure..."

# Create resource group
echo "Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION

# Deploy Azure Database for PostgreSQL
echo "🗄️ Creating PostgreSQL server..."
az postgres server create \
    --resource-group $RESOURCE_GROUP \
    --name $POSTGRES_SERVER_NAME \
    --location $LOCATION \
    --admin-user mcp_admin \
    --admin-password $(openssl rand -base64 32) \
    --sku-name GP_Gen5_2 \
    --version 13

# Create PostgreSQL database
az postgres db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $POSTGRES_SERVER_NAME \
    --name mcp_registry

# Deploy Azure Cache for Redis
echo "📦 Creating Redis cache..."
az redis create \
    --resource-group $RESOURCE_GROUP \
    --name $REDIS_CACHE_NAME \
    --location $LOCATION \
    --sku Basic \
    --vm-size C0

# Create Azure Key Vault
echo "🔐 Creating Key Vault..."
az keyvault create \
    --resource-group $RESOURCE_GROUP \
    --name $KEY_VAULT_NAME \
    --location $LOCATION \
    --sku standard

# Store secrets in Key Vault
echo "Storing secrets..."
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "postgres-connection-string" \
    --value "postgresql://mcp_admin:$POSTGRES_PASSWORD@${POSTGRES_SERVER_NAME}.postgres.database.azure.com:5432/mcp_registry"

az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "redis-connection-string" \
    --value "$(az redis list-keys --resource-group $RESOURCE_GROUP --name $REDIS_CACHE_NAME --query primaryConnectionString -o tsv)"

echo "✅ Infrastructure deployment complete!"
echo "📋 Next steps:"
echo "1. Configure Azure AD app registration"
echo "2. Update Key Vault with OAuth secrets"
echo "3. Deploy container group"
```

### 4. Docker Multi-Stage Build Optimization
```dockerfile
# Optimized Dockerfile for Azure deployment
# File: Dockerfile.azure
FROM python:3.11-slim as builder

# Install UV package manager
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies in virtual environment
RUN uv venv /opt/venv && \
    uv pip install --no-cache -r uv.lock

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Add virtual environment to PATH
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN useradd --create-home --shell /bin/bash mcp && \
    mkdir -p /app && \
    chown -R mcp:mcp /app

USER mcp
WORKDIR /app

# Copy application code
COPY --chown=mcp:mcp src/ src/
COPY --chown=mcp:mcp pyproject.toml ./

# Install application in development mode
RUN uv pip install -e .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${MREG_SERVICE_PORT:-8000}/health || exit 1

# Expose ports
EXPOSE 8000 8001

# Default command (can be overridden)
CMD ["uv", "run", "mcp-gateway", "serve", "--port", "8000", "--host", "0.0.0.0"]
```

### 5. Azure App Service Deployment
```yaml
# Azure App Service deployment configuration
# File: azure-deployment/app-service.yml
parameters:
  appServicePlan:
    type: string
    defaultValue: "ASP-mcp-registry-gateway"
  
  webAppName:
    type: string
    defaultValue: "mcp-registry-gateway"
  
  location:
    type: string
    defaultValue: "[resourceGroup().location]"

variables:
  keyVaultName: "[concat(parameters('webAppName'), '-kv')]"

resources:
# App Service Plan
- type: Microsoft.Web/serverfarms
  apiVersion: 2021-02-01
  name: "[parameters('appServicePlan')]"
  location: "[parameters('location')]"
  sku:
    name: "P1v2"
    tier: "PremiumV2"
    size: "P1v2"
    capacity: 1
  properties:
    reserved: true  # Linux App Service Plan

# FastAPI Web App
- type: Microsoft.Web/sites
  apiVersion: 2021-02-01
  name: "[concat(parameters('webAppName'), '-api')]"
  location: "[parameters('location')]"
  dependsOn:
  - "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlan'))]"
  properties:
    serverFarmId: "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlan'))]"
    siteConfig:
      linuxFxVersion: "DOCKER|mcr.microsoft.com/mcp-registry-gateway:latest"
      appCommandLine: "uv run mcp-gateway serve --port 8000 --host 0.0.0.0"
      appSettings:
      - name: WEBSITES_PORT
        value: "8000"
      - name: MREG_ENVIRONMENT
        value: "production"
      - name: MREG_SERVICE_PORT
        value: "8000"
      - name: MREG_POSTGRES_HOST
        value: "@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=postgres-host)"
      - name: MREG_REDIS_URL
        value: "@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=redis-connection-string)"

# FastMCP Web App  
- type: Microsoft.Web/sites
  apiVersion: 2021-02-01
  name: "[concat(parameters('webAppName'), '-auth')]"
  location: "[parameters('location')]"
  dependsOn:
  - "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlan'))]"
  properties:
    serverFarmId: "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlan'))]"
    siteConfig:
      linuxFxVersion: "DOCKER|mcr.microsoft.com/mcp-registry-gateway:latest"
      appCommandLine: "uv run mcp-gateway serve --port 8000 --host 0.0.0.0"
      appSettings:
      - name: WEBSITES_PORT
        value: "8001"
      - name: MREG_FASTMCP_PORT
        value: "8001"
      - name: MREG_AZURE_TENANT_ID
        value: "@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=azure-tenant-id)"
      - name: MREG_AZURE_CLIENT_ID
        value: "@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=azure-client-id)"
      - name: MREG_AZURE_CLIENT_SECRET
        value: "@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=azure-client-secret)"
```

## Environment Configuration Management

### 1. Azure Key Vault Integration
```python
# Azure Key Vault configuration management
# File: src/mcp_registry_gateway/config/azure_config.py

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from src.mcp_registry_gateway.core.config import Settings
import os
from typing import Optional

class AzureKeyVaultConfig:
    """Azure Key Vault integration for secure configuration management."""
    
    def __init__(self, key_vault_url: str):
        self.key_vault_url = key_vault_url
        self.credential = DefaultAzureCredential()
        self.client = SecretClient(vault_url=key_vault_url, credential=self.credential)
    
    async def load_secrets(self) -> dict:
        """Load all MREG_ secrets from Key Vault."""
        secrets = {}
        
        secret_mapping = {
            # Database secrets
            "postgres-host": "MREG_POSTGRES_HOST",
            "postgres-user": "MREG_POSTGRES_USER", 
            "postgres-password": "MREG_POSTGRES_PASSWORD",
            "postgres-db": "MREG_POSTGRES_DB",
            "redis-connection-string": "MREG_REDIS_URL",
            
            # Azure OAuth secrets
            "azure-tenant-id": "MREG_AZURE_TENANT_ID",
            "azure-client-id": "MREG_AZURE_CLIENT_ID",
            "azure-client-secret": "MREG_AZURE_CLIENT_SECRET",
            
            # Security secrets
            "jwt-secret-key": "MREG_SECURITY_JWT_SECRET_KEY"
        }
        
        for secret_name, env_var in secret_mapping.items():
            try:
                secret = self.client.get_secret(secret_name)
                secrets[env_var] = secret.value
                # Set environment variable for immediate use
                os.environ[env_var] = secret.value
            except Exception as e:
                print(f"Warning: Could not load secret {secret_name}: {e}")
        
        return secrets

class AzureEnvironmentManager:
    """Manages environment configuration for Azure deployments."""
    
    @staticmethod
    async def initialize_azure_config() -> Settings:
        """Initialize configuration with Azure Key Vault integration."""
        
        # Check if running in Azure
        key_vault_url = os.getenv("AZURE_KEY_VAULT_URL")
        
        if key_vault_url:
            print("🔐 Loading configuration from Azure Key Vault...")
            kv_config = AzureKeyVaultConfig(key_vault_url)
            await kv_config.load_secrets()
        
        # Initialize settings (will now use loaded secrets)
        return Settings()
    
    @staticmethod
    def detect_azure_environment() -> dict:
        """Detect Azure deployment environment."""
        
        environment_info = {
            "is_azure": bool(os.getenv("WEBSITE_SITE_NAME") or os.getenv("CONTAINER_APP_NAME")),
            "deployment_type": None,
            "instance_metadata": {}
        }
        
        if os.getenv("WEBSITE_SITE_NAME"):
            environment_info["deployment_type"] = "app_service"
            environment_info["instance_metadata"] = {
                "site_name": os.getenv("WEBSITE_SITE_NAME"),
                "resource_group": os.getenv("WEBSITE_RESOURCE_GROUP"),
                "subscription_id": os.getenv("WEBSITE_OWNER_NAME")
            }
        
        elif os.getenv("CONTAINER_APP_NAME"):
            environment_info["deployment_type"] = "container_instances"
            environment_info["instance_metadata"] = {
                "container_app_name": os.getenv("CONTAINER_APP_NAME"),
                "container_app_revision": os.getenv("CONTAINER_APP_REVISION")
            }
        
        return environment_info
```

### 2. Production Configuration Templates
```bash
#!/bin/bash
# Production environment configuration script
# File: azure-deployment/configure-production.sh

set -e

KEY_VAULT_NAME="$1"
AZURE_TENANT_ID="$2" 
AZURE_CLIENT_ID="$3"
AZURE_CLIENT_SECRET="$4"

if [ -z "$KEY_VAULT_NAME" ] || [ -z "$AZURE_TENANT_ID" ] || [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ]; then
    echo "Usage: $0 <key_vault_name> <tenant_id> <client_id> <client_secret>"
    exit 1
fi

echo "🔧 Configuring production environment secrets..."

# Store Azure OAuth configuration
az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-tenant-id" \
    --value "$AZURE_TENANT_ID"

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-client-id" \
    --value "$AZURE_CLIENT_ID"

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-client-secret" \
    --value "$AZURE_CLIENT_SECRET"

# Generate JWT secret key
JWT_SECRET=$(openssl rand -base64 64)
az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "jwt-secret-key" \
    --value "$JWT_SECRET"

# Store production-specific configuration
az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "environment" \
    --value "production"

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "debug-mode" \
    --value "false"

echo "✅ Production secrets configured successfully!"

# Validate configuration
echo "🔍 Validating Key Vault configuration..."
az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[].name" -o table

echo "📋 Production deployment checklist:"
echo "✅ Key Vault secrets configured"
echo "⏳ Configure Azure AD app registration redirect URIs"
echo "⏳ Deploy container group or App Service"
echo "⏳ Configure custom domain and SSL certificate"
echo "⏳ Set up monitoring and alerting"
```

## Deployment Workflows

### 1. Continuous Deployment Pipeline
```yaml
# Azure DevOps Pipeline for CI/CD
# File: azure-pipelines.yml
trigger:
  branches:
    include:
    - main
  paths:
    include:
    - src/*
    - pyproject.toml
    - Dockerfile

variables:
  containerRegistry: 'mcr.microsoft.com'
  imageRepository: 'mcp-registry-gateway'
  dockerfilePath: '$(Build.SourcesDirectory)/Dockerfile.azure'
  tag: '$(Build.BuildId)'

stages:
- stage: Build
  displayName: 'Build and Test'
  jobs:
  - job: Build
    displayName: 'Build Application'
    pool:
      vmImage: 'ubuntu-latest'
    
    steps:
    - task: UsePythonVersion@0
      inputs:
        versionSpec: '3.11'
        displayName: 'Use Python 3.11'
    
    - script: |
        pip install uv
        uv sync --all-groups
      displayName: 'Install dependencies'
    
    - script: |
        uv run ruff check src/ --fix
        uv run ruff format src/
      displayName: 'Code formatting and linting'
    
    - script: |
        uv run mypy src/
      displayName: 'Type checking'
    
    - script: |
        uv run pytest tests/ --cov=src/ --cov-report=xml
      displayName: 'Run tests'
    
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: '**/test-*.xml'
        testRunTitle: 'Publish test results'
    
    - task: PublishCodeCoverageResults@1
      inputs:
        codeCoverageTool: 'Cobertura'
        summaryFileLocation: 'coverage.xml'

- stage: Deploy
  displayName: 'Deploy to Azure'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: Deploy
    displayName: 'Deploy to Production'
    pool:
      vmImage: 'ubuntu-latest'
    environment: 'production'
    
    strategy:
      runOnce:
        deploy:
          steps:
          - task: Docker@2
            displayName: 'Build and push container image'
            inputs:
              command: 'buildAndPush'
              repository: '$(imageRepository)'
              dockerfile: '$(dockerfilePath)'
              containerRegistry: '$(containerRegistry)'
              tags: |
                $(tag)
                latest
          
          - task: AzureCLI@2
            displayName: 'Deploy to Azure Container Instances'
            inputs:
              azureSubscription: 'azure-service-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Update container group with new image
                az container create \
                  --resource-group $(resourceGroup) \
                  --name mcp-registry-gateway \
                  --yaml azure-deployment/container-group.yml \
                  --environment-variables \
                    DOCKER_IMAGE=$(containerRegistry)/$(imageRepository):$(tag)
          
          - task: AzureCLI@2
            displayName: 'Validate deployment'
            inputs:
              azureSubscription: 'azure-service-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Wait for deployment to be ready
                sleep 60
                
                # Validate FastAPI server
                FASTAPI_URL="http://mcp-registry-gateway-prod.eastus.azurecontainer.io:8000"
                curl -f "$FASTAPI_URL/health" || exit 1
                
                # Validate FastMCP server
                FASTMCP_URL="http://mcp-registry-gateway-prod.eastus.azurecontainer.io:8001"
                curl -f "$FASTMCP_URL/health" || exit 1
                
                echo "✅ Deployment validation successful!"
```

### 2. Blue-Green Deployment Strategy
```python
# Blue-Green deployment automation
# File: azure-deployment/blue_green_deployment.py

import asyncio
import aiohttp
from azure.mgmt.containerinstance import ContainerInstanceManagementClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta
import json

class BlueGreenDeployment:
    """Implements blue-green deployment for MCP Registry Gateway."""
    
    def __init__(self, subscription_id: str, resource_group: str):
        self.subscription_id = subscription_id
        self.resource_group = resource_group
        self.credential = DefaultAzureCredential()
        self.container_client = ContainerInstanceManagementClient(
            self.credential, 
            subscription_id
        )
    
    async def execute_blue_green_deployment(self, new_image_tag: str) -> dict:
        """Execute blue-green deployment with zero downtime."""
        
        deployment_log = {
            "started_at": datetime.utcnow().isoformat(),
            "new_image_tag": new_image_tag,
            "steps": [],
            "rollback_plan": {},
            "success": False
        }
        
        try:
            # Step 1: Deploy green environment
            green_deployment = await self._deploy_green_environment(new_image_tag)
            deployment_log["steps"].append({
                "step": "deploy_green",
                "status": "success",
                "details": green_deployment
            })
            
            # Step 2: Health check green environment
            health_check = await self._validate_green_environment(green_deployment["fqdn"])
            deployment_log["steps"].append({
                "step": "health_check_green",
                "status": "success" if health_check["healthy"] else "failed",
                "details": health_check
            })
            
            if not health_check["healthy"]:
                raise Exception("Green environment health check failed")
            
            # Step 3: Switch traffic to green
            traffic_switch = await self._switch_traffic_to_green(green_deployment)
            deployment_log["steps"].append({
                "step": "switch_traffic",
                "status": "success",
                "details": traffic_switch
            })
            
            # Step 4: Final validation
            final_validation = await self._validate_production_traffic()
            deployment_log["steps"].append({
                "step": "final_validation",
                "status": "success" if final_validation["healthy"] else "failed",
                "details": final_validation
            })
            
            # Step 5: Cleanup blue environment
            if final_validation["healthy"]:
                cleanup = await self._cleanup_blue_environment()
                deployment_log["steps"].append({
                    "step": "cleanup_blue",
                    "status": "success",
                    "details": cleanup
                })
                
                deployment_log["success"] = True
            
        except Exception as e:
            deployment_log["steps"].append({
                "step": "error",
                "status": "failed",
                "error": str(e)
            })
            
            # Execute rollback
            rollback = await self._execute_rollback()
            deployment_log["rollback_executed"] = rollback
        
        deployment_log["completed_at"] = datetime.utcnow().isoformat()
        return deployment_log
    
    async def _deploy_green_environment(self, image_tag: str) -> dict:
        """Deploy green environment with new image."""
        green_name = f"mcp-registry-gateway-green-{image_tag}"
        
        # Load container group template
        with open("azure-deployment/container-group.yml", "r") as f:
            container_template = f.read()
        
        # Update with green-specific configuration
        green_config = container_template.replace(
            "name: mcp-registry-gateway",
            f"name: {green_name}"
        ).replace(
            "dnsNameLabel: mcp-registry-gateway-prod",
            f"dnsNameLabel: {green_name}"
        ).replace(
            "image: mcr.microsoft.com/mcp-registry-gateway:latest",
            f"image: mcr.microsoft.com/mcp-registry-gateway:{image_tag}"
        )
        
        # Deploy green environment
        # Implementation would use Azure SDK to create container group
        
        return {
            "green_name": green_name,
            "fqdn": f"{green_name}.eastus.azurecontainer.io",
            "image_tag": image_tag,
            "deployment_time": datetime.utcnow().isoformat()
        }
    
    async def _validate_green_environment(self, green_fqdn: str) -> dict:
        """Validate green environment health and functionality."""
        validation_results = {
            "healthy": True,
            "checks": {}
        }
        
        async with aiohttp.ClientSession() as session:
            # Check FastAPI server health
            try:
                async with session.get(f"http://{green_fqdn}:8000/health", timeout=30) as response:
                    if response.status == 200:
                        health_data = await response.json()
                        validation_results["checks"]["fastapi_health"] = {
                            "status": "healthy",
                            "response_time_ms": 0,  # Would measure actual time
                            "details": health_data
                        }
                    else:
                        validation_results["healthy"] = False
                        validation_results["checks"]["fastapi_health"] = {
                            "status": "unhealthy",
                            "status_code": response.status
                        }
            except Exception as e:
                validation_results["healthy"] = False
                validation_results["checks"]["fastapi_health"] = {
                    "status": "error",
                    "error": str(e)
                }
            
            # Check FastMCP server health
            try:
                async with session.get(f"http://{green_fqdn}:8001/health", timeout=30) as response:
                    if response.status == 200:
                        validation_results["checks"]["fastmcp_health"] = {
                            "status": "healthy",
                            "response_time_ms": 0
                        }
                    else:
                        validation_results["healthy"] = False
                        validation_results["checks"]["fastmcp_health"] = {
                            "status": "unhealthy",
                            "status_code": response.status
                        }
            except Exception as e:
                validation_results["healthy"] = False
                validation_results["checks"]["fastmcp_health"] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return validation_results
```

## Monitoring & Observability

### 1. Azure Monitor Integration
```python
# Azure Application Insights integration
# File: src/mcp_registry_gateway/monitoring/azure_monitor.py

from opencensus.ext.azure.log_exporter import AzureLogHandler
from opencensus.ext.azure.trace_exporter import AzureExporter
from opencensus.trace.samplers import ProbabilitySampler
from opencensus.trace.tracer import Tracer
from opencensus.trace import config_integration
import logging
import os

class AzureMonitoringSetup:
    """Configure Azure Application Insights monitoring."""
    
    @staticmethod
    def setup_logging():
        """Setup Azure Application Insights logging."""
        connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        
        if connection_string:
            # Configure Azure log handler
            azure_handler = AzureLogHandler(
                connection_string=connection_string
            )
            azure_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            
            # Add to root logger
            logging.getLogger().addHandler(azure_handler)
            logging.getLogger().setLevel(logging.INFO)
            
            # Configure FastMCP-specific logger
            fastmcp_logger = logging.getLogger("fastmcp")
            fastmcp_logger.addHandler(azure_handler)
            fastmcp_logger.setLevel(logging.INFO)
    
    @staticmethod
    def setup_tracing():
        """Setup Azure Application Insights distributed tracing."""
        connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        
        if connection_string:
            # Configure integrations
            config_integration.trace_integrations(['httplib', 'requests', 'aiohttp'])
            
            # Setup tracer
            tracer = Tracer(
                exporter=AzureExporter(connection_string=connection_string),
                sampler=ProbabilitySampler(1.0)  # 100% sampling for production monitoring
            )
            
            return tracer
        
        return None

# Custom metrics for MCP Registry Gateway
class MCPMetrics:
    """Custom metrics for MCP operations."""
    
    def __init__(self):
        self.tracer = AzureMonitoringSetup.setup_tracing()
    
    def track_mcp_request(self, method: str, execution_time_ms: float, success: bool):
        """Track MCP request metrics."""
        if self.tracer:
            with self.tracer.span(name=f"mcp_request_{method}"):
                # Custom telemetry
                self.tracer.add_attribute_to_current_span("mcp.method", method)
                self.tracer.add_attribute_to_current_span("mcp.execution_time_ms", execution_time_ms)
                self.tracer.add_attribute_to_current_span("mcp.success", success)
    
    def track_oauth_flow(self, flow_step: str, user_id: str, success: bool):
        """Track OAuth authentication flow."""
        if self.tracer:
            with self.tracer.span(name=f"oauth_{flow_step}"):
                self.tracer.add_attribute_to_current_span("oauth.step", flow_step)
                self.tracer.add_attribute_to_current_span("oauth.user_id", user_id)
                self.tracer.add_attribute_to_current_span("oauth.success", success)
```

### 2. Health Check Endpoints for Load Balancers
```python
# Enhanced health checks for Azure deployment
# File: src/mcp_registry_gateway/api/health.py

from fastapi import APIRouter, Depends
from src.mcp_registry_gateway.services.registry import RegistryService
from src.mcp_registry_gateway.db.database import DatabaseManager
from src.mcp_registry_gateway.config.azure_config import AzureEnvironmentManager
import redis.asyncio as redis
from datetime import datetime
import asyncio

router = APIRouter()

class AzureHealthCheck:
    """Enhanced health checks for Azure deployment scenarios."""
    
    @staticmethod
    async def deep_health_check() -> dict:
        """Comprehensive health check for Azure load balancers."""
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": AzureEnvironmentManager.detect_azure_environment(),
            "components": {},
            "azure_specific": {}
        }
        
        # Database health
        try:
            db_manager = DatabaseManager()
            async with db_manager.get_session() as session:
                await session.execute("SELECT 1")
                health_status["components"]["database"] = {
                    "status": "healthy",
                    "response_time_ms": 0  # Would measure actual time
                }
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["components"]["database"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Redis health
        try:
            redis_client = redis.from_url(os.getenv("MREG_REDIS_URL"))
            await redis_client.ping()
            await redis_client.close()
            health_status["components"]["redis"] = {"status": "healthy"}
        except Exception as e:
            health_status["status"] = "degraded"  # Redis not critical for basic operation
            health_status["components"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # Azure-specific checks
        if health_status["environment"]["is_azure"]:
            # Check Azure Key Vault connectivity (if configured)
            key_vault_url = os.getenv("AZURE_KEY_VAULT_URL")
            if key_vault_url:
                try:
                    from azure.keyvault.secrets import SecretClient
                    from azure.identity import DefaultAzureCredential
                    
                    client = SecretClient(key_vault_url, DefaultAzureCredential())
                    # Try to list secrets (no secrets returned, just connectivity test)
                    list(client.list_properties_of_secrets(max_results=1))
                    
                    health_status["azure_specific"]["key_vault"] = {"status": "healthy"}
                except Exception as e:
                    health_status["azure_specific"]["key_vault"] = {
                        "status": "unhealthy",
                        "error": str(e)
                    }
        
        return health_status

@router.get("/health")
async def health_check():
    """Basic health check for load balancer probes."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/deep")
async def deep_health_check():
    """Deep health check for monitoring systems."""
    return await AzureHealthCheck.deep_health_check()

@router.get("/health/ready")
async def readiness_check():
    """Kubernetes-style readiness probe."""
    health = await AzureHealthCheck.deep_health_check()
    
    if health["status"] != "healthy":
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {"ready": True}

@router.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe."""
    # Simple check - if the application is running, it's live
    return {"live": True, "timestamp": datetime.utcnow().isoformat()}
```

This deployment specialist provides comprehensive Azure deployment capabilities for the MCP Registry Gateway, including container orchestration, infrastructure automation, security management, and production monitoring integration.