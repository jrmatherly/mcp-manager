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

## Theme-Aware Styling

### TailwindCSS v4 Integration

The project uses **TailwindCSS v4** with CSS-first configuration and enhanced performance. For detailed guidance, see **[TailwindCSS v4 Guide](./tailwind-v4-guide.md)**.

#### Configuration Structure
- **PostCSS Plugin**: `@tailwindcss/postcss` for enhanced performance
- **CSS-First Config**: Theme configuration in `globals.css` using `@theme` directive
- **Semantic Color System**: Theme-aware tokens like `bg-card`, `text-foreground`
- **Custom Shadow Utilities**: Enhanced shadows visible in dark mode

### Key Styling Patterns

#### Semantic Color Usage
```tsx
// ❌ Avoid hardcoded colors
<div className="bg-white text-black border-gray-300">

// ✅ Use semantic tokens
<div className="bg-card text-card-foreground border-border">

// ✅ Theme-aware variants for status colors
<Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
  Success
</Badge>
```

#### Enhanced Shadow System
Standard Tailwind shadows (`shadow-md`, `shadow-lg`) are invisible in dark mode. Use custom utilities:

```tsx
// ❌ Invisible in dark mode
<Card className="hover:shadow-md">

// ✅ Visible in both themes
<Card className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5">

// Available shadow variants:
// - shadow-card-hover: Basic theme-aware shadow
// - shadow-card-hover-enhanced: Enhanced with glow effect
// - shadow-card-subtle-enhanced: Subtle variant
// - shadow-card-strong-enhanced: Strong variant with dual-color glow
```

#### Glassmorphism Effects
```tsx
// Basic glass surface
<div className="glass-surface p-6">
  <h3 className="text-foreground">Glass Card</h3>
</div>

// Interactive glass element
<button className="glass-interactive px-4 py-2">
  Click Me
</button>

// Themed glass containers
<div className="glass-primary p-4">
  Primary themed content
</div>
```

#### Dark Mode Best Practices
```tsx
// Logo background fix
<div className="bg-background/80 border border-border/40">
  <Image src="/logo.png" alt="Logo" />
</div>

// Status indicators with proper variants
<span className={cn(
  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
  status === "active" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
)}>
  {status}
</span>

// Interactive cards with enhanced hover
<Card className="transition-all hover:shadow-card-hover-enhanced hover:-translate-y-0.5">
  <CardContent>
    Card content with enhanced hover effect
  </CardContent>
</Card>
```

### Theme System Components

#### Theme Provider Setup
```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### Theme Toggle Component
```tsx
// components/theme-toggle.tsx
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="glass-interactive p-2 rounded-lg"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
```

### Migration Guidelines

#### From Hardcoded to Semantic Colors
```tsx
// Before: Static colors (problematic)
<div className="bg-gray-100 text-gray-900 border-gray-300">

// After: Semantic colors (recommended)
<div className="bg-muted text-foreground border-border">
```

#### Shadow Enhancement
```tsx
// Replace all instances of standard shadows:
// hover:shadow-md → hover:shadow-card-hover-enhanced hover:-translate-y-0.5
// hover:shadow-lg → hover:shadow-card-hover-enhanced hover:-translate-y-0.5
// hover:shadow-xl → hover:shadow-card-strong-enhanced hover:-translate-y-1
```

### Testing Theme Components

#### Test Both Themes
```typescript
// Example component test with theme variants
import { render, screen } from "../utils/test-utils";
import { ThemeProvider } from "@/components/theme-provider";

describe("UserCard", () => {
  it("renders correctly in light theme", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <UserCard user={mockUser} />
      </ThemeProvider>
    );
    // Test light theme rendering
  });

  it("renders correctly in dark theme", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <UserCard user={mockUser} />
      </ThemeProvider>
    );
    // Test dark theme rendering
  });
});
```

### Common Issues and Solutions

#### Issue: Logo has white background in dark mode
```tsx
// Solution: Use theme-aware background
<div className="bg-background/80 border border-border/40 rounded-lg p-2">
  <Image src="/logo.png" alt="Logo" />
</div>
```

#### Issue: Shadows not visible in dark mode
```tsx
// Solution: Replace with custom shadow utilities
className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5"
```

#### Issue: Inconsistent colors across themes
```tsx
// Solution: Use semantic color tokens
// bg-white → bg-card
// text-black → text-foreground
// text-gray-600 → text-muted-foreground
```

For comprehensive styling guidelines, see:
- **[TailwindCSS v4 Guide](./tailwind-v4-guide.md)** - Complete v4 migration and usage guide
- **[Frontend Styling Guide](./frontend-styling.md)** - Glassmorphism design system and theme architecture

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

### Theme-Aware UI System (TailwindCSS v4)
- **Comprehensive Dark Mode Support**: Seamless theme switching with persistent preferences
- **Glassmorphism Design System**: Modern glass-like UI with backdrop filters
- **Enhanced Shadow Utilities**: Custom shadow classes for dark mode visibility
- **Semantic Color Tokens**: Theme-aware colors using `bg-card`, `text-foreground`, etc.
- **TailwindCSS v4 Integration**: CSS-first configuration with PostCSS plugin
- **Performance-Optimized Glass Effects**: Device-aware glassmorphism with mobile optimization

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
- **Client-Side Route Protection**: Admin routes use client components for authentication checking
- **Role Mapping**: Azure AD groups automatically map to Better-Auth roles during OAuth
- **Environment Variable Integration**: T3 Env provides type-safe configuration handling

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
- **Theme Testing**: Component testing in both light and dark modes
- **Database Testing**: Comprehensive database optimization test suite
- **BigInt Support**: Configured for PostgreSQL BigInt compatibility
- **Performance Testing**: Database query performance validation
- **Component Testing**: React Testing Library integration with theme provider mocking
- **Visual Regression Testing**: Ensure glassmorphism effects render consistently

## Authentication Patterns

### Client-Side Route Protection
Admin routes use client-side authentication checking for better user experience:

```typescript
// /admin/client-layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

export default function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        logger.warn("Admin layout: No session, redirecting to login");
        router.push("/auth/login");
        return;
      }

      const userRole = (session.user as { role?: string })?.role;
      if (userRole !== "admin") {
        logger.warn("Admin layout: User does not have admin role", {
          userId: session.user.id,
          actualRole: userRole,
          requiredRole: "admin",
        });
        router.push("/dashboard"); // Graceful redirect to dashboard
        return;
      }
    }
  }, [session, isPending, router]);

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!session?.user || (session.user as { role?: string })?.role !== "admin") {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
```

### Role-Based Access Control
Azure AD groups are mapped to Better-Auth roles during OAuth callbacks:

```typescript
// /lib/auth/config.ts
export const APP_ROLE_MAPPINGS = {
  azure: [
    // Azure AD Security Groups
    { azureRole: "SG WLH Admins", betterAuthRole: "admin", description: "WLH Admin Security Group" },
    { azureRole: "SG MEM SSC Users", betterAuthRole: "user", description: "MEM SSC Users Security Group" },

    // Azure AD app roles
    { azureRole: "admin", betterAuthRole: "admin", description: "MCP Registry Gateway Administrator" },
    { azureRole: "Server Owner", betterAuthRole: "server_owner", description: "MCP Server Owner" },
    { azureRole: "User", betterAuthRole: "user", description: "Standard user role" },
  ] as AzureRoleMapping[],
};
```

### OAuth Role Synchronization
Roles are automatically synchronized during OAuth callbacks:

```typescript
// /hooks/use-oauth-role-sync.ts
export function createOAuthRoleSyncMiddleware() {
  return createAuthMiddleware(async (ctx) => {
    const pathIncludesCallback = ctx.path?.includes("/callback/");

    if (pathIncludesCallback && ctx.context?.newSession?.user) {
      const userWithRole = ctx.context.newSession.user as AuthSession["user"];

      // Extract roles from OAuth tokens and map to Better-Auth roles
      const extractedRoles = extractRolesFromTokens(tokens);
      const mappedRole = mapAzureRolesToBetterAuth(extractedRoles, roleMappings);

      // Update user role in database
      await syncUserRole({ user: { ...userWithRole, role: mappedRole } }, options);
    }
  });
}
```

### Environment Variable Best Practices
The project uses T3 Env for type-safe environment variable handling:

```typescript
// /src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Server-only variables
    DATABASE_URL: z.string().url(),
    AZURE_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
  },
  client: {
    // Client-side variables (must be prefixed with NEXT_PUBLIC_)
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
```

**Usage Guidelines**:
- **App Code**: Use `import { env } from "@/env"` for type-safe access
- **CLI Scripts**: Use `import "dotenv/config"` for scripts running outside Next.js
- **Client Components**: Only access `NEXT_PUBLIC_` prefixed variables
- **Server Components**: Can access both server and client variables

### Debugging Authentication
Use the debug endpoint for troubleshooting authentication issues:

```bash
# Check current session status
curl http://localhost:3000/api/debug/session

# Expected response for authenticated admin:
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "role": "admin"
  },
  "session": {
    "id": "session-id",
    "userId": "user-id",
    "expiresAt": "2024-01-15T10:00:00.000Z"
  }
}
```

## Dependencies and Version Requirements

**Frontend:**
- Node.js: >= 22.0.0
- Next.js: 15.5.3
- React: 19.1.1
- TypeScript: 5.9.2
- TailwindCSS: 4.1.13 (with PostCSS plugin)
- next-themes: 0.4.6 (theme management)
- Framer Motion: Latest (theme transitions)
- Drizzle ORM: 0.44.5+
- Better-Auth: 1.3.9+
- T3 Env: Latest (for type-safe environment variables)
- Zod: Latest (for validation schemas)

**Theme System:**
- **TailwindCSS v4**: Enhanced performance with PostCSS integration
- **Glassmorphism Components**: Comprehensive design system with accessibility support
- **Dark Mode Infrastructure**: Advanced theme detection and management
- **Custom Utilities**: Enhanced shadow system for dark mode visibility
