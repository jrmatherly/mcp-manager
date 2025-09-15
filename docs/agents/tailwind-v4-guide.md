# TailwindCSS v4 Guide for MCP Manager

## Overview

This guide documents how to properly use TailwindCSS v4 in the MCP Manager project, including theme-aware styling, dark mode support, and custom utilities.

## Table of Contents

- [TailwindCSS v4 Configuration](#tailwindcss-v4-configuration)
- [Theme-Aware Styling](#theme-aware-styling)
- [Dark Mode Implementation](#dark-mode-implementation)
- [Custom Shadow Classes](#custom-shadow-classes)
- [Glassmorphism Effects](#glassmorphism-effects)
- [Common Patterns](#common-patterns)
- [Migration from v3](#migration-from-v3)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## TailwindCSS v4 Configuration

### CSS-First Configuration

TailwindCSS v4 uses a CSS-first configuration approach with the `@theme` directive in `globals.css`:

```css
@import "tailwindcss";

/* Theme configuration using @theme directive */
@theme {
  /* Custom theme values go here */
}
```

### Important v4 Changes

1. **@variant instead of @custom-variant**:
   ```css
   /* ❌ Old (v3) */
   @custom-variant dark (&:is(.dark *))

   /* ✅ New (v4) */
   @variant dark (.dark &)
   ```

2. **@apply limitations**:
   - Cannot use `@apply` with classes defined in `@layer components`
   - Must use explicit CSS properties instead

## Theme-Aware Styling

### Semantic Color Tokens

Always use semantic color tokens instead of hardcoded colors:

| ❌ Avoid | ✅ Use Instead | Purpose |
|----------|----------------|---------|
| `bg-gray-200` | `bg-muted` | Muted backgrounds |
| `text-gray-600` | `text-muted-foreground` | Secondary text |
| `bg-white` | `bg-background` | Primary backgrounds |
| `text-black` | `text-foreground` | Primary text |
| `border-gray-300` | `border-border` | Borders |
| `bg-gray-50` | `bg-card` | Card backgrounds |

### Dark Mode Variants

For colors that need specific dark mode variants:

```tsx
// ✅ Correct pattern for variant colors
className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"

// Pattern breakdown:
// Light: bg-{color}-50, text-{color}-700, border-{color}-200
// Dark: bg-{color}-900/20, text-{color}-300, border-{color}-800
```

## Dark Mode Implementation

### Shadow Effects in Dark Mode

Standard Tailwind shadows (`shadow-md`, `shadow-lg`) are not visible in dark mode. Use our custom shadow utilities:

```tsx
// ❌ Invisible in dark mode
className="hover:shadow-md"

// ✅ Visible in both modes
className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5"
```

### Custom Shadow Classes

Defined in `src/styles/tailwind-utilities.css`:

#### Basic Card Shadow
```css
.shadow-card-hover {
  /* Light mode */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .shadow-card-hover {
  /* Dark mode with light border and inset highlight */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 2px 4px -1px rgba(0, 0, 0, 0.2),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

#### Enhanced Shadow with Glow
```css
.shadow-card-hover-enhanced {
  /* Light mode */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06),
              0 0 0 1px rgba(0, 0, 0, 0.05);
}

.dark .shadow-card-hover-enhanced {
  /* Dark mode with blue/purple glow */
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.6),
              0 4px 6px -2px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              0 0 30px rgba(59, 130, 246, 0.25),
              0 0 60px rgba(147, 51, 234, 0.1);
}
```

### Available Shadow Variants

- `shadow-card-hover` - Basic theme-aware shadow
- `shadow-card-hover-enhanced` - Enhanced with glow effect (recommended)
- `shadow-card-subtle-enhanced` - Subtle variant with less glow
- `shadow-card-strong-enhanced` - Strong variant with dual-color glow

## Glassmorphism Effects

### Glass Surface Classes

```tsx
// Basic glass surface
className="glass-surface"

// Variants
className="glass-surface-subtle"  // Less opacity
className="glass-surface-strong"  // More opacity

// Interactive glass elements
className="glass-interactive"  // Includes hover states

// Themed glass containers
className="glass-primary"  // Primary color tinted
className="glass-accent"   // Accent color tinted
```

### Backdrop Utilities

```tsx
// Backdrop blur effects
className="backdrop-glass"     // Standard blur (12px)
className="backdrop-glass-sm"  // Small blur (6px)
className="backdrop-glass-lg"  // Large blur (20px)
```

## Common Patterns

### Card Components

```tsx
// Standard card with hover effect
<Card className="transition-all hover:shadow-card-hover-enhanced hover:-translate-y-0.5">
  {/* Card content */}
</Card>
```

### Status Indicators

```tsx
// Success state
className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"

// Warning state
className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800"

// Error state
className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"

// Info state
className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
```

### Theme-Aware Backgrounds

```tsx
// Logo or icon container
className="bg-background/80 border border-border/40"

// Modal or overlay backgrounds
className="bg-background/95 backdrop-blur"

// Hover states
className="hover:bg-accent hover:text-accent-foreground"
```

## Migration from v3

### Key Changes

1. **Replace @custom-variant**:
   ```css
   /* Find and replace in globals.css */
   @custom-variant dark (&:is(.dark *))
   /* With */
   @variant dark (.dark &)
   ```

2. **Fix @apply usage**:
   ```css
   /* ❌ Cannot do this in v4 */
   .my-class {
     @apply glass-surface;  /* If glass-surface is in @layer components */
   }

   /* ✅ Use explicit properties instead */
   .my-class {
     backdrop-filter: blur(12px) saturate(150%);
     background: rgba(255, 255, 255, 0.8);
     /* ... other properties */
   }
   ```

3. **Update shadow classes**:
   ```tsx
   // Find all instances of
   hover:shadow-md
   hover:shadow-lg
   hover:shadow-xl

   // Replace with
   hover:shadow-card-hover-enhanced hover:-translate-y-0.5
   ```

## Best Practices

### 1. Always Use Semantic Tokens

```tsx
// ❌ Bad
<div className="bg-gray-100 dark:bg-gray-900">

// ✅ Good
<div className="bg-muted">
```

### 2. Test in Both Themes

Always verify your components look good in both light and dark modes:
- Toggle theme using the navbar theme switcher
- Check contrast ratios
- Verify shadow visibility
- Ensure hover states work

### 3. Consistent Hover Effects

```tsx
// Standard pattern for interactive cards
className="transition-all hover:shadow-card-hover-enhanced hover:-translate-y-0.5"
```

### 4. Avoid Hardcoded Colors

```tsx
// ❌ Bad - hardcoded colors
<div className="text-green-600">

// ✅ Good - with dark mode variant
<div className="text-green-600 dark:text-green-400">

// ✅ Better - semantic token if available
<div className="text-success">
```

### 5. Component-Specific Shadows

Use the appropriate shadow variant based on component importance:
- Navigation/Headers: `shadow-card-hover`
- Interactive cards: `shadow-card-hover-enhanced`
- Subtle elements: `shadow-card-subtle-enhanced`
- CTAs/Important: `shadow-card-strong-enhanced`

## Troubleshooting

### Issue: Shadows not visible in dark mode

**Solution**: Replace standard Tailwind shadows with custom utilities:
```tsx
// Replace
hover:shadow-md
// With
hover:shadow-card-hover-enhanced
```

### Issue: @apply not working with custom utilities

**Solution**: In Tailwind v4, you cannot use `@apply` with `@layer components` classes. Use explicit CSS properties instead.

### Issue: Dark mode not applying

**Solution**: Ensure the dark variant syntax is correct:
```css
/* Correct v4 syntax */
@variant dark (.dark &)
```

### Issue: Colors look wrong in dark mode

**Solution**: Use proper dark mode variants:
```tsx
// Pattern for colored elements
className="bg-{color}-50 text-{color}-700 dark:bg-{color}-900/20 dark:text-{color}-300"
```

### Issue: Glass effects not working

**Solution**: Ensure you're importing the custom utilities:
```tsx
// The glass utilities are defined in src/styles/tailwind-utilities.css
// Make sure it's imported in your globals.css
```

## Component Examples

### Stats Card with Full Theme Support

```tsx
export function StatsCard({ title, value, variant = "default" }) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-card-hover-enhanced hover:-translate-y-0.5",
      variant === "success" && "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20"
    )}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Theme-Aware Badge

```tsx
export function StatusBadge({ status }) {
  return (
    <Badge className={cn(
      "flex items-center gap-1",
      status === "active" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      status === "error" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
    )}>
      {status}
    </Badge>
  );
}
```

### Glass Navigation Bar

```tsx
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center">
        {/* Logo with theme-aware background */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 border border-border/40">
          <Image src="/logo.png" alt="Logo" width={24} height={24} />
        </div>
      </div>
    </nav>
  );
}
```

## Resources

- [TailwindCSS v4 Documentation](https://tailwindcss.com/docs)
- [Frontend Development Guide](./frontend-development.md) - Complete frontend development patterns
- [Frontend Styling Guide](./frontend-styling.md) - Glassmorphism design system and theme architecture
- [Testing & Quality Guide](./testing-quality.md) - Theme testing patterns
- [Custom Utilities Source](../../frontend/src/styles/tailwind-utilities.css)

---

*Last updated: Based on project learnings and implementations as of the current date*