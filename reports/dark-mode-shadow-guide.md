# Tailwind CSS v4 Dark Mode Shadow Implementation Guide

## Overview

This guide provides comprehensive solutions for implementing dark mode compatible shadows in Tailwind CSS v4, specifically addressing the issue where `hover:shadow-md` is invisible in dark mode.

## Key Solutions Implemented

### 1. Enhanced Custom Shadow Utilities

#### Primary Approach: Custom Utilities
```css
/* Enhanced shadow with glow effect for dark mode */
.shadow-card-hover-enhanced {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.dark .shadow-card-hover-enhanced {
  box-shadow:
    0 8px 25px -5px rgba(0, 0, 0, 0.6),
    0 4px 6px -2px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 0 30px rgba(59, 130, 246, 0.25),
    0 0 60px rgba(147, 51, 234, 0.1);
}
```

#### Alternative Variants
- `shadow-card-subtle-enhanced`: Gentle purple-accented glow
- `shadow-card-strong-enhanced`: Bold dual-color glow effect

### 2. CSS Variable Approach (Tailwind v4 Native)

#### Theme Configuration
```css
@theme inline {
  --shadow-card-hover-light: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-card-hover-dark: 0 8px 25px -5px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.25);
}
```

#### Usage in Components
```tsx
className="hover:[box-shadow:var(--shadow-card-hover-light)] dark:hover:[box-shadow:var(--shadow-card-hover-dark)]"
```

### 3. Dark Mode Variant Strategy

#### Using dark: Variants
```tsx
className="hover:shadow-md dark:hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.6),0_0_30px_rgba(59,130,246,0.25)]"
```

## Implementation Recommendations

### For Dashboard Cards (Recommended)
```tsx
// Use the enhanced utility class
<Card className="hover:shadow-card-hover-enhanced hover:-translate-y-0.5">
```

### For Subtle Effects
```tsx
// Use the subtle variant
<Card className="hover:shadow-card-subtle-enhanced hover:-translate-y-0.5">
```

### For Maximum Control
```tsx
// Use CSS variables with Tailwind v4
<Card className="hover:[box-shadow:var(--shadow-card-hover-light)] dark:hover:[box-shadow:var(--shadow-card-hover-dark)]">
```

## Best Practices for Dark Mode Shadows

### 1. Layer Composition
- **Base Shadow**: Dark shadow for depth
- **Border Light**: Subtle white border for definition
- **Inset Highlight**: Inner light for glass effect
- **Colored Glow**: Accent color for brand consistency

### 2. Performance Considerations
- Use `transform: translate3d(0, 0, 0)` for GPU acceleration
- Implement `will-change: transform, box-shadow` sparingly
- Reduce shadow complexity on mobile devices

### 3. Accessibility
- Ensure shadows don't rely on color alone for meaning
- Maintain sufficient contrast ratios
- Respect `prefers-reduced-motion` settings

### 4. Integration with Glassmorphism
- Combine with `backdrop-blur` effects
- Use semi-transparent backgrounds
- Layer shadows behind glass effects

## Component Integration

### StatsCard Enhanced
```tsx
interface StatsCardProps {
  shadowVariant?: "enhanced" | "subtle" | "strong" | "default";
}

const getShadowClass = (variant: string) => {
  switch (variant) {
    case "enhanced": return "hover:shadow-card-hover-enhanced";
    case "subtle": return "hover:shadow-card-subtle-enhanced";
    case "strong": return "hover:shadow-card-strong-enhanced";
    default: return "hover:shadow-md";
  }
};
```

## Testing Recommendations

1. **Theme Toggle Testing**: Verify shadows in both light and dark modes
2. **Device Testing**: Test on various devices and browsers
3. **Animation Performance**: Monitor frame rates during hover transitions
4. **Accessibility Testing**: Use screen readers and high contrast mode

## Migration from Standard Tailwind Shadows

### Before
```tsx
className="hover:shadow-md" // Invisible in dark mode
```

### After
```tsx
className="hover:shadow-card-hover-enhanced" // Visible in both modes
```

## CSS Variables Reference

All shadow variables are defined in `globals.css` under the `@theme` directive:
- `--shadow-card-hover-light`
- `--shadow-card-hover-dark`
- `--shadow-card-subtle-light`
- `--shadow-card-subtle-dark`
- `--shadow-card-strong-light`
- `--shadow-card-strong-dark`

This approach leverages Tailwind v4's native CSS-first configuration while maintaining excellent performance and dark mode compatibility.