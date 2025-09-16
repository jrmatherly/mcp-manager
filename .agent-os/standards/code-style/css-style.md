# CSS Style Guide

## Context

CSS styling conventions for the MCP Registry Gateway project using TailwindCSS v4 with a theme-aware design system featuring glassmorphism effects, dark mode support, and Radix UI integration.

## Technology Stack

- **Framework**: TailwindCSS v4.1.13 with CSS variables and inline theme configuration
- **UI Components**: Radix UI with custom Tailwind styling
- **Theme System**: CSS custom properties with automatic light/dark mode switching
- **Effects**: Glassmorphism, backdrop filters, enhanced shadows, and 3D transforms
- **Font**: Inter (Google Fonts) with system fallbacks
- **Browser Support**: Modern browsers with progressive enhancement fallbacks

## TailwindCSS v4 Configuration

### Theme Variables (CSS Custom Properties)
The project uses CSS custom properties for theme-aware colors defined in `frontend/src/app/globals.css`:

```css
/* Light mode variables */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.205 0 0);
  --card: oklch(1 0 0);
  --border: oklch(0.92 0.004 286.32);
}

/* Dark mode automatically switches */
.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --card: oklch(0.141 0.005 285.823);
  --border: oklch(0.274 0.006 286.033);
}
```

### Color System
- **Semantic naming**: Use `bg-background`, `text-foreground`, `border-border`
- **Theme awareness**: All colors automatically adapt to light/dark mode
- **Glassmorphism colors**: Extended palette with transparency variants
- **Never hardcode colors**: Always use theme variables

```tsx
// ✓ Correct - Theme-aware
<div className="bg-background text-foreground border-border">

// ✗ Wrong - Hardcoded colors
<div className="bg-white text-black border-gray-200">
```

## Class Organization

### Multi-line Formatting
When using multiple Tailwind classes, organize them logically by category:

```tsx
<div className="
  /* Layout & Display */
  flex flex-col gap-4

  /* Sizing & Spacing */
  w-full max-w-4xl p-6

  /* Colors & Theming */
  bg-background text-foreground

  /* Borders & Shadows */
  border border-border rounded-xl shadow-sm

  /* Glassmorphism Effects */
  backdrop-blur-lg glass-surface

  /* Dark Mode Overrides */
  dark:bg-card dark:border-border

  /* Responsive Modifiers */
  sm:p-8 sm:gap-6
  md:flex-row md:gap-8
  lg:p-10

  /* Interactive States */
  hover:shadow-card-hover-enhanced hover:border-primary/50
  focus:outline-none focus:ring-2 focus:ring-primary

  /* Animations & Transitions */
  transition-all duration-300
">
```

### Responsive Design
- **Mobile-first approach**: Base styles for mobile, progressive enhancement
- **Standard breakpoints**: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px), `2xl:` (1536px)
- **No custom 'xs' breakpoint**: Use default styles for smallest screens
- **Container queries**: Available for component-level responsive design

## Glassmorphism Design System

### Core Glass Components
The project implements a comprehensive glassmorphism system with predefined classes:

```tsx
/* Basic Glass Surface */
<div className="glass-surface">
  /* Automatic backdrop blur, transparency, and borders */
</div>

/* Glass Variants */
<div className="glass-surface-subtle">   /* Light transparency */
<div className="glass-surface">          /* Standard transparency */
<div className="glass-surface-strong">   /* High transparency */

/* Interactive Glass */
<div className="glass-interactive">      /* Hover effects included */

/* Themed Glass */
<div className="glass-primary">          /* Primary color tinted */
<div className="glass-accent">           /* Accent color tinted */
```

### Glass Component Patterns

#### Glass Cards
```tsx
<div className="glass-card hover:-translate-y-0.5 transition-all duration-300">
  <div className="p-6">
    <h3 className="font-semibold text-foreground">Card Title</h3>
    <p className="text-muted-foreground">Card content</p>
  </div>
</div>
```

#### Glass Navigation
```tsx
<nav className="glass-nav sticky top-0 z-50">
  <div className="flex items-center justify-between p-4">
    <div className="glass-nav-item active">Home</div>
    <div className="glass-nav-item">Dashboard</div>
  </div>
</nav>
```

#### Glass Form Elements
```tsx
<input className="glass-input w-full px-3 py-2 rounded-lg" />
<textarea className="glass-textarea w-full px-3 py-2 rounded-lg" />
<select className="glass-select w-full px-3 py-2 rounded-lg" />
```

## Component Patterns

### Enhanced Card System
```tsx
<Card className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5 transition-all">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Server Status</CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-foreground">
      {value.toLocaleString()}
    </div>
    <p className="text-xs text-muted-foreground">
      {description}
    </p>
  </CardContent>
</Card>
```

### Button Variants with Glass Effects
```tsx
/* Primary Glass Button */
<button className="glass-button">
  Primary Action
</button>

/* Secondary Glass Button */
<button className="btn-glass-secondary">
  Secondary Action
</button>

/* Danger Glass Button */
<button className="btn-glass-danger">
  Destructive Action
</button>
```

### Status Badges with Glass
```tsx
/* Status variants with glassmorphism */
<span className="glass-badge">Active</span>
<span className="glass-badge-warning">Warning</span>
<span className="glass-badge-error">Error</span>
<span className="glass-badge-info">Info</span>
```

## Theme-Aware Shadow System

### Enhanced Shadow Variants
```tsx
/* Theme-aware shadows that adapt to light/dark mode */
<div className="shadow-card-hover">               /* Standard hover shadow */
<div className="shadow-card-hover-enhanced">      /* Enhanced with glow effects */
<div className="shadow-card-subtle-enhanced">     /* Subtle with dark mode enhancements */
<div className="shadow-card-strong-enhanced">     /* Strong with dramatic dark mode effects */
```

### Dark Mode Shadow Enhancement
Dark mode shadows include:
- **Multiple shadow layers** for depth
- **Colored glow effects** (blue/purple)
- **Inset highlights** for glass effect
- **Border glow** for definition

## Radix UI Integration

### Data Attribute Styling
Radix UI components use data attributes for state management:

```tsx
<div className="
  data-[state=open]:animate-in
  data-[state=closed]:animate-out
  data-[state=closed]:fade-out-0
  data-[state=open]:fade-in-0
  data-[side=top]:slide-in-from-bottom-2
  data-[side=bottom]:slide-in-from-top-2
">
```

### Focus and Accessibility
```tsx
<button className="
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
  aria-invalid:ring-destructive/20
  dark:aria-invalid:ring-destructive/40
">
```

## Animation and Interaction Guidelines

### Transition Standards
- **Standard duration**: `duration-200` for UI interactions
- **Complex animations**: `duration-300` for card hovers and glass effects
- **Theme transitions**: `duration-300` for smooth light/dark mode switching

### Glass-Specific Animations
```tsx
/* Floating animation for hero elements */
<div className="float-animation">

/* Glass shimmer for loading states */
<div className="glass-skeleton animate-glass-shimmer">

/* MCP connection pulse */
<div className="mcp-connection-indicator">

/* Micro interactions */
<button className="micro-bounce">
```

### Custom Keyframes Available
- `float`: Gentle up/down movement
- `glass-shimmer`: Loading shimmer effect
- `mcp-pulse`: Connection status indicator
- `card-hover`: Smooth lift and scale
- `gradient-shift`: Color animation
- `breathe`: Subtle scale pulsing

## Advanced Features

### 3D Transforms
```tsx
/* 3D card flip effects */
<div className="flip-card perspective-1000">
  <div className="flip-card-inner preserve-3d">
    <div className="flip-card-front backface-hidden">
    <div className="flip-card-back backface-hidden rotate-y-180">
  </div>
</div>
```

### Container Queries (TailwindCSS v4)
```tsx
<div className="container-glass @container">
  <div className="@md:backdrop-blur-xl @lg:glass-surface-strong">
    Responsive glass effects based on container size
  </div>
</div>
```

### Performance Optimizations
```tsx
/* GPU acceleration for smooth animations */
<div className="gpu-accelerated will-change-glass">

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .glass-card { transition: none; }
}

/* Mobile performance optimizations */
@media (max-width: 768px) {
  .glass-card { backdrop-blur: blur(6px); }
}
```

## Best Practices

### Do's ✓
- Use semantic color variables (`bg-background`, `text-foreground`)
- Apply glassmorphism classes for consistent effects
- Provide dark mode variants automatically through CSS variables
- Group related classes logically in multiline format
- Use theme-aware shadow utilities
- Test in both light and dark modes
- Leverage Radix UI data attributes for state styling
- Use standard Tailwind breakpoints only

### Don'ts ✗
- Don't use hardcoded color values
- Don't create custom CSS unless absolutely necessary
- Don't mix different glassmorphism approaches
- Don't forget focus states and accessibility
- Don't use inline styles
- Don't ignore reduced motion preferences
- Don't use deprecated shadow utilities

## Accessibility Considerations

### Focus States
```tsx
<button className="
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
  glass-focus
">
```

### Screen Reader Support
```tsx
<span className="sr-only">Screen reader only text</span>
<div aria-hidden="true" className="decorative-glass-element">
```

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .glass-surface {
    background: var(--card) !important;
    border: 2px solid var(--border) !important;
    backdrop-filter: none !important;
  }
}
```

## Browser Compatibility

### Progressive Enhancement
```css
/* Fallback for browsers without backdrop-filter support */
@supports not (backdrop-filter: blur(12px)) {
  .glass-surface {
    background: var(--card) !important;
    border: 1px solid var(--border) !important;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
  }
}
```

## Project Examples

### Dashboard Stats Card
```tsx
<Card className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5 transition-all">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
      Active Servers
    </CardTitle>
    <ServerIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
      {serverCount}
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      All systems operational
    </p>
  </CardContent>
</Card>
```

### Glass Navigation Component
```tsx
<nav className="glass-nav sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
  <div className="flex items-center justify-between px-6 py-4">
    <div className="flex items-center space-x-4">
      <div className="glass-nav-item active">Dashboard</div>
      <div className="glass-nav-item">Servers</div>
      <div className="glass-nav-item">Settings</div>
    </div>
  </div>
</nav>
```

### Health Status Badge
```tsx
<span className={cn(
  "glass-badge",
  status === "healthy" && "border-green-500/30 text-green-700 dark:text-green-300",
  status === "warning" && "glass-badge-warning",
  status === "error" && "glass-badge-error"
)}>
  {status}
</span>
```

## Migration Notes

### From TailwindCSS v3 to v4
- **Config file**: Now uses TypeScript (`tailwind.config.ts`)
- **CSS custom properties**: Colors now use CSS variables
- **Inline theme**: Theme configuration can be inline in CSS
- **Container queries**: Native support in v4
- **Enhanced performance**: Better tree-shaking and optimization

### Key Differences
- No more `colors` object in config - uses CSS variables
- Improved dark mode handling through CSS custom properties
- Better animation utilities and keyframe support
- Enhanced gradient utilities with better browser support
