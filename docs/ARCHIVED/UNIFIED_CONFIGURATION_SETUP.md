# Unified Configuration Setup Guide

This guide explains how to set up the MCP Registry Gateway's unified configuration system that serves both backend and frontend applications from a single `.env` file.

---

## 🎯 **Overview**

The MCP Registry Gateway has transitioned from separate backend and frontend configuration files to a **unified configuration system** that:

- **Eliminates duplication** between backend (`/.env`) and frontend (`/frontend/.env`)
- **Provides single source of truth** for all configuration
- **Uses environment variable referencing** to share values between backend and frontend
- **Maintains clear separation** with structured prefixes (`MREG_`, `VITE_`, `DB_`, etc.)

---

## 🚀 **Quick Setup**

### **1. Initialize Configuration**
```bash
# Copy the unified template
cp .env.example .env

# Edit configuration values
nano .env  # or your preferred editor
```

### **2. Configure Essential Values**
At minimum, you need to set:

```bash
# Azure OAuth (required for authentication)
MREG_AZURE_CLIENT_ID=your-azure-client-id
MREG_AZURE_TENANT_ID=your-azure-tenant-id  
MREG_AZURE_CLIENT_SECRET=your-azure-client-secret

# Database (if not using defaults)
DB_POSTGRES_PASSWORD=your-secure-password
```

### **3. Validate Configuration**
```bash
# Validate all configuration
uv run mcp-gateway validate

# Check specific configuration
uv run mcp-gateway config
```

---

## 📁 **File Structure**

### **Main Configuration (Project Root)**
```
/.env.example          # ✅ Unified template with all configuration
/.env                  # ✅ Your actual configuration (create from template)
```

### **Frontend Configuration**
```
/frontend/.env.example # ✅ Minimal file with setup instructions
/frontend/.env         # ❌ No longer needed (use main /.env)
```

---

## 🔗 **Configuration Referencing**

The unified system uses environment variable referencing to eliminate duplication:

### **Example: Azure OAuth Configuration**

**In main `.env` file:**
```bash
# Backend Azure configuration (source of truth)
MREG_AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789012
MREG_AZURE_TENANT_ID=87654321-4321-4321-4321-210987654321
MREG_AZURE_CLIENT_SECRET=your-secret-value

# Frontend automatically references these values
VITE_AZURE_CLIENT_ID=${MREG_AZURE_CLIENT_ID}      # ← References MREG_AZURE_CLIENT_ID
VITE_AZURE_TENANT_ID=${MREG_AZURE_TENANT_ID}      # ← References MREG_AZURE_TENANT_ID
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Result**: Frontend gets the same values as backend with no duplication.

### **Example: API Endpoints**

```bash
# Backend configuration
APP_VERSION="0.1.0"
DOCS_URL=/docs
ENVIRONMENT=development

# Frontend automatically gets derived values
VITE_API_BASE_URL=http://localhost:8000          # Static frontend endpoint
VITE_API_VERSION=${APP_VERSION}                  # ← References backend version
VITE_API_DOCS_URL=${DOCS_URL}                    # ← References backend docs URL
VITE_ENVIRONMENT=${ENVIRONMENT}                  # ← References backend environment
```

---

## ⚙️ **Configuration Categories**

### **Backend Configuration**

| Prefix | Purpose | Example Variables |
|--------|---------|-------------------|
| `APP_*` | Main application | `APP_NAME`, `APP_VERSION` |
| `DB_*` | Database settings | `DB_POSTGRES_HOST`, `DB_REDIS_URL` |
| `SECURITY_*` | Auth & security | `SECURITY_JWT_SECRET_KEY`, `SECURITY_CORS_ORIGINS` |
| `SERVICE_*` | Service config | `SERVICE_PORT`, `SERVICE_HOST` |
| `MONITORING_*` | Observability | `MONITORING_LOG_LEVEL`, `MONITORING_ENABLE_METRICS` |
| `MREG_*` | FastMCP settings | `MREG_AZURE_CLIENT_ID`, `MREG_FASTMCP_ENABLED` |

### **Frontend Configuration**

| Variable | Purpose | Source |
|----------|---------|--------|
| `VITE_API_BASE_URL` | Backend API endpoint | Static value |
| `VITE_AZURE_CLIENT_ID` | Azure OAuth client | References `MREG_AZURE_CLIENT_ID` |
| `VITE_AZURE_TENANT_ID` | Azure OAuth tenant | References `MREG_AZURE_TENANT_ID` |
| `VITE_API_VERSION` | API version display | References `APP_VERSION` |
| `VITE_ENVIRONMENT` | Environment display | References `ENVIRONMENT` |

---

## 🛠️ **Development Workflow**

### **Traditional Workflow (Old)**
```bash
# Had to maintain two files
cp .env.example .env                          # Backend config
cp frontend/.env.example frontend/.env       # Frontend config

# Had to keep values synchronized manually
# Risk of mismatched OAuth settings
# Duplication of Azure configuration
```

### **Unified Workflow (New)**
```bash
# Single file to maintain
cp .env.example .env

# Configure once, works everywhere
# No duplication or synchronization issues
# Automatic validation across both applications
```

---

## 🔍 **Configuration Validation**

### **Built-in Validation**
```bash
# Comprehensive validation
uv run mcp-gateway validate

# Show current configuration
uv run mcp-gateway config

# Validate specific settings class
python -c "from src.mcp_registry_gateway.core.config import get_settings; print(get_settings())"
```

### **Validation Checks**
- **Azure OAuth configuration** completeness
- **Database connection** settings validity
- **Environment consistency** between backend/frontend
- **Required variables** presence
- **Value format** validation (URLs, ports, etc.)

---

## 🚨 **Migration from Separate Files**

If you have existing separate configuration files:

### **1. Backup Current Configuration**
```bash
# Backup existing files
cp .env .env.backup
cp frontend/.env frontend/.env.backup
```

### **2. Use Migration Helper**
```bash
# Extract values from existing files
echo "# Migrated Configuration" > .env.migrated

# Merge backend values
grep -E '^[A-Z_]+=' .env >> .env.migrated

# Add frontend values with VITE_ prefix
grep -E '^VITE_' frontend/.env >> .env.migrated
```

### **3. Apply Unified Template**
```bash
# Use the new unified template
cp .env.example .env

# Merge your values with the template structure
# (Manual process - match your values to new prefix structure)
```

---

## 🎨 **Customization Options**

### **Frontend-Specific Overrides**
If you need frontend-specific values, you can still create `/frontend/.env`:

```bash
# Override API endpoint for frontend development
VITE_API_BASE_URL=http://localhost:8080

# Override feature flags for testing
VITE_ENABLE_ADMIN_FEATURES=false
```

### **Environment-Specific Configuration**
```bash
# Production overrides
cp .env .env.production
# Modify production-specific values

# Staging overrides  
cp .env .env.staging
# Modify staging-specific values
```

---

## ✅ **Validation Checklist**

Before running the application, ensure:

- [ ] **Main `.env` file exists** (copied from `.env.example`)
- [ ] **Azure OAuth configured** (`MREG_AZURE_*` values set)
- [ ] **Database passwords set** (not using defaults in production)
- [ ] **Configuration validates** (`uv run mcp-gateway validate` passes)
- [ ] **Frontend references work** (VITE_* variables populated correctly)
- [ ] **API endpoints match** (frontend pointing to correct backend)

---

## 🔧 **Troubleshooting**

### **Frontend Not Loading Configuration**
```bash
# Check if VITE_ variables are accessible
npm run dev --debug

# Verify environment variable expansion
echo $VITE_AZURE_CLIENT_ID
```

### **Azure OAuth Mismatch**
```bash
# Verify backend and frontend have same values
grep AZURE .env
# Should show MREG_AZURE_* and VITE_AZURE_* with matching values
```

### **Configuration Validation Errors**
```bash
# Run comprehensive validation
uv run mcp-gateway validate

# Check specific settings class
python -c "
from src.mcp_registry_gateway.core.config import FastMCPSettings
print(FastMCPSettings().model_dump())
"
```

---

## 📚 **Related Documentation**

- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Comprehensive configuration reference
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Initial project setup instructions  
- **[Azure App Registration Guide](AZURE_APP_REGISTRATION_GUIDE.md)** - Azure OAuth setup
- **[Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)** - Common configuration issues

---

**Status**: Production Ready ✅  
**Last Updated**: 2025-01-11  
**Benefits**: Single source of truth, no duplication, consistent Azure OAuth, developer-friendly maintenance