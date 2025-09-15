# Azure App Registration Configuration Guide

**Created**: September 10, 2025  
**Purpose**: Complete guide for configuring Azure App Registration for FastMCP OAuth authentication  
**Scope**: Azure AD setup, permissions, and environment configuration  
**FastMCP References**: [Azure Integrations](../fastmcp_docs/integrations/azure.mdx), [Server-Side OAuth Proxy](../fastmcp_docs/servers/auth/oauth-proxy.mdx)  

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step-by-Step Azure Portal Configuration](#step-by-step-azure-portal-configuration)
3. [Environment Configuration](#environment-configuration)
4. [Testing and Validation](#testing-and-validation)
5. [Troubleshooting](#troubleshooting)
6. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### Required Access
- Azure AD tenant administrator or Application Developer role
- Access to Azure Portal (https://portal.azure.com)
- Ability to create App Registrations in your Azure AD tenant

### Required Information
- Your Azure AD Tenant ID
- Deployment URLs for OAuth callbacks
- User groups for role assignment (optional)

---

## Step-by-Step Azure Portal Configuration

### Step 1: Create New App Registration

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Azure AD administrator account

2. **Access App Registrations**
   - In the search bar, type "App registrations"
   - Select "App registrations" from the services list
   - Click "New registration" button

3. **Configure Basic Settings**
   ```
   Name: MCP Registry Gateway
   Supported account types: Single tenant (this organization only)
   Redirect URI: 
     - Platform: Web
     - URL: http://localhost:8001/oauth/callback (for development)
   ```
   - Click "Register"

4. **Save Important Values**
   After registration, you'll see the overview page. Copy these values:
   - **Application (client) ID**: This is your `MREG_AZURE_CLIENT_ID`
   - **Directory (tenant) ID**: This is your `MREG_AZURE_TENANT_ID`

### Step 2: Configure Authentication

1. **Navigate to Authentication**
   - In the left sidebar, click "Authentication"
   
2. **Add Platform Configuration**
   - Click "Add a platform" if not already configured
   - Select "Web"
   - Add redirect URIs:
     ```
     Development:
     http://localhost:8001/oauth/callback
     
     Production (add your actual domain):
     https://your-domain.com/oauth/callback
     https://your-gateway.azurewebsites.net/oauth/callback
     ```

3. **Configure Additional Settings**
   - ✅ Enable "Access tokens" (used for implicit flows)
   - ✅ Enable "ID tokens" (used for OpenID Connect)
   - Front-channel logout URL: (optional, leave blank for now)
   - Logout URL: (optional, leave blank for now)
   - Click "Save"

### Step 3: Create Client Secret

1. **Navigate to Certificates & Secrets**
   - In the left sidebar, click "Certificates & secrets"
   
2. **Create New Client Secret**
   - Click "New client secret"
   - Description: `MCP Gateway Production Secret`
   - Expires: Choose appropriate expiration (recommended: 24 months)
   - Click "Add"
   
3. **Copy Secret Value**
   - **IMPORTANT**: Copy the secret value immediately
   - This is your `MREG_AZURE_CLIENT_SECRET`
   - **WARNING**: You cannot view this secret again after leaving this page

### Step 4: Configure API Permissions

1. **Navigate to API Permissions**
   - In the left sidebar, click "API permissions"
   
2. **Add Required Permissions**
   Click "Add a permission" and add the following:
   
   **Microsoft Graph - Delegated Permissions:**
   - `User.Read` - Sign in and read user profile
   - `profile` - View users' basic profile
   - `email` - View users' email address
   - `openid` - Sign users in
   - `offline_access` - Maintain access to data (optional, for refresh tokens)
   
3. **Grant Admin Consent** (if required)
   - If you see "Admin consent required" = Yes for any permission
   - Click "Grant admin consent for [Your Organization]"
   - Confirm the action

### Step 5: Configure Token Settings (Optional but Recommended)

1. **Navigate to Token Configuration**
   - In the left sidebar, click "Token configuration"
   
2. **Add Optional Claims**
   Add these claims to the ID token:
   - `email`
   - `family_name`
   - `given_name`
   - `preferred_username`
   
3. **Add Group Claims** (for role-based access)
   - Click "Add groups claim"
   - Select "Security groups"
   - In ID, Access, and SAML tokens

### Step 6: Configure App Roles (for RBAC)

1. **Navigate to App Roles**
   - In the left sidebar, click "App roles"
   
2. **Create Admin Role**
   - Click "Create app role"
   - Display name: `Admin`
   - Members: Users/Groups
   - Value: `admin`
   - Description: `Administrator access to MCP Gateway`
   - Enable this app role: ✅
   
3. **Create User Role**
   - Click "Create app role"
   - Display name: `User`
   - Members: Users/Groups
   - Value: `user`
   - Description: `Standard user access to MCP Gateway`
   - Enable this app role: ✅

### Step 7: Assign Users and Groups

1. **Navigate to Enterprise Applications**
   - Search for your app: "MCP Registry Gateway"
   - Click on your application
   
2. **Assign Users and Groups**
   - Click "Users and groups" in the left sidebar
   - Click "Add user/group"
   - Select users or groups
   - Assign appropriate roles (Admin or User)
   - Click "Assign"

---

## Environment Configuration

### Development Environment (.env)

```bash
# Azure OAuth Configuration
MREG_AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MREG_AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
MREG_AZURE_CLIENT_SECRET=your-client-secret-value-here

# OAuth Callback URLs
MREG_FASTMCP_OAUTH_CALLBACK_URL=http://localhost:8001/oauth/callback

# OAuth Scopes (space-separated)
MREG_FASTMCP_OAUTH_SCOPES=User.Read profile openid email

# Optional: Enable refresh tokens
MREG_FASTMCP_OAUTH_ENABLE_REFRESH=true
MREG_FASTMCP_OAUTH_SCOPES=User.Read profile openid email offline_access
```

### Production Environment

```bash
# Azure OAuth Configuration
MREG_AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MREG_AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
MREG_AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}  # Use secure secret management

# OAuth Callback URLs (use HTTPS in production)
MREG_FASTMCP_OAUTH_CALLBACK_URL=https://your-domain.com/oauth/callback

# OAuth Scopes
MREG_FASTMCP_OAUTH_SCOPES=User.Read profile openid email offline_access

# Security Settings
MREG_SECURITY_JWT_SECRET_KEY=${JWT_SECRET}  # Use secure secret management
MREG_SECURITY_ENABLE_CORS=true
MREG_SECURITY_ALLOWED_ORIGINS=https://your-frontend.com,https://your-app.com

# Session Settings
MREG_SESSION_TIMEOUT=3600  # 1 hour
MREG_SESSION_REFRESH_ENABLED=true
```

---

## Testing and Validation

### Step 1: Test OAuth Flow Locally

1. **Start the FastMCP Server**
   ```bash
   uv run mcp-gateway serve --port 8000
   ```

2. **Initiate OAuth Login**
   - Open browser to: http://localhost:8001/oauth/login
   - You should be redirected to Microsoft login
   - Sign in with a user assigned to the app
   - After successful login, you'll be redirected back to the callback URL

3. **Verify Token Reception**
   - Check server logs for successful token validation
   - The user info should be extracted and stored in context

### Step 2: Test MCP Operations

1. **Get User Info**
   ```bash
   curl -X GET http://localhost:8001/oauth/userinfo \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

2. **Test Authenticated MCP Call**
   ```bash
   curl -X POST http://localhost:8001/mcp \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "list_servers", "params": {}, "id": 1}'
   ```

### Step 3: Validate Role-Based Access

1. **Test Admin Endpoints**
   - Ensure admin users can access admin-only tools
   - Verify audit logging captures admin actions

2. **Test User Restrictions**
   - Confirm standard users cannot access admin tools
   - Verify proper error messages for unauthorized access

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Invalid client" Error
**Problem**: Azure AD returns "invalid_client" error  
**Solution**: 
- Verify `MREG_AZURE_CLIENT_ID` is correct
- Check that client secret hasn't expired
- Ensure redirect URI exactly matches configuration

#### 2. "Invalid redirect URI" Error
**Problem**: Redirect URI mismatch  
**Solution**:
- Ensure redirect URI in Azure exactly matches `MREG_FASTMCP_OAUTH_CALLBACK_URL`
- Include protocol (http:// or https://)
- Check for trailing slashes

#### 3. "Unauthorized client" Error
**Problem**: App not authorized for requested scopes  
**Solution**:
- Verify API permissions are configured
- Check if admin consent is required and granted
- Ensure scopes in `.env` match Azure configuration

#### 4. Token Validation Failures
**Problem**: JWT token validation fails  
**Solution**:
```bash
# Debug token validation
uv run mcp-gateway serve --port 8000 --log-level debug

# Check JWT contents (development only)
echo "YOUR_TOKEN" | base64 -d
```

#### 5. CORS Issues
**Problem**: Cross-origin requests blocked  
**Solution**:
```bash
# Add allowed origins to .env
MREG_SECURITY_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### Debug Checklist

- [ ] Azure App Registration created and configured
- [ ] Client ID and Tenant ID correctly set in `.env`
- [ ] Client secret created and not expired
- [ ] Redirect URIs match exactly (including protocol)
- [ ] API permissions configured and admin consent granted
- [ ] Users/groups assigned to application
- [ ] App roles created and assigned
- [ ] Environment variables loaded correctly
- [ ] FastMCP server starting without errors
- [ ] OAuth Proxy initializing successfully

---

## Security Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- Use Azure Key Vault or similar for production
- Rotate client secrets regularly (every 6-12 months)
- Use separate app registrations for dev/staging/production

### 2. Token Security
- Always use HTTPS in production
- Implement token refresh for long-running sessions
- Set appropriate token lifetimes in Azure AD
- Validate tokens on every request

### 3. Access Control
- Follow principle of least privilege
- Use app roles for fine-grained permissions
- Regularly audit user access and permissions
- Implement tenant isolation for multi-tenant scenarios

### 4. Monitoring and Audit
- Enable Azure AD sign-in logs
- Monitor failed authentication attempts
- Review audit logs regularly
- Set up alerts for suspicious activities

### 5. Network Security
- Use Web Application Firewall (WAF) in production
- Implement rate limiting (already configured)
- Use CORS properly (don't use wildcard origins)
- Enable HTTPS-only in production

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Production App Registration created
- [ ] Production redirect URIs configured
- [ ] Production client secret stored securely
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Load balancer configured (if applicable)

### Configuration
- [ ] Production environment variables set
- [ ] Secrets managed through secure vault
- [ ] CORS origins configured for production
- [ ] Rate limiting configured appropriately
- [ ] Audit logging enabled and tested

### Testing
- [ ] OAuth flow tested end-to-end
- [ ] Role-based access verified
- [ ] Token refresh tested (if enabled)
- [ ] Error scenarios tested
- [ ] Performance under load tested

### Monitoring
- [ ] Application Insights or monitoring configured
- [ ] Log aggregation set up
- [ ] Alerts configured for failures
- [ ] Health checks monitored
- [ ] Audit log retention configured

---

## Additional Resources

### Microsoft Documentation
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 and OpenID Connect](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols)
- [Best Practices for Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/identity-platform-integration-checklist)

### FastMCP Documentation
- [OAuth Proxy Documentation](https://docs.fastmcp.com/oauth-proxy)
- [Authentication Patterns](https://docs.fastmcp.com/authentication)
- [Middleware Configuration](https://docs.fastmcp.com/middleware)

### Support
- GitHub Issues: https://github.com/jrmatherly/mcp-manager/issues
- FastMCP Discord: https://discord.gg/fastmcp
- Azure Support: https://azure.microsoft.com/support/

---

**Last Updated**: September 10, 2025  
**Version**: 1.0.0  
**Status**: Production Ready