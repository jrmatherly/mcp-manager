# JavaScript/TypeScript Style Guide

## Context

JavaScript and TypeScript conventions for the MCP Registry Gateway project using Next.js, React, and Node.js.

## TypeScript First

This project uses TypeScript exclusively. All `.js` files should be `.ts` or `.tsx`.

## Language Features

### Variable Declarations
```typescript
// Use const by default
const API_URL = "https://api.example.com"
const user = { name: "John", age: 30 }

// Use let for reassignment
let counter = 0
counter++

// Never use var
var oldStyle = "deprecated" // ✗ Never
```

### Type Annotations

#### Explicit Return Types
```typescript
// Always specify return types
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Async functions
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}
```

#### Interface vs Type
```typescript
// Use interface for objects that can be extended
interface User {
  id: string
  name: string
  email: string
}

// Use type for unions, intersections, and utilities
type Status = "pending" | "active" | "inactive"
type UserWithRole = User & { role: Role }
type Nullable<T> = T | null
```

### Functions

#### Arrow Functions (Preferred)
```typescript
// Simple functions
const add = (a: number, b: number): number => a + b

// Component functions
const Button = ({ children, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>
}

// Async operations
const fetchData = async (): Promise<Data> => {
  const response = await fetch("/api/data")
  return response.json()
}
```

#### Function Declarations (When Needed)
```typescript
// Hoisted functions or recursive functions
function processTree(node: TreeNode): void {
  // Process current node
  node.children.forEach(child => processTree(child))
}
```

### Destructuring

#### Object Destructuring
```typescript
// Props destructuring
const { name, email, role = "user" } = user

// With renaming
const { id: userId, name: userName } = user

// Nested destructuring
const { data: { items = [] } = {} } = response
```

#### Array Destructuring
```typescript
const [first, second, ...rest] = array
const [value, setValue] = useState<string>("")
```

### Async/Await

#### Error Handling
```typescript
// Try-catch for async operations
const fetchUserData = async (id: string): Promise<Result<User>> => {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) throw new Error("User not found")
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error("Failed to fetch user:", error)
    return { success: false, error: String(error) }
  }
}
```

#### Parallel Operations
```typescript
// Promise.all for parallel execution
const [users, posts, comments] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments(),
])

// Promise.allSettled for resilient parallel execution
const results = await Promise.allSettled([
  fetchPrimary(),
  fetchSecondary(),
  fetchTertiary(),
])
```

### Modern JavaScript Features

#### Optional Chaining
```typescript
const city = user?.address?.city ?? "Unknown"
const length = array?.length ?? 0
```

#### Nullish Coalescing
```typescript
const port = process.env.PORT ?? 3000
const name = user.name ?? "Anonymous"
```

#### Template Literals
```typescript
const message = `Welcome, ${user.name}!`
const multiline = `
  Dear ${user.name},

  Thank you for your order #${orderId}.
`
```

## React Patterns

### Hooks

#### State Management
```typescript
const [count, setCount] = useState<number>(0)
const [user, setUser] = useState<User | null>(null)
const [items, setItems] = useState<Item[]>([])
```

#### Effects
```typescript
useEffect(() => {
  // Effect logic
  const subscription = subscribe()

  // Cleanup function
  return () => {
    subscription.unsubscribe()
  }
}, [dependency])
```

#### Custom Hooks
```typescript
// Always prefix with 'use'
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Hook logic

  return { user, loading, login, logout }
}
```

### Component Patterns

#### Functional Components
```typescript
// With props interface
interface CardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn("card", className)}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
```

#### Memo and Callbacks
```typescript
// Memoized component
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <ComplexVisualization data={data} />
})

// Memoized callback
const handleClick = useCallback((id: string) => {
  // Handle click
}, [dependency])

// Memoized value
const processedData = useMemo(() => {
  return expensiveProcessing(rawData)
}, [rawData])
```

## Import Organization

### Import Order
```typescript
// 1. React/Next.js
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 2. Third-party libraries
import { z } from "zod"
import { format } from "date-fns"

// 3. Internal absolute imports
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"

// 4. Relative imports
import { localHelper } from "./utils"

// 5. Type imports
import type { User, Session } from "@/types"
```

### Barrel Exports
```typescript
// components/ui/index.ts
export { Button } from "./button"
export { Card } from "./card"
export { Input } from "./input"

// Usage
import { Button, Card, Input } from "@/components/ui"
```

## Error Handling

### Custom Error Classes
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}
```

### Error Boundaries
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error boundary caught:", error, info)
  }
}
```

## Testing Patterns

### Unit Tests
```typescript
describe("calculateTotal", () => {
  it("should sum all item prices", () => {
    const items = [
      { price: 10 },
      { price: 20 },
      { price: 30 }
    ]
    expect(calculateTotal(items)).toBe(60)
  })
})
```

### Component Tests
```typescript
describe("Button", () => {
  it("should render with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("should call onClick when clicked", async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    await userEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

## Performance

### Code Splitting
```typescript
// Dynamic imports
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <Spinner />,
  ssr: false
})
```

### Lazy Loading
```typescript
const LazyComponent = lazy(() => import("./LazyComponent"))

// In JSX
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

## Best Practices

### Do's
- ✓ Use TypeScript strict mode
- ✓ Provide explicit return types
- ✓ Handle errors properly
- ✓ Use async/await over promises
- ✓ Leverage TypeScript inference where obvious
- ✓ Write pure functions when possible

### Don'ts
- ✗ Don't use `any` type (use `unknown` if needed)
- ✗ Don't mutate arrays/objects directly
- ✗ Don't use `==` (use `===`)
- ✗ Don't ignore TypeScript errors
- ✗ Don't use synchronous operations for I/O
- ✗ Don't create unnecessary abstractions

## Code Comments

### JSDoc for Functions
```typescript
/**
 * Calculates the rate limit based on user role
 * @param role - The user's role
 * @returns Rate limit in requests per minute
 */
export function calculateRateLimit(role: UserRole): number {
  // Implementation
}
```

### Inline Comments
```typescript
// TODO: Implement caching mechanism
// FIXME: Handle edge case for empty arrays
// NOTE: This is a temporary workaround for issue #123
```
