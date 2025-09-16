# TypeScript Style Guide

## Context

Advanced TypeScript conventions and patterns for the MCP Registry Gateway project, complementing the JavaScript style guide with TypeScript-specific best practices.

## TypeScript Configuration

### tsconfig.json Settings
```json
{
  "compilerOptions": {
    "strict": true,                       // Enable all strict type checking
    "noUncheckedIndexedAccess": true,    // Add undefined to index signatures
    "exactOptionalPropertyTypes": true,   // Exact optional property types
    "noImplicitReturns": true,           // Ensure all code paths return
    "noFallthroughCasesInSwitch": true,  // Prevent switch fallthrough
    "skipLibCheck": true,                // Skip type checking of dependencies
    "target": "ES2022",                  // Modern JavaScript features
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

## Type System Fundamentals

### Type vs Interface

#### Use Interface for Object Shapes
```typescript
// ✓ Interfaces for objects that might be extended
interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// ✓ Extending interfaces
interface AdminUser extends User {
  permissions: Permission[]
  canAccessAdmin: true
}

// ✓ Interface merging for module augmentation
interface Window {
  __APP_VERSION__: string
}
```

#### Use Type for Everything Else
```typescript
// ✓ Union types
type Status = "idle" | "loading" | "success" | "error"
type Role = "admin" | "manager" | "developer" | "analyst" | "viewer" | "guest"

// ✓ Intersection types
type UserWithPermissions = User & { permissions: Permission[] }

// ✓ Utility types
type Nullable<T> = T | null
type AsyncData<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

// ✓ Function types
type Callback<T> = (value: T) => void
type AsyncFunction<T> = () => Promise<T>

// ✓ Mapped types
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
}
```

### Generic Types

#### Basic Generics
```typescript
// Generic functions
function identity<T>(value: T): T {
  return value
}

// Generic interfaces
interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

// Generic classes
class Repository<T extends { id: string }> {
  constructor(private items: T[]) {}
  
  findById(id: string): T | undefined {
    return this.items.find(item => item.id === id)
  }
}
```

#### Advanced Generics
```typescript
// Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Conditional types
type IsArray<T> = T extends Array<infer U> ? U : never
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

// Default generics
interface State<T = unknown> {
  value: T
  setValue: (value: T) => void
}
```

### Type Guards

#### User-Defined Type Guards
```typescript
// Type predicate functions
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  )
}

// Usage with narrowing
function processUserData(data: unknown) {
  if (isUser(data)) {
    // TypeScript knows data is User here
    console.log(data.email)
  }
}

// Array type guards
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string")
}
```

#### Discriminated Unions
```typescript
// Tagged union types
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error }

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript knows result.data exists
    console.log(result.data)
  } else {
    // TypeScript knows result.error exists
    console.error(result.error)
  }
}
```

### Utility Types

#### Built-in Utilities
```typescript
// Partial - all properties optional
type PartialUser = Partial<User>

// Required - all properties required
type RequiredUser = Required<User>

// Pick - select properties
type UserCredentials = Pick<User, "email" | "password">

// Omit - exclude properties
type PublicUser = Omit<User, "password" | "internalId">

// Record - object with string keys
type UserMap = Record<string, User>

// Extract/Exclude - filter union types
type AdminRoles = Extract<Role, "admin" | "manager">
type NonAdminRoles = Exclude<Role, "admin" | "manager">
```

#### Custom Utility Types
```typescript
// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Nullable properties
type NullableProps<T> = {
  [K in keyof T]: T[K] | null
}

// Async return type
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never
```

## React TypeScript Patterns

### Component Types

#### Function Components
```typescript
// With FC type (includes children)
import { FC, ReactNode } from "react"

interface ButtonProps {
  variant: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
}

export const Button: FC<ButtonProps> = ({
  variant,
  size = "md",
  onClick,
  disabled = false,
  children
}) => {
  return (
    <button
      className={cn(variants[variant], sizes[size])}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

#### Event Handlers
```typescript
// Typed event handlers
interface FormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

// Generic event handler
type EventHandler<T = HTMLElement> = (
  event: React.SyntheticEvent<T>
) => void
```

### Hook Types

#### State Hooks
```typescript
// Explicit state types
const [user, setUser] = useState<User | null>(null)
const [items, setItems] = useState<Item[]>([])
const [status, setStatus] = useState<Status>("idle")

// State setter functions
const updateUser: React.Dispatch<React.SetStateAction<User | null>> = setUser
```

#### Custom Hook Returns
```typescript
// Tuple return for hook results
function useAuth(): [User | null, boolean, Error | null] {
  // Implementation
  return [user, loading, error]
}

// Object return for named properties
interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: Error | null
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

function useAuth(): UseAuthReturn {
  // Implementation
  return { user, loading, error, login, logout }
}
```

## API Types

### Request/Response Types
```typescript
// API request types
interface PaginationParams {
  page: number
  limit: number
  sort?: string
  order?: "asc" | "desc"
}

interface CreateUserRequest {
  email: string
  name: string
  role: Role
  password: string
}

// API response types
interface ApiResponse<T> {
  data: T
  meta: {
    total: number
    page: number
    limit: number
  }
  links: {
    self: string
    next?: string
    prev?: string
  }
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
  status: number
  timestamp: string
}
```

### Zod Schema Types
```typescript
import { z } from "zod"

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "manager", "developer", "analyst", "viewer", "guest"]),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Infer types from schema
type User = z.infer<typeof UserSchema>

// Input/Output types
type UserInput = z.input<typeof UserSchema>
type UserOutput = z.output<typeof UserSchema>
```

## Environment Variables

### T3 Env Pattern
```typescript
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    REDIS_URL: z.string().url()
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url()
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  }
})

// Type-safe usage
const dbUrl = env.DATABASE_URL // string (guaranteed to exist)
const apiUrl = env.NEXT_PUBLIC_API_URL // string (guaranteed to exist)
```

## Database Types

### Drizzle ORM Types
```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm"
import { users } from "@/db/schema"

// Infer types from schema
type User = InferSelectModel<typeof users>
type NewUser = InferInsertModel<typeof users>

// Query result types
type UserWithPosts = User & {
  posts: Post[]
}

// Transaction types
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
```

## Error Handling

### Custom Error Types
```typescript
// Error class hierarchy
abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly code: string
  
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  readonly statusCode = 400
  readonly code = "VALIDATION_ERROR"
  
  constructor(
    message: string,
    public readonly fields: Record<string, string>
  ) {
    super(message)
  }
}

class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly code = "NOT_FOUND"
  
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
  }
}
```

### Result Types
```typescript
// Result pattern for error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { ok: false, error: "Division by zero" }
  }
  return { ok: true, value: a / b }
}

// Usage
const result = divide(10, 2)
if (result.ok) {
  console.log(result.value) // TypeScript knows value exists
} else {
  console.error(result.error) // TypeScript knows error exists
}
```

## Type Assertions

### When to Use Assertions
```typescript
// ✓ DOM element type narrowing
const input = document.getElementById("email") as HTMLInputElement
input.value = "user@example.com"

// ✓ After validation
const data = JSON.parse(jsonString) as User
// But prefer validation
const validatedData = UserSchema.parse(JSON.parse(jsonString))

// ✗ Avoid lying to TypeScript
const user = {} as User // Dangerous!
```

### Non-null Assertions
```typescript
// Use when you're certain value exists
function processUser(id: string) {
  const user = users.get(id)!  // Only if you're SURE it exists
  // Better: handle the null case
  const safeUser = users.get(id)
  if (!safeUser) throw new Error("User not found")
}
```

## Module Augmentation

### Extending Third-Party Types
```typescript
// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User
      session?: Session
    }
  }
}

// Extend window object
declare global {
  interface Window {
    __APP_CONFIG__: {
      version: string
      environment: "development" | "staging" | "production"
    }
  }
}
```

## Best Practices

### Do's
- ✓ Enable strict mode in tsconfig.json
- ✓ Use explicit return types for public APIs
- ✓ Leverage type inference for local variables
- ✓ Create type-safe wrappers for external APIs
- ✓ Use discriminated unions for state machines
- ✓ Document complex types with JSDoc

### Don'ts
- ✗ Don't use `any` (use `unknown` if needed)
- ✗ Don't use `as` assertions unnecessarily
- ✗ Don't ignore TypeScript errors with @ts-ignore
- ✗ Don't create unnecessary type annotations
- ✗ Don't use `Function` type (be specific)
- ✗ Don't mutate readonly properties

## Type Testing

### Type-Level Tests
```typescript
// Test type equality
type Expect<T extends true> = T
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

// Type tests
type test1 = Expect<Equal<User["role"], Role>> // Should pass
type test2 = Expect<Equal<string, number>> // Should fail
```

### Runtime Type Checking
```typescript
// Development-only runtime checks
if (process.env.NODE_ENV === "development") {
  console.assert(isUser(data), "Expected User type")
}

// Production validation with Zod
const safeData = UserSchema.safeParse(data)
if (!safeData.success) {
  console.error("Validation failed:", safeData.error)
}
```