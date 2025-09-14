# Frontend Test Suite

Comprehensive test setup for the MCP Registry Gateway frontend using Vitest, React Testing Library, and MSW.

## Directory Structure

```
tests/
├── unit/                 # Unit tests for individual components and utilities
│   ├── components/       # React component tests
│   ├── hooks/           # Custom hook tests
│   └── utils/           # Utility function tests
├── integration/         # Integration tests for component interactions
│   ├── api-key-integration.test.ts  # Better-Auth API key testing
│   ├── auth/           # Authentication flow tests
│   ├── admin/          # Admin functionality tests
│   └── api/            # API integration tests
├── e2e/                # End-to-end tests (Playwright - see separate config)
├── db-optimization.test.ts  # Database performance optimization tests
└── utils/              # Shared test utilities and setup
    ├── test-utils.tsx      # Custom render function and providers
    ├── auth-test-utils.ts  # Better-Auth mocking utilities
    ├── db-test-utils.ts    # Database testing utilities with UUID fixes
    ├── msw-server.ts       # API mocking with MSW
    └── setup.ts            # Global test setup
```

## Configuration Files

### `vitest.config.ts`
Main Vitest configuration with:
- JSX/TSX support via React plugin
- jsdom environment for React components
- Path aliases matching `tsconfig.json`
- Coverage reporting with v8 provider
- Global test utilities

### `tests/setup.ts`
Global test setup including:
- Testing Library DOM matchers
- MSW server lifecycle
- DOM mocks (matchMedia, IntersectionObserver, etc.)
- Cleanup after each test

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests once with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- button.test.tsx

# Run tests matching pattern
npm test -- --grep="login"
```

## Test Categories

### Unit Tests (`tests/unit/`)
Test individual components and functions in isolation:
- Component rendering and props
- User interactions (clicks, form input)
- Hook behavior and state changes
- Utility function logic

### Integration Tests (`tests/integration/`)
Test component interactions and API communication:
- **API Key Integration**: Better-Auth API key creation, verification, deletion
- Authentication flows and session management
- Admin functionality workflows
- API error handling and edge cases
- Multi-component interactions with proper mocking

### Database Tests (`tests/db-optimization.test.ts`)
Comprehensive database performance and optimization testing:
- 38 strategic index verification
- Database function testing (analytics, monitoring)
- View existence and functionality
- Performance measurement and validation
- Health check systems

### E2E Tests (`tests/e2e/`)
End-to-end user workflows (use Playwright for browser testing):
- Complete user journeys
- Cross-browser compatibility
- Visual regression testing

## Test Utilities

### Better-Auth Test Utils (`utils/auth-test-utils.ts`)
Mock implementations for Better-Auth functionality without modifying production code:

```tsx
import { mockAuth, resetMockAuth } from '../utils/auth-test-utils'

describe('API Key Tests', () => {
  beforeEach(() => {
    resetMockAuth()  // Clean slate for each test
  })

  test('creates and verifies API key', async () => {
    const apiKey = await mockAuth.api.createApiKey({
      body: { name: 'Test Key', userId: 'user123' }
    })

    expect(apiKey.key).toBeDefined()
    expect(apiKey.key).toMatch(/^mcp_/)

    const verification = await mockAuth.api.verifyApiKey({
      body: { key: apiKey.key }
    })

    expect(verification.valid).toBe(true)
  })
})
```

### Database Test Utils (`utils/db-test-utils.ts`)
Database testing utilities with comprehensive cleanup and UUID support:

```tsx
import { createTestData, cleanupTestData, checkIndexExists } from '../utils/db-test-utils'

test('database setup with proper cleanup', async () => {
  const testIds = await createTestData()

  // Test database operations
  expect(testIds.serverId).toBeDefined()
  expect(testIds.userId).toBeDefined()

  // Test index existence
  const indexExists = await checkIndexExists('idx_mcp_server_tenant_status')
  expect(indexExists).toBe(true)

  // Cleanup automatically handles UUID casting
  await cleanupTestData(testIds)
})
```

## Best Practices

### Component Testing
```tsx
import { render, screen } from '../utils/test-utils'  // Use custom render with providers
import { MyComponent } from '@/components/MyComponent'

test('renders component with props', () => {
  render(<MyComponent title="Test" />)
  expect(screen.getByText('Test')).toBeInTheDocument()
})
```

### API Mocking
```tsx
import { server } from '../utils/msw-server'
import { http, HttpResponse } from 'msw'

test('handles API errors', async () => {
  server.use(
    http.get('/api/data', () => HttpResponse.error())
  )
  // Test error handling behavior
})
```

### Async Testing
```tsx
import { waitFor } from '@testing-library/react'

test('handles async operations', async () => {
  render(<AsyncComponent />)

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

### User Interactions
```tsx
import userEvent from '@testing-library/user-event'

test('handles user input', async () => {
  const user = userEvent.setup()
  render(<FormComponent />)

  await user.type(screen.getByLabelText('Name'), 'John')
  await user.click(screen.getByRole('button', { name: 'Submit' }))
})
```

## Coverage Thresholds

Current coverage requirements:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in `./coverage/` directory.

## Integration with CI/CD

Tests are automatically run in GitHub Actions:
- On pull requests
- Before deployment
- Coverage reports uploaded to code coverage service
- Quality gates enforce coverage thresholds

## Troubleshooting

### Common Issues

1. **Module not found errors**: Check path aliases in `vitest.config.ts`
2. **React component errors**: Ensure `@testing-library/jest-dom` is imported in setup
3. **API mock issues**: Verify MSW handlers in `msw-server.ts`
4. **Timeout errors**: Increase timeout values in config for slow tests

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run single test with debug
npm test -- --run button.test.tsx
```

## Key Testing Principles

### No Production Code Modifications for Testing
- **Use test utilities**: All mocking done in dedicated test utility files
- **Never modify source code**: Production code should never be changed to make tests pass
- **Mock at boundaries**: Mock external APIs, database calls, and third-party services
- **Test real behavior**: Tests should verify actual functionality, not test infrastructure

### Test Organization Best Practices
- **Structured directories**: Organize tests by type (unit, integration, e2e)
- **Descriptive names**: Test files and describe blocks should clearly indicate what's being tested
- **Proper cleanup**: Use `beforeEach` and `afterEach` for test isolation
- **Comprehensive mocking**: Use dedicated utility files for consistent mocking patterns

### Configuration Compliance
- **ESLint compliance**: Test files follow ESLint 9 flat config with test-specific overrides
- **TypeScript strict mode**: All tests use proper TypeScript typing with BigInt support
- **Vitest configuration**: Tests run with proper timeouts and database compatibility

## Contributing

1. Write tests for all new components and utilities
2. Follow the existing directory structure (`unit/`, `integration/`, `e2e/`)
3. Use descriptive test names and organize with `describe` blocks
4. Mock external dependencies using provided test utilities
5. **Never modify production code to make tests pass**
6. Use `auth-test-utils.ts` for Better-Auth mocking
7. Use `db-test-utils.ts` for database testing with proper cleanup
8. Ensure tests are fast and reliable with proper isolation
9. Update this README when adding new test patterns or utilities