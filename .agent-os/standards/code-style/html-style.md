# HTML/JSX Style Guide

## Context

HTML and JSX styling conventions for the MCP Registry Gateway project using React/Next.js with TypeScript.

## JSX vs HTML

This project uses JSX/TSX for component markup, not traditional HTML. Key differences:
- `className` instead of `class`
- `htmlFor` instead of `for`
- camelCase for attributes (`onClick`, `onChange`)
- Self-closing tags for components without children

## Structure Rules

### Indentation
- Use 2 spaces for indentation (never tabs)
- Align JSX elements consistently
- Maintain readable hierarchy

### Component Structure
```tsx
// Single element - inline
<Button variant="primary">Click me</Button>

// Multiple props - multi-line
<Button
  variant="primary"
  size="lg"
  onClick={handleClick}
  disabled={isLoading}
>
  Click me
</Button>

// Complex nested structure
<Card className="p-6">
  <CardHeader>
    <CardTitle>Dashboard</CardTitle>
    <CardDescription>
      System overview and metrics
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid gap-4">
      {/* Content here */}
    </div>
  </CardContent>
</Card>
```

## Attribute Formatting

### Single Attribute
```tsx
<div className="container">Content</div>
```

### Multiple Attributes
Place each attribute on its own line when there are 3+ attributes:
```tsx
<Button
  variant="primary"
  size="lg"
  onClick={handleClick}
  disabled={isLoading}
  aria-label="Submit form"
>
  Submit
</Button>
```

### Boolean Attributes
```tsx
// Explicit true
<Input disabled={true} />

// Implicit true (preferred for readability)
<Input disabled />

// False value
<Input disabled={false} />
```

## Conditional Rendering

### Ternary for Elements
```tsx
{isLoggedIn ? (
  <UserProfile user={user} />
) : (
  <LoginForm />
)}
```

### Logical AND for Show/Hide
```tsx
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
```

### Early Returns in Components
```tsx
function Component() {
  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return <MainContent />
}
```

## Mapping and Lists

### Array Mapping
```tsx
<ul className="space-y-2">
  {items.map((item) => (
    <li key={item.id} className="p-2">
      {item.name}
    </li>
  ))}
</ul>
```

### Fragment Usage
```tsx
// Named Fragment
<React.Fragment key={item.id}>
  <dt>{item.term}</dt>
  <dd>{item.description}</dd>
</React.Fragment>

// Short Fragment syntax (when no key needed)
<>
  <Header />
  <Main />
  <Footer />
</>
```

## Event Handlers

### Inline Functions (Simple Cases)
```tsx
<button onClick={() => setCount(count + 1)}>
  Increment
</button>
```

### Extracted Handlers (Complex Logic)
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  // Complex logic here
}

<form onSubmit={handleSubmit}>
  {/* Form fields */}
</form>
```

## Form Elements

### Controlled Inputs
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter text"
  className="input"
/>
```

### Select Elements
```tsx
<select
  value={selected}
  onChange={(e) => setSelected(e.target.value)}
  className="select"
>
  <option value="">Choose...</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

## Accessibility

### ARIA Attributes
```tsx
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
  <X className="h-4 w-4" />
</button>
```

### Semantic HTML
```tsx
// Use semantic elements
<nav>{/* Navigation items */}</nav>
<main>{/* Main content */}</main>
<aside>{/* Sidebar content */}</aside>
<footer>{/* Footer content */}</footer>

// Headings hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

## Next.js Specific

### Link Component
```tsx
import Link from "next/link"

<Link href="/dashboard" className="link">
  Dashboard
</Link>
```

### Image Component
```tsx
import Image from "next/image"

<Image
  src="/logo.png"
  alt="Company Logo"
  width={200}
  height={50}
  priority
/>
```

### Client Components
```tsx
"use client"

export function InteractiveComponent() {
  // Component with client-side interactivity
}
```

## Component Composition

### Children Props
```tsx
<Layout>
  <Header />
  <MainContent>
    {children}
  </MainContent>
  <Footer />
</Layout>
```

### Render Props
```tsx
<DataProvider
  render={(data) => (
    <DataDisplay data={data} />
  )}
/>
```

### Compound Components
```tsx
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

## Best Practices

### Do's
- ✓ Use semantic HTML elements
- ✓ Add proper ARIA labels for accessibility
- ✓ Keep JSX readable with proper formatting
- ✓ Extract complex logic to handlers
- ✓ Use fragments to avoid wrapper divs
- ✓ Provide meaningful keys for lists

### Don'ts
- ✗ Don't use array indexes as keys (unless items never reorder)
- ✗ Don't put complex logic in JSX
- ✗ Don't forget alt text for images
- ✗ Don't nest ternary operators
- ✗ Don't mutate props or state directly

## Common Patterns

### Loading States
```tsx
{isLoading ? (
  <div className="flex justify-center p-8">
    <Spinner />
  </div>
) : (
  <Content data={data} />
)}
```

### Error Boundaries
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <RiskyComponent />
</ErrorBoundary>
```

### Suspense
```tsx
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```
