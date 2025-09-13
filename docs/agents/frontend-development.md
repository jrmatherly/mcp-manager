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
npm run db:migrate                     # apply migrations to database
npm run db:push                        # push schema changes directly
npm run db:studio                      # open Drizzle Studio GUI
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

## Dependencies and Version Requirements

**Frontend:**
- Node.js: >= 18
- Next.js: 15.5.3
- React: 19.1.1
- TypeScript: 5.9.2
