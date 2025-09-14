# Frontend Development Guide

## Next.js/React Development

**CRITICAL**: Document the EXACT script names from package.json.

### Commands

```bash
# Install dependencies
cd frontend
npm install

# Development server
npm run dev                            # runs with --turbopack for fast refresh

# Build and production
npm run build                          # production build
npm run start                          # start production server

# Code quality
npm run lint                           # ESLint checks

# Database operations (Drizzle ORM)
npm run db:generate                    # generate Drizzle migrations
npm run db:migrate                     # apply migrations (includes 38 performance indexes)
npm run db:push                        # push schema changes directly
npm run db:studio                      # open Drizzle Studio GUI
npm run db:seed                        # seed database with test data

# Testing
npm run test                           # run Vitest test suite (all tests)
npm run test:run                       # run tests once and exit
npm run test:watch                     # run tests in watch mode
npm run test:coverage                  # run tests with coverage report
npm run test:ui                        # run tests with Vitest UI

# Test categories
npm run test tests/unit/               # run unit tests only
npm run test tests/integration/        # run integration tests only
npm run test tests/db-optimization.test.ts  # run database optimization tests
npm run test tests/integration/api-key-integration.test.ts  # run API key tests
```

## Environment Variables

### T3 Env Configuration
The frontend uses **T3 Env** (`@t3-oss/env-nextjs`) for type-safe environment variable validation.

**Configuration**: `frontend/src/env.ts`
- Type-safe environment variables with Zod validation
- Separate server and client schemas
- Build-time validation
- Full TypeScript IntelliSense

### Usage Patterns

| File Type | Import Pattern | Example |
|-----------|---------------|---------|
| **Next.js App Code** | `import { env } from "../env"` | Components, API routes, lib files |
| **CLI Scripts** | `import "dotenv/config"` | setup.ts, migrate.ts, optimize.ts |
| **Drizzle Config** | `import "dotenv/config"` | drizzle.config.ts |

### CLI Scripts
These files run outside Next.js runtime and use `dotenv/config`:
- `src/db/setup.ts` - Database setup operations
- `src/db/migrate.ts` - Migration management
- `src/db/setup-views.ts` - View creation
- `src/db/optimize.ts` - Database optimization
- `drizzle.config.ts` - Drizzle ORM configuration

### Example Usage

```typescript
// In Next.js app code
import { env } from "@/env";

// Access typed environment variables
const dbUrl = env.DATABASE_URL; // Type-safe with validation
const isProduction = env.NODE_ENV === "production";

// In CLI scripts
import "dotenv/config";

// Access environment variables directly
const dbUrl = process.env.DATABASE_URL!;
```

## Code Style

### Import Conventions
```typescript
// React and Next.js imports first
import { useState, useEffect } from "react";
import type { Metadata } from "next";

// Third-party libraries
import { Toaster } from "react-hot-toast";
import { z } from "zod";

// Local imports
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Types/interfaces
import type { User, Session } from "@/types";
```

### Formatting Rules
- Indentation: 2 spaces
- Semicolons: Not required (Next.js convention)
- Quotes: Double quotes for JSX attributes, single quotes for JS strings
- No trailing commas in function parameters

### Naming Conventions
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `use` prefix (e.g., `useAuth.ts`)
- Pages: `page.tsx` in route directories
- API routes: `route.ts` in api directories
- CSS classes: Tailwind utility classes

### Type Usage Patterns
```typescript
// Prefer interfaces for object types
interface UserProps {
  user: User;
  onUpdate?: (user: User) => void;
}

// Use type for unions and intersections
type Status = "pending" | "active" | "inactive";

// Functional components with typed props
export default function UserCard({ user, onUpdate }: UserProps) {
  // Component logic
}

// Use const assertions for constants
const ROLES = ["admin", "user", "server_owner"] as const;
type Role = typeof ROLES[number];
```

### Error Handling
```typescript
// Use try/catch with proper error typing
try {
  const data = await fetchUser(id);
  setUser(data);
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred");
  }
}

// Use error boundaries for component errors
// Use toast notifications for user feedback
```

## Testing

### Test Organization Structure
```
tests/
├── unit/                 # Unit tests for components, hooks, utilities
├── integration/         # Integration tests for auth flows, API interactions
├── e2e/                # End-to-end tests (Playwright configuration)
└── utils/              # Test utilities and mocking
    ├── auth-test-utils.ts  # Better-Auth mocking (no production code changes)
    ├── db-test-utils.ts    # Database testing utilities with UUID fixes
    ├── test-utils.tsx      # React Testing Library custom render
    └── msw-server.ts       # API mocking with MSW
```

### Test File Patterns
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Test location: Organized in structured directories by test type
- Integration tests: Located in `tests/integration/` with descriptive names

### Testing Conventions
```typescript
// Component test example
import { render, screen, fireEvent } from "../utils/test-utils";  // Use custom render
import { describe, it, expect, vi } from "vitest";
import UserCard from "@/components/UserCard";

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

### Integration Testing Example
```typescript
// API integration test example
import { describe, it, expect, beforeEach } from "vitest";
import { mockAuth, resetMockAuth } from "../utils/auth-test-utils";

describe("Better-Auth API Key Integration", () => {
  beforeEach(() => {
    resetMockAuth();  // Clean slate for each test
  });

  it("should create and verify API key", async () => {
    const apiKey = await mockAuth.api.createApiKey({
      body: { name: "Test Key", userId: "test-user" }
    });

    expect(apiKey.key).toBeDefined();

    const verification = await mockAuth.api.verifyApiKey({
      body: { key: apiKey.key }
    });

    expect(verification.valid).toBe(true);
  });
});
```

### Configuration Updates

**ESLint Configuration (eslint.config.mjs)**
- **ESLint 9 Flat Config Format**: Modern configuration with proper ignore patterns
- **Global Ignores**: Comprehensive exclusion patterns for build outputs, node_modules, generated files
- **TypeScript Integration**: Full TypeScript support with consistent type imports
- **Test File Overrides**: Specialized rules for test files with Vitest globals
- **Next.js Integration**: Includes Next.js core web vitals and TypeScript rules

**TypeScript Configuration (tsconfig.json)**
- **BigInt Support**: `es2020.bigint` library for PostgreSQL compatibility
- **Path Aliases**: `@/*` mapping to `./src/*` for clean imports
- **Test Inclusion**: Explicit inclusion of `tests/**/*.ts` and `tests/**/*.tsx`
- **Proper Exclusions**: Build outputs, generated files, and SQL files excluded

**Vitest Configuration (vitest.config.ts)**
- **JSdom Environment**: React component testing support
- **BigInt Support**: ESBuild configuration for PostgreSQL numeric types
- **Forks Pool**: Better compatibility with native modules and database connections
- **Extended Timeouts**: 15-second test and hook timeouts for database operations
- **Path Aliases**: Matches TypeScript configuration for consistent imports

## Key Features

### Database Integration (TypeScript/Drizzle)
- **Unified Database Management**: All database operations consolidated in frontend
- **Type-Safe Operations**: Complete TypeScript support with Drizzle-generated types
- **Performance Monitoring**: Built-in database health checks and analytics
- **Automated Setup**: `npm run db:setup:full` handles complete database initialization

### Authentication System (Better-Auth)
- **Multi-Provider SSO**: Google, GitHub, and Microsoft/Entra ID integration
- **Session Management**: Redis-backed sessions for high performance
- **API Key Support**: Enhanced API keys with rate limiting and metadata
- **Email Verification**: Resend integration for email verification flows
- **Integrated Logging**: Better-Auth logger integration with project logging infrastructure

#### Better-Auth Logger Integration
The project includes a custom logger adapter for Better-Auth that integrates with the existing logging infrastructure:

```typescript
import { betterAuthLogger } from "@/lib/logger";

// Usage in Better-Auth configuration
export const auth = betterAuth({
  // ... other config
  logger: betterAuthLogger,  // Integrated logger
});
```

**Key Features**:
- **Unified Logging**: All Better-Auth logs use the same format as application logs
- **Environment Awareness**: Respects development/production logging settings
- **Context Preservation**: Maintains Better-Auth specific context and metadata
- **Private Property Access**: Uses `Reflect.get()` for safe access to logger configuration

**Implementation Pattern**:
```typescript
// Creates Better-Auth compatible logger from existing logger
export function createBetterAuthLogger(logger: Logger) {
  const loggerConfig = Reflect.get(logger, "config") as LoggerConfig | undefined;

  return {
    disabled: false,
    disableColors: !(loggerConfig?.enableColors ?? true),
    level: logger.getLevel(),
    log: (level, message, ...args) => {
      // Adapter implementation
    },
  };
}
```

### Testing Infrastructure (Vitest)
- **Database Testing**: Comprehensive database optimization test suite
- **BigInt Support**: Configured for PostgreSQL BigInt compatibility
- **Performance Testing**: Database query performance validation
- **Component Testing**: React Testing Library integration

## Dependencies and Version Requirements

**Frontend:**
- Node.js: >= 22.0.0
- Next.js: 15.5.3
- React: 19.1.1
- TypeScript: 5.9.2
- Drizzle ORM: 0.44.5+
- Better-Auth: 1.3.9+
