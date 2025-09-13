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
│   ├── auth/           # Authentication flow tests
│   ├── admin/          # Admin functionality tests
│   └── api/            # API integration tests
├── e2e/                # End-to-end tests (Playwright - see separate config)
└── utils/              # Shared test utilities and setup
    ├── test-utils.tsx  # Custom render function and providers
    ├── msw-server.ts   # API mocking with MSW
    └── setup.ts        # Global test setup
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
- Form submission workflows
- Authentication flows
- API error handling
- Multi-component interactions

### E2E Tests (`tests/e2e/`)
End-to-end user workflows (use Playwright for browser testing):
- Complete user journeys
- Cross-browser compatibility
- Visual regression testing

## Best Practices

### Component Testing
```tsx
import { render, screen } from '../utils/test-utils'
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

## Contributing

1. Write tests for all new components and utilities
2. Follow the existing directory structure
3. Use descriptive test names and organize with `describe` blocks
4. Mock external dependencies and APIs
5. Ensure tests are fast and reliable
6. Update this README when adding new test patterns