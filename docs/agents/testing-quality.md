# Testing & Quality Assurance Guide

## Testing Philosophy

**When tests fail, fix the code, not the test.**

Key principles:
- **Tests should be meaningful** - Avoid tests that always pass regardless of behavior
- **Test actual functionality** - Call the functions being tested, don't just check side effects
- **Failing tests are valuable** - They reveal bugs or missing features
- **Fix the root cause** - When a test fails, fix the underlying issue, don't hide the test
- **Test edge cases** - Tests that reveal limitations help improve the code
- **Document test purpose** - Each test should include a comment explaining why it exists

## Frontend Testing (Vitest/React Testing Library)

### Database Optimization Testing

**Critical Test Suite**: `frontend/tests/db-optimization.test.ts`
- **38 Index Verification**: Tests all performance indexes exist and are properly configured
- **3 Function Testing**: Validates database analytics functions (`get_server_health_summary`, `get_request_performance_summary`, `get_tenant_usage_summary`)
- **3 View Testing**: Confirms monitoring views (`database_size_summary`, `index_usage_summary`, `performance_monitoring`)
- **Health Monitoring**: Tests automated health checks and scoring system
- **Migration Integrity**: Validates migration rollback capabilities
- **Performance Testing**: Measures query performance improvements (40-90% gains)
- **Maintenance Tasks**: Validates automated maintenance and optimization tasks

### Test Configuration

**`vitest.config.ts`** - Enhanced for Database Testing:
```typescript
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,  // Extended for database operations
    pool: "forks",       // Better compatibility with PostgreSQL
    poolOptions: {
      forks: { maxForks: 3, minForks: 1 }
    }
  },
  esbuild: {
    target: "esnext",
    supported: { bigint: true }  // BigInt support for PostgreSQL
  }
});
```

### Test Utilities

### Test Utilities Documentation

**Database Test Utilities**: `frontend/tests/utils/db-test-utils.ts`
- Database connection management with proper cleanup
- Test data creation and cleanup functions (users, tenants, MCP servers)
- Performance measurement utilities for optimization tests
- BigInt compatibility helpers for PostgreSQL results
- Health check validation utilities
- Index, function, and view existence checking
- Query plan analysis for index usage verification
- Comprehensive test data cleanup with UUID casting fixes

**Better-Auth Test Utilities**: `frontend/tests/utils/auth-test-utils.ts`
- Mock implementations for Better-Auth API key functionality
- API key creation, verification, and deletion mocking
- Rate limiting and permissions testing support
- Session management mocking for integration tests
- No modification of production code - pure testing utilities
- Comprehensive mock reset functionality between tests

**MSW Server**: `frontend/tests/utils/msw-server.ts`
- Mock Service Worker for API endpoint mocking
- Handles auth, MCP server, and admin API endpoints
- Automatic lifecycle management (start/stop/reset)
- Fallback handlers for unhandled requests

**React Test Utils**: `frontend/tests/utils/test-utils.tsx`
- Custom render function with necessary providers
- Theme provider and React Query client setup
- Testing Library configuration optimized for the project

**Database Health Monitoring System**:
- **Health Score Calculation**: Composite scoring based on multiple metrics
- **Performance Analytics**: Real-time query performance monitoring
- **Index Usage Tracking**: Monitor index effectiveness and usage patterns
- **System Health Alerts**: Automated alerts for performance degradation
- **Maintenance Automation**: Scheduled maintenance tasks and optimization

### Running Frontend Tests

```bash
# Run all tests (includes database optimization and integration tests)
npm run test

# Run specific test categories
npm run test tests/unit/                      # Run all unit tests
npm run test tests/integration/               # Run all integration tests
npm run test tests/integration/api-key-integration.test.ts  # Run specific integration test

# Run database optimization tests specifically
npm run test tests/db-optimization.test.ts

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch

# Run tests with Vitest UI
npm run test:ui

# Run tests matching a pattern
npm run test -- --grep="auth"                # Run auth-related tests
npm run test -- --grep="API key"             # Run API key tests
```

## Backend Testing (Python/Pytest)

### Test File Patterns
- Test files: `test_*.py` or `*_test.py`
- Test location: `backend/tests/` directory
- Test markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`

### Testing Conventions
```python
# Test file structure
import pytest
from unittest.mock import Mock, AsyncMock

# Fixtures at top
@pytest.fixture
async def test_client():
    """Create test client with mocked dependencies."""
    ...

# Test functions with descriptive names
async def test_user_creation_with_valid_data():
    """Test that user creation succeeds with valid input."""
    # Arrange
    user_data = {"email": "test@example.com", "password": "secure123"}
    
    # Act
    response = await client.post("/users", json=user_data)
    
    # Assert
    assert response.status_code == 201
    assert response.json()["email"] == user_data["email"]
```

### Coverage Requirements
- Minimum coverage: 80%
- Critical paths: 95%+ coverage
- Exclude: migrations, **init**.py files

## Frontend Testing (Vitest/React Testing Library)

### Test Organization Structure

**Directory Structure**:
```
tests/
├── unit/                 # Unit tests for individual components and utilities
│   ├── components/       # React component tests
│   ├── hooks/           # Custom hook tests
│   └── utils/           # Utility function tests
├── integration/         # Integration tests for component interactions
│   ├── auth/           # Authentication flow tests
│   ├── admin/          # Admin functionality tests
│   └── api/            # API integration tests
├── e2e/                # End-to-end tests (Playwright - see separate config)
└── utils/              # Shared test utilities and setup
    ├── test-utils.tsx  # Custom render function and providers
    ├── auth-test-utils.ts  # Better-Auth mocking utilities
    ├── db-test-utils.ts    # Database test utilities
    ├── msw-server.ts   # API mocking with MSW
    └── setup.ts        # Global test setup
```

### Test File Patterns
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Test location: Organized in structured directories by test type

### Testing Conventions
```typescript
// Component test example
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import UserCard from "./UserCard";

describe("UserCard", () => {
  it("displays user information correctly", () => {
    const user = { id: "1", name: "John Doe", email: "john@example.com" };
    
    render(<UserCard user={user} />);
    
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });
  
  it("calls onUpdate when edit button is clicked", () => {
    const onUpdate = vi.fn();
    const user = { id: "1", name: "John Doe", email: "john@example.com" };
    
    render(<UserCard user={user} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    
    expect(onUpdate).toHaveBeenCalledWith(user);
  });
});
```

## File Organization

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:

```
mcp-manager/
├── reports/              # All project reports and documentation
│   └── *.md             # Various report types
├── temp/                # Temporary files and debugging
├── backend/             # Python FastAPI backend
├── frontend/            # Next.js frontend
└── docs/                # Project documentation
```

### Report Generation Guidelines

**Implementation Reports:**
- Phase validation: `PHASE_X_VALIDATION_REPORT.md`
- Implementation summaries: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Feature completion: `FEATURE_[NAME]_REPORT.md`

**Testing & Analysis Reports:**
- Test results: `TEST_RESULTS_[DATE].md`
- Coverage reports: `COVERAGE_REPORT_[DATE].md`
- Performance analysis: `PERFORMANCE_ANALYSIS_[SCENARIO].md`
- Security scans: `SECURITY_SCAN_[DATE].md`

**Quality & Validation:**
- Code quality: `CODE_QUALITY_REPORT.md`
- Dependency analysis: `DEPENDENCY_REPORT.md`
- API compatibility: `API_COMPATIBILITY_REPORT.md`

**Report Naming Conventions:**
- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

### Temporary Files & Debugging

All temporary files, debugging scripts, and test artifacts should be organized in a `/temp` folder:

**Temporary File Organization:**
- **Debug scripts**: `temp/debug-*.py`, `temp/analyze-*.js`
- **Test artifacts**: `temp/test-results/`, `temp/coverage/`
- **Generated files**: `temp/generated/`, `temp/build-artifacts/`
- **Logs**: `temp/logs/debug.log`, `temp/logs/error.log`

**Guidelines:**
- Never commit files from `/temp` directory
- Use `/temp` for all debugging and analysis scripts
- Clean up `/temp` directory regularly
- Include `/temp/` in `.gitignore`

### Example `.gitignore` patterns
```gitignore
# Temporary files and debugging
/temp/
temp/
**/temp/
debug-*.py
test-*.js
analyze-*.sh
*-debug.*
*.debug

# Environment files
.env
.env.local
*.env

# Claude settings
.claude/settings.local.json

# Don't ignore reports directory
!reports/
!reports/**

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/

# Node.js
node_modules/
.next/
out/
dist/
build/
*.log
npm-debug.log*
.npm
.eslintcache

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
```

### Claude Code Settings (.claude Directory)

The `.claude` directory contains Claude Code configuration files:

#### Version Controlled Files (commit these)
- `.claude/settings.json` - Shared team settings
- `.claude/commands/*.md` - Custom slash commands
- `.claude/hooks/*.sh` - Hook scripts for automation

#### Ignored Files (do NOT commit)
- `.claude/settings.local.json` - Personal preferences
- Any `*.local.json` files - Personal configuration
