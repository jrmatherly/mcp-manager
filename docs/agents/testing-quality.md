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

**Better-Auth Logger Testing**: `frontend/tests/unit/better-auth-logger.test.ts` & `frontend/tests/integration/better-auth-logger-integration.test.ts`
- **47 comprehensive tests** for logger adapter functionality
- Logger integration patterns using `Reflect.get()` for private property access
- Performance testing with high-volume logging scenarios
- Error handling with circular references and malformed objects
- Environment-aware configuration testing
- See dedicated documentation: `frontend/tests/README-better-auth-logger.md`

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
npm run test -- --grep="logger"              # Run logger-related tests

# Run Better-Auth logger tests specifically
npm run test tests/unit/better-auth-logger.test.ts
npm run test tests/integration/better-auth-logger-integration.test.ts

# Test theme-aware components
npm run test -- --grep="theme"              # Run theme-related tests
npm run test -- --grep="dark mode"          # Run dark mode specific tests
npm run test -- --grep="light theme"        # Run light theme specific tests
```

### Theme-Aware Testing Patterns

#### Testing Components in Both Themes
All UI components should be tested in both light and dark modes to ensure proper styling and visibility:

```typescript
// Theme testing utilities
import { ThemeProvider } from "@/components/theme-provider";
import { render, screen } from "../utils/test-utils";

describe("ThemeAwareComponent", () => {
  const TestWrapper = ({ theme, children }: { theme: string; children: React.ReactNode }) => (
    <ThemeProvider attribute="class" defaultTheme={theme}>
      {children}
    </ThemeProvider>
  );

  it("applies correct styling in light theme", () => {
    render(
      <TestWrapper theme="light">
        <StatsCard title="Test" value="100" />
      </TestWrapper>
    );

    const card = screen.getByTestId("stats-card");
    expect(card).toHaveClass("bg-card", "text-card-foreground");
    expect(card.closest("html")).not.toHaveClass("dark");
  });

  it("applies correct styling in dark theme", () => {
    render(
      <TestWrapper theme="dark">
        <StatsCard title="Test" value="100" />
      </TestWrapper>
    );

    const card = screen.getByTestId("stats-card");
    expect(card.closest("html")).toHaveClass("dark");
    // Verify dark mode styling is applied
  });

  it("handles theme transitions correctly", async () => {
    const { rerender } = render(
      <TestWrapper theme="light">
        <StatsCard title="Test" value="100" />
      </TestWrapper>
    );

    rerender(
      <TestWrapper theme="dark">
        <StatsCard title="Test" value="100" />
      </TestWrapper>
    );

    // Verify component handles theme change gracefully
    expect(screen.getByTestId("stats-card")).toBeInTheDocument();
  });
});
```

#### Testing Shadow Visibility
Test that custom shadow utilities are properly applied and visible in dark mode:

```typescript
describe("Shadow Utilities", () => {
  it("applies enhanced shadows for dark mode visibility", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <Card className="shadow-card-hover-enhanced">
          Test Content
        </Card>
      </ThemeProvider>
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("shadow-card-hover-enhanced");
    // Verify shadow is visible in dark mode
    expect(getComputedStyle(card).boxShadow).toContain("rgba");
  });
});
```

#### Testing Glassmorphism Effects
Ensure glassmorphism components render correctly across themes:

```typescript
describe("Glassmorphism Components", () => {
  it("applies glass effects correctly", () => {
    render(
      <div className="glass-surface">
        <span>Glass Content</span>
      </div>
    );

    const glassElement = screen.getByText("Glass Content").parentElement;
    const styles = getComputedStyle(glassElement!);
    expect(styles.backdropFilter).toContain("blur");
  });

  it("provides fallback for unsupported browsers", () => {
    // Mock backdrop-filter support
    Object.defineProperty(CSS, 'supports', {
      value: () => false, // Simulate unsupported backdrop-filter
    });

    render(
      <div className="glass-surface">
        Fallback Content
      </div>
    );

    // Should apply fallback styling
    const element = screen.getByText("Fallback Content").parentElement;
    expect(element).toHaveClass("glass-surface");
  });
});
```

#### Testing Theme Provider Integration
```typescript
describe("Theme Provider", () => {
  it("provides theme context to child components", () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="theme-display">{theme}</div>;
    };

    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-display")).toHaveTextContent("dark");
  });

  it("handles system theme detection", () => {
    // Mock system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <div data-testid="system-theme">System Theme</div>
      </ThemeProvider>
    );

    expect(document.documentElement).toHaveClass("dark");
  });
});
```

### Visual Regression Testing

#### Component Screenshot Testing
For critical UI components, consider visual regression testing:

```typescript
describe("Visual Regression", () => {
  it("matches screenshot in light theme", async () => {
    const { container } = render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <Dashboard />
      </ThemeProvider>
    );

    // Use visual testing library (e.g., @storybook/test-runner)
    await expect(container).toMatchSnapshot("dashboard-light.png");
  });

  it("matches screenshot in dark theme", async () => {
    const { container } = render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <Dashboard />
      </ThemeProvider>
    );

    await expect(container).toMatchSnapshot("dashboard-dark.png");
  });
});
```

### Theme Testing Best Practices

1. **Test Both Themes**: Always test components in both light and dark modes
2. **Verify Shadow Visibility**: Ensure custom shadow utilities work in dark mode
3. **Check Semantic Colors**: Confirm semantic tokens apply correctly across themes
4. **Test Interactive States**: Verify hover, focus, and active states in both themes
5. **Validate Glassmorphism**: Ensure glass effects render with proper fallbacks
6. **Theme Transitions**: Test smooth transitions between theme changes
7. **Accessibility Compliance**: Verify WCAG contrast requirements in both themes
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

### Logger Adapter Testing Patterns

When testing logger adapters (like Better-Auth integration), use these patterns:

```typescript
// Test logger adapter functionality
describe("Logger Adapter Integration", () => {
  it("should adapt project logger to external interface", () => {
    const adapterLogger = createAdapterLogger(baseLogger);

    // Test interface compliance
    expect(adapterLogger).toHaveProperty("log");
    expect(adapterLogger).toHaveProperty("level");

    // Test message formatting and context handling
    adapterLogger.log("info", "Test message", { key: "value" });

    expect(baseLoggerSpy.info).toHaveBeenCalledWith(
      "[Adapter] Test message",
      expect.objectContaining({
        component: "adapter",
        key: "value"
      })
    );
  });
});
```

**Key Testing Techniques**:
- **Private Property Access**: Use `Reflect.get()` for testing private configuration
- **Interface Compliance**: Verify adapter implements required interface methods
- **Context Preservation**: Ensure context data is properly converted and preserved
- **Performance Testing**: Validate high-volume logging scenarios (1000+ calls)
- **Environment Awareness**: Test behavior across development/production environments
- **Error Resilience**: Test with circular references and malformed objects

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
import { render, screen, fireEvent } from "../utils/test-utils";
import { ThemeProvider } from "@/components/theme-provider";
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

  // Theme-aware testing
  it("renders correctly in light theme", () => {
    const user = { id: "1", name: "John Doe", email: "john@example.com" };

    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <UserCard user={user} />
      </ThemeProvider>
    );

    // Test light theme specific styling
    expect(screen.getByTestId("user-card")).toHaveClass("bg-card");
  });

  it("renders correctly in dark theme", () => {
    const user = { id: "1", name: "John Doe", email: "john@example.com" };

    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <UserCard user={user} />
      </ThemeProvider>
    );

    // Test dark theme specific styling
    const card = screen.getByTestId("user-card");
    expect(card.closest("html")).toHaveClass("dark");
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
