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
- **Migration Integrity**: Validates migration rollback capabilities
- **Performance Testing**: Measures query performance improvements

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

**Database Test Utilities**: `frontend/tests/utils/db-test-utils.ts`
- Database connection management with proper cleanup
- Test data creation and cleanup functions
- Performance measurement utilities
- BigInt compatibility helpers for PostgreSQL results

### Running Frontend Tests

```bash
# Run all tests
npm run test

# Run database optimization tests specifically
npm run test tests/db-optimization.test.ts

# Run tests with coverage
npm run test --coverage

# Run tests in watch mode for development
npm run test --watch
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

### Test File Patterns
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Test location: Alongside components or in `__tests__` directories

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
