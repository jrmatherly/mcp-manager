# Troubleshooting Guide - MCP Registry Gateway

This document provides comprehensive troubleshooting guidance with AI agent support for the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🚑 **Troubleshooting with Agent Support**

**🤖 Primary Agent**: MCP Debugger (coordinates with other specialists as needed)

### **Common Issues**

**Database Connection Errors**
**🤖 Agents**: MCP Debugger → Performance Optimizer

```bash
# Check PostgreSQL status
docker-compose ps postgres
docker-compose logs postgres

# Test connection
psql -h localhost -U mcp_user -d mcp_registry

# Reinitialize database
uv run mcp-gateway init-db
```

**🎯 Agent Assistance**:
- **MCP Debugger**: Connection diagnostics, error trace analysis
- **Performance Optimizer**: Connection pool optimization, database performance analysis

**Redis Connection Issues**
**🤖 Agents**: MCP Debugger → Performance Optimizer

```bash
# Check Redis status
docker-compose ps redis
docker-compose logs redis

# Test connection
redis-cli ping
```

**🎯 Agent Assistance**:
- **MCP Debugger**: Redis connectivity diagnostics, cache validation
- **Performance Optimizer**: Redis optimization, caching strategy analysis

**Import/Dependency Errors**
**🤖 Agents**: MCP Debugger → FastMCP Specialist

```bash
# Clean and reinstall
uv sync --reinstall
uv tool install ruff --force  # Reinstall global tools
uv tool install mypy --force
```

**🎯 Agent Assistance**:
- **MCP Debugger**: Dependency conflict analysis, import path debugging
- **FastMCP Specialist**: FastMCP dependency validation, version compatibility

**Environment Variable Issues**
**🤖 Agents**: Security Auditor → MCP Debugger → Deployment Specialist

```bash
# Check current configuration
uv run mcp-gateway config

# Validate environment file
cat .env | grep -E '^MREG_'

# Show secrets (development only)
uv run mcp-gateway config --show-secrets
```

**🎯 Agent Assistance**:
- **Security Auditor**: Azure OAuth configuration validation, secret management
- **MCP Debugger**: Configuration validation, environment troubleshooting
- **Deployment Specialist**: Environment-specific configuration, Azure setup

### **Development Debug Mode**
```bash
# Start with debug logging
uv run mcp-gateway serve --log-level debug --reload

# Check health with verbose output
uv run mcp-gateway healthcheck --timeout 10

# View all configuration
uv run mcp-gateway config --show-secrets
```

## 🔍 **Diagnostic Procedures**

### **System Health Assessment**

#### **Quick Health Check**
```bash
# Basic system health
uv run mcp-gateway healthcheck

# Extended health check with timeout
uv run mcp-gateway healthcheck --timeout 30

# Configuration validation
uv run mcp-gateway validate
```

#### **Component-Specific Diagnostics**

**Database Diagnostics**
```bash
# PostgreSQL connection test
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT version();"

# Check database tables
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "\dt"

# Check current connections
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check database size
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

**Redis Diagnostics**
```bash
# Redis connection test
redis-cli -u $MREG_REDIS_URL ping

# Check Redis info
redis-cli -u $MREG_REDIS_URL info

# Check memory usage
redis-cli -u $MREG_REDIS_URL info memory

# List all keys (development only)
redis-cli -u $MREG_REDIS_URL keys "*"
```

**Service Diagnostics**
```bash
# Check FastAPI server
curl -X GET http://localhost:8000/health

# Check FastMCP server
curl -X GET http://localhost:8001/health

# Check API endpoints
curl -X GET http://localhost:8000/api/v1/servers

# Check metrics endpoint
curl -X GET http://localhost:8000/metrics
```

### **Log Analysis**

#### **Application Logs**
```bash
# View application logs with debug level
MREG_LOG_LEVEL=DEBUG uv run mcp-gateway serve

# Filter logs by component
uv run mcp-gateway serve 2>&1 | grep "database"
uv run mcp-gateway serve 2>&1 | grep "auth"
uv run mcp-gateway serve 2>&1 | grep "proxy"

# Save logs to file for analysis
uv run mcp-gateway serve > gateway.log 2>&1 &
tail -f gateway.log
```

#### **Docker Container Logs**
```bash
# PostgreSQL logs
docker-compose logs postgres
docker-compose logs postgres --tail 100
docker-compose logs postgres -f  # Follow logs

# Redis logs
docker-compose logs redis
docker-compose logs redis --tail 50

# All services logs
docker-compose logs
docker-compose logs -f  # Follow all logs
```

#### **Log Analysis Commands**
```bash
# Count error occurrences
grep -c "ERROR" gateway.log

# Find specific error patterns
grep -i "connection" gateway.log
grep -i "timeout" gateway.log
grep -i "authentication" gateway.log

# Extract error traces
grep -A 10 "Exception" gateway.log
grep -A 5 "ERROR" gateway.log

# Time-based log analysis
grep "2025-01-10 12:" gateway.log  # Specific hour
grep "ERROR" gateway.log | tail -20  # Recent errors
```

## 🚑 **Common Problem Solutions**

### **Database Issues**

#### **Connection Pool Exhausted**
**Symptoms**: "Connection pool exhausted" errors, slow database responses

**Diagnosis**:
```bash
# Check current connections
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check long-running queries
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

**Solutions**:
```bash
# Increase connection pool size
export MREG_POSTGRES_MAX_CONNECTIONS=50

# Reduce connection timeout
export MREG_POSTGRES_POOL_TIMEOUT=10

# Restart with new settings
uv run mcp-gateway serve
```

#### **Database Migration Issues**
**Symptoms**: Schema errors, missing tables, migration failures

**Diagnosis**:
```bash
# Check current migration status
uv run alembic current

# Check migration history
uv run alembic history

# Check for pending migrations
uv run alembic heads
```

**Solutions**:
```bash
# Apply pending migrations
uv run alembic upgrade head

# Rollback problematic migration
uv run alembic downgrade -1

# Reinitialize database (development only)
uv run mcp-gateway init-db --force
```

#### **Query Performance Issues**
**Symptoms**: Slow response times, high CPU usage, timeout errors

**Diagnosis**:
```bash
# Enable query logging
export MREG_POSTGRES_ECHO=true

# Check slow queries
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions**:
```bash
# Apply database optimizations
uv run mcp-gateway optimize-db

# Add missing indexes
uv run mcp-gateway optimize-db --indexes-only

# Analyze query plans
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "EXPLAIN ANALYZE SELECT * FROM mcp_servers WHERE status = 'active';"
```

### **Authentication Issues**

#### **Azure OAuth Configuration**
**Symptoms**: OAuth login failures, redirect errors, token validation failures

**Diagnosis**:
```bash
# Check Azure OAuth configuration
echo "Tenant ID: $MREG_AZURE_TENANT_ID"
echo "Client ID: $MREG_AZURE_CLIENT_ID"
echo "Callback URL: $MREG_FASTMCP_OAUTH_CALLBACK_URL"

# Test Azure endpoints
curl -I "https://login.microsoftonline.com/$MREG_AZURE_TENANT_ID/oauth2/v2.0/authorize"

# Check network connectivity
nslookup login.microsoftonline.com
```

**Solutions**:
```bash
# Verify Azure app registration
# 1. Check redirect URIs in Azure portal
# 2. Verify client secret expiration
# 3. Check API permissions

# Update callback URL for development
export MREG_FASTMCP_OAUTH_CALLBACK_URL="http://localhost:8001/oauth/callback"

# Test with different scopes
export MREG_FASTMCP_OAUTH_SCOPES="User.Read,openid,profile"

# Enable detailed OAuth logging
export MREG_DEBUG=true
export MREG_LOG_LEVEL=DEBUG
```

#### **JWT Token Issues**
**Symptoms**: Token validation errors, authentication failures, expired tokens

**Diagnosis**:
```bash
# Check JWT configuration
echo "JWT Secret: ${MREG_SECURITY_JWT_SECRET_KEY:0:10}..."  # Show first 10 chars
echo "JWT Algorithm: $MREG_SECURITY_JWT_ALGORITHM"
echo "JWT Expiry: $MREG_SECURITY_JWT_EXPIRY"

# Decode JWT token (for debugging)
# Use online JWT debugger or jwt-cli tool
```

**Solutions**:
```bash
# Generate new JWT secret
export MREG_SECURITY_JWT_SECRET_KEY=$(openssl rand -base64 32)

# Increase token expiry (development)
export MREG_SECURITY_JWT_EXPIRY=7200  # 2 hours

# Clear token cache
redis-cli -u $MREG_REDIS_URL flushdb
```

### **Performance Issues**

#### **High Memory Usage**
**Symptoms**: Out of memory errors, slow performance, system freezing

**Diagnosis**:
```bash
# Check memory usage
ps aux | grep python | grep mcp-gateway
top -p $(pgrep -f mcp-gateway)

# Check system memory
free -h
df -h

# Monitor memory over time
while true; do ps aux | grep mcp-gateway | grep -v grep; sleep 5; done
```

**Solutions**:
```bash
# Reduce connection pools
export MREG_POSTGRES_MAX_CONNECTIONS=10
export MREG_REDIS_MAX_CONNECTIONS=10

# Disable memory-intensive features
export MREG_METRICS_ENABLED=false
export MREG_FASTMCP_ENABLE_AUDIT_LOGGING=false

# Restart with memory limits
docker run --memory=512m mcp-gateway
```

#### **High CPU Usage**
**Symptoms**: 100% CPU usage, slow response times, system lag

**Diagnosis**:
```bash
# Check CPU usage
top -p $(pgrep -f mcp-gateway)
htop  # Better interface if available

# Profile application
python -m cProfile -o profile.stats -m mcp_registry_gateway.cli serve

# Check for infinite loops in logs
grep -i "loop\|infinite\|recursion" gateway.log
```

**Solutions**:
```bash
# Reduce worker processes
export MREG_SERVICE_WORKERS=1

# Increase timeouts to reduce retries
export MREG_HEALTH_CHECK_TIMEOUT=30
export MREG_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=120

# Disable CPU-intensive features
export MREG_CIRCUIT_BREAKER_ENABLED=false
export MREG_HEALTH_CHECK_INTERVAL=300  # 5 minutes
```

### **Network and Connectivity Issues**

#### **Port Conflicts**
**Symptoms**: "Address already in use" errors, connection refused

**Diagnosis**:
```bash
# Check port usage
lsof -i :8000  # FastAPI port
lsof -i :8001  # FastMCP port
lsof -i :5432  # PostgreSQL port
lsof -i :6379  # Redis port

# Check all listening ports
netstat -tulpn | grep LISTEN
```

**Solutions**:
```bash
# Use alternative ports
export MREG_SERVICE_PORT=8080
export MREG_FASTMCP_PORT=8081

# Kill processes using ports
sudo kill -9 $(lsof -t -i:8000)
sudo kill -9 $(lsof -t -i:8001)

# Start with specific port
uv run mcp-gateway serve --port 8080
```

#### **DNS Resolution Issues**
**Symptoms**: Host not found errors, timeout connecting to external services

**Diagnosis**:
```bash
# Test DNS resolution
nslookup localhost
nslookup login.microsoftonline.com
nslookup your-postgres-host.com

# Check network connectivity
ping localhost
ping google.com

# Test specific ports
telnet localhost 5432  # PostgreSQL
telnet localhost 6379  # Redis
```

**Solutions**:
```bash
# Use IP addresses instead of hostnames
export MREG_POSTGRES_HOST=127.0.0.1
export MREG_REDIS_URL=redis://127.0.0.1:6379/0

# Add to /etc/hosts if needed
echo "127.0.0.1 postgres" | sudo tee -a /etc/hosts

# Check firewall settings
sudo ufw status
sudo iptables -L
```

## 🔧 **Development-Specific Issues**

### **Code Quality Issues**

#### **Linting Errors**
**Symptoms**: Ruff or MyPy errors, CI/CD failures

**Diagnosis**:
```bash
# Run linting tools
./scripts/lint.sh
uv tool run ruff check src/
uv tool run mypy src/

# Check specific files
uv tool run ruff check src/mcp_registry_gateway/api/main.py
uv tool run mypy src/mcp_registry_gateway/services/
```

**Solutions**:
```bash
# Auto-fix formatting issues
./scripts/format.sh
uv tool run ruff format src/
uv tool run ruff check src/ --fix

# Update type hints
# Add missing type annotations
# Fix import order

# Ignore specific warnings (temporary)
# Add # type: ignore comments
# Update pyproject.toml ignore list
```

#### **Test Failures**
**Symptoms**: Pytest failures, coverage issues, integration test problems

**Diagnosis**:
```bash
# Run tests with verbose output
./scripts/test.sh
uv run pytest tests/ -v
uv run pytest tests/ -x  # Stop on first failure

# Run specific tests
uv run pytest tests/unit/test_config.py -v
uv run pytest tests/ -k "test_server_registration"

# Check test coverage
uv run pytest --cov=src/mcp_registry_gateway --cov-report=html
```

**Solutions**:
```bash
# Fix test database setup
export MREG_POSTGRES_DB=mcp_registry_test
./tests/setup_test_db.sh

# Clear test cache
rm -rf .pytest_cache/
rm -rf __pycache__/

# Update test fixtures
# Fix mock configurations
# Update test data
```

### **Docker and Container Issues**

#### **Container Startup Failures**
**Symptoms**: Container exits immediately, health check failures

**Diagnosis**:
```bash
# Check container status
docker-compose ps
docker-compose logs

# Check specific service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs mcp-gateway

# Check container health
docker-compose exec postgres pg_isready
docker-compose exec redis redis-cli ping
```

**Solutions**:
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check volume permissions
ls -la docker-volumes/
sudo chown -R $(id -u):$(id -g) docker-volumes/

# Reset Docker environment
docker system prune -a
docker volume prune
```

#### **Volume Mount Issues**
**Symptoms**: Permission denied, file not found, read-only filesystem

**Diagnosis**:
```bash
# Check volume mounts
docker-compose config
docker inspect $(docker-compose ps -q postgres)

# Check permissions
ls -la ./data/postgres/
ls -la ./data/redis/
```

**Solutions**:
```bash
# Fix permissions
sudo chown -R 999:999 ./data/postgres/  # PostgreSQL user
sudo chown -R 999:999 ./data/redis/     # Redis user

# Use Docker-managed volumes
# Update docker-compose.yml to use named volumes
# Remove local volume mounts
```

## 🛡️ **Emergency Procedures**

### **System Recovery**

#### **Complete System Reset**
```bash
# Stop all services
docker-compose down
killall python  # Kill any running Python processes

# Clean up data (development only)
sudo rm -rf ./data/
rm -f *.log
rm -rf __pycache__/
rm -rf .pytest_cache/

# Reinitialize
./scripts/setup.sh
uv run mcp-gateway init-db
uv run mcp-gateway validate
```

#### **Database Recovery**
```bash
# Backup current database (if possible)
pg_dump -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER $MREG_POSTGRES_DB > backup.sql

# Drop and recreate database
psql -h $MREG_POSTGRES_HOST -U postgres -c "DROP DATABASE IF EXISTS $MREG_POSTGRES_DB;"
psql -h $MREG_POSTGRES_HOST -U postgres -c "CREATE DATABASE $MREG_POSTGRES_DB;"

# Restore from backup or reinitialize
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER $MREG_POSTGRES_DB < backup.sql
# OR
uv run mcp-gateway init-db
```

#### **Cache Recovery**
```bash
# Clear Redis cache
redis-cli -u $MREG_REDIS_URL flushall

# Restart Redis
docker-compose restart redis

# Verify cache is working
redis-cli -u $MREG_REDIS_URL ping
```

### **Performance Emergency**

#### **High Load Mitigation**
```bash
# Reduce resource usage immediately
export MREG_SERVICE_WORKERS=1
export MREG_POSTGRES_MAX_CONNECTIONS=5
export MREG_REDIS_MAX_CONNECTIONS=5
export MREG_HEALTH_CHECK_INTERVAL=300
export MREG_CIRCUIT_BREAKER_ENABLED=false
export MREG_METRICS_ENABLED=false

# Restart with reduced resources
uv run mcp-gateway serve
```

#### **Memory Leak Mitigation**
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep mcp-gateway | grep -v grep'

# Set memory limits
ulimit -v 1048576  # 1GB virtual memory limit

# Restart periodically (temporary solution)
while true; do
  timeout 3600 uv run mcp-gateway serve  # Restart every hour
  sleep 5
done
```

---

## 📖 **Related Documentation**

- **[Development Setup](DEVELOPMENT_SETUP.md)** - Environment setup and configuration
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Environment variables and settings
- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Development and debugging procedures
- **[Testing Guide](TESTING_GUIDE.md)** - Testing and validation procedures
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)