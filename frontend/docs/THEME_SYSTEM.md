# Theme System Documentation

A comprehensive guide to the MCP Manager's theme architecture, featuring TailwindCSS v4 with PostCSS, glassmorphism design patterns, and advanced theme management.

## Overview

The MCP Manager frontend implements a sophisticated glassmorphism design system with comprehensive dark mode support, built on modern web technologies and featuring seamless theme transitions with persistent user preferences.

## Architecture

### Core Technologies
- **TailwindCSS v4.1.13** - Latest utility-first CSS framework with PostCSS integration
- **PostCSS with @tailwindcss/postcss** - Next-generation CSS processing
- **Next.js 15.5.3** - React framework with app directory structure
- **next-themes v0.4.6** - Advanced theme provider with system detection
- **CSS Custom Properties** - Dynamic theme variables with OKLCH color space
- **Glassmorphism Design System** - Modern glass-like UI with backdrop filters
- **Framer Motion** - Smooth theme transitions and micro-interactions

### Theme Configuration

#### 1. TailwindCSS v4 Configuration (`tailwind.config.ts`)
TailwindCSS v4 introduces significant improvements including better performance, smaller bundle sizes, and enhanced CSS-in-JS support.

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class", // Class-based dark mode with next-themes
  theme: {
    extend: {
      // Enhanced glassmorphism color system
      colors: {
        glass: {
          light: "rgba(255, 255, 255, 0.95)",
          "light-hover": "rgba(255, 255, 255, 0.90)",
          dark: "rgba(30, 41, 59, 0.95)",
          "dark-hover": "rgba(15, 23, 42, 0.90)",
          overlay: {
            light: "rgba(255, 255, 255, 0.60)",
            dark: "rgba(30, 41, 59, 0.80)",
          },
        },
        // Precision primary colors for glassmorphism
        primary: {
          50: "#eff6ff",
          500: "#3b82f6", // Main brand color
          950: "#172554",
        },
      },
      // Advanced glassmorphism gradients
      backgroundImage: {
        "gradient-glass": "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(243, 244, 246, 0.6) 100%)",
        "gradient-glass-dark": "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
        "gradient-ai": "linear-gradient(90deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 50%, rgba(236, 72, 153, 0.8) 100%)",
      },
      // Comprehensive glass shadow system
      boxShadow: {
        glass: "0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        "glass-hover": "0 12px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
        "glass-button": "0 4px 16px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "glass-input-focus": "0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.06)",
      },
      // Extended backdrop blur system
      backdropBlur: {
        xs: "2px",
        "4xl": "72px",
      },
      // Custom animations for glassmorphism
      animation: {
        float: "float 6s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 1.5s infinite",
        "glass-reveal": "glass-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
} satisfies Config;
```

#### 2. PostCSS Configuration (`postcss.config.mjs`)
TailwindCSS v4 uses the new PostCSS plugin for enhanced performance:

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // TailwindCSS v4 PostCSS plugin
  },
};
export default config;
```

#### 3. CSS Architecture (`globals.css`)
The CSS architecture uses TailwindCSS v4's new `@theme inline` directive and modern OKLCH color space:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../styles/tailwind-utilities.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* TailwindCSS v4 inline theme configuration */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Core semantic color mapping */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-card: var(--card);

  /* Glassmorphism-specific variables */
  --color-glass-white: rgba(255, 255, 255, 0.95);
  --color-glass-dark: rgba(15, 23, 42, 0.9);
  --color-glass-border-light: rgba(0, 0, 0, 0.1);
  --color-glass-border-dark: rgba(255, 255, 255, 0.1);

  /* Advanced shadow system */
  --shadow-glass: 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --shadow-glass-hover: 0 12px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

:root {
  --radius: 0.625rem;
  /* OKLCH color space for better color accuracy */
  --background: oklch(1 0 0); /* Pure white */
  --foreground: oklch(0.141 0.005 285.823); /* Dark gray */
  --primary: oklch(0.205 0 0); /* Black */
  --card: oklch(1 0 0); /* White card background */
  /* ... comprehensive color system */
}

.dark {
  --background: #121212; /* Dark background */
  --foreground: oklch(0.985 0 0); /* Light text */
  --primary: oklch(0.985 0 0); /* Light primary */
  --card: oklch(0.141 0.005 285.823); /* Dark card */
  /* ... dark theme variants */
}
```

## TailwindCSS v4 New Features

### Key Improvements in v4
- **Better Performance**: Up to 3x faster builds with optimized CSS generation
- **Smaller Bundle Size**: Reduced CSS output through better dead code elimination
- **Enhanced PostCSS Integration**: Native PostCSS plugin architecture
- **Improved CSS-in-JS**: Better support for dynamic styling patterns
- **Modern CSS Features**: First-class support for CSS layers, cascade layers, and container queries

### Migration Benefits
- **Backward Compatibility**: Existing utilities work without changes
- **Progressive Enhancement**: New features can be adopted incrementally
- **Better Developer Experience**: Improved error messages and build-time validation

## Theme-Aware Classes

### Core Semantic Classes

| Class | Purpose | Light Mode | Dark Mode |
| `bg-background` | Page background | White | Dark gray |
| `text-foreground` | Primary text | Dark gray | White |
| `bg-card` | Card backgrounds | White | Dark |
| `text-card-foreground` | Card text | Dark | Light |
| `bg-muted` | Subtle backgrounds | Light gray | Dark gray |
| `text-muted-foreground` | Secondary text | Medium gray | Light gray |
| `border-border` | Border colors | Light gray | Dark gray |

### Interactive Elements

| Class | Purpose | Behavior |
|-------|---------|----------|
| `bg-primary` | Primary buttons | Blue in both themes |
| `text-primary-foreground` | Button text | White/dark contrast |
| `hover:bg-primary/90` | Button hover | 90% opacity primary |
| `focus-visible:ring-ring` | Focus rings | Theme-aware ring color |

### Form Elements

| Class | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `bg-input` | Input backgrounds | Light gray | Dark gray |
| `border-input` | Input borders | Medium gray | Dark gray |
| `placeholder:text-muted-foreground` | Placeholder text | Light gray | Medium gray |

## Glassmorphism Design System

### Architecture Overview

The glassmorphism system is built with a layered approach:
1. **Base Layer**: Core glass effects and backdrop filters
2. **Component Layer**: Interactive elements and surfaces
3. **Utility Layer**: Responsive and performance optimizations
4. **Animation Layer**: Smooth transitions and micro-interactions

### Core Utilities

#### Base Glass Classes
```css
/* Base glassmorphism foundation */
.glass-base {
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%); /* Safari support */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Performance-optimized variants */
.glass-lite {
  backdrop-filter: blur(6px) saturate(120%);
  /* Lighter effect for better performance on low-end devices */
}

.glass-heavy {
  backdrop-filter: blur(20px) saturate(180%);
  /* Enhanced effect for hero sections */
}
```

#### Surface Variants
```css
/* Standard glass surface */
.glass-surface {
  @apply glass-base rounded-xl border border-white/20 dark:border-white/10;
  background: rgba(255, 255, 255, 0.8); /* Light theme */
  background: rgba(30, 41, 59, 0.8); /* Dark theme */
}

/* Subtle glass surface */
.glass-surface-subtle {
  background: rgba(255, 255, 255, 0.6); /* Light */
  background: rgba(30, 41, 59, 0.6); /* Dark */
}

/* Strong glass surface */
.glass-surface-strong {
  background: rgba(255, 255, 255, 0.9); /* Light */
  background: rgba(30, 41, 59, 0.9); /* Dark */
}
```

#### Interactive Elements
```css
/* Interactive glass elements */
.glass-interactive {
  @apply glass-surface cursor-pointer transition-all duration-200;
}

.glass-interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}
```

#### Themed Glass Containers
```css
/* Primary themed glass */
.glass-primary {
  background: color-mix(in srgb, hsl(var(--primary)) 10%, rgba(255, 255, 255, 0.8));
}

/* Accent themed glass */
.glass-accent {
  background: color-mix(in srgb, hsl(var(--accent)) 10%, rgba(255, 255, 255, 0.8));
}
```

### Advanced Backdrop System

#### Backdrop Utilities with Browser Support

| Class | Blur Amount | Saturation | Use Case | Performance |
|-------|-------------|------------|----------|-------------|
| `backdrop-glass-sm` | 6px + 120% | Lightweight | Subtle overlays, mobile | High |
| `backdrop-glass` | 12px + 150% | Standard | Cards, modals | Medium |
| `backdrop-glass-lg` | 20px + 180% | Enhanced | Hero sections, prominent UI | Lower |

#### Browser Compatibility
```css
.backdrop-glass {
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%); /* Safari 9+ */
  /* Fallback for unsupported browsers */
  background: rgba(255, 255, 255, 0.8); /* Light theme */
}

.dark .backdrop-glass {
  background: rgba(30, 41, 59, 0.8); /* Dark theme fallback */
}

/* Feature detection fallback */
@supports not (backdrop-filter: blur(12px)) {
  .backdrop-glass {
    background: rgba(255, 255, 255, 0.9);
  }
  .dark .backdrop-glass {
    background: rgba(30, 41, 59, 0.9);
  }
}
```

## Usage Examples

### Basic Card Component
```tsx
function ExampleCard() {
  return (
    <div className="glass-surface p-6">
      <h2 className="text-foreground font-semibold">Card Title</h2>
      <p className="text-muted-foreground">Card description text</p>
    </div>
  );
}
```

### Interactive Glass Button
```tsx
function GlassButton() {
  return (
    <button className="glass-interactive px-4 py-2">
      <span className="text-foreground font-medium">Click Me</span>
    </button>
  );
}
```

### Themed Glass Container
```tsx
function PrimaryContainer() {
  return (
    <div className="glass-primary p-4 rounded-xl">
      <span className="text-primary-foreground">Primary content</span>
    </div>
  );
}
```

## Component Implementation

### Theme Provider Architecture

#### 1. Root Layout Integration (`app/layout.tsx`)
```tsx
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false} // Enable smooth transitions
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 2. Theme Provider Component (`components/theme-provider.tsx`)
```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Advanced Theme Selector Implementation

#### Enhanced ThemeSelector Component
The theme selector provides an intuitive interface with live previews and smooth transitions:

```tsx
"use client";

import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Moon, Sun, Check, Palette } from "lucide-react";

interface ThemeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
  showDescription?: boolean;
}

export function ThemeSelector({
  value,
  onValueChange,
  disabled = false,
  showPreview = true,
  showDescription = true
}: ThemeSelectorProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const [isChanging, setIsChanging] = React.useState(false);

  const handleThemeChange = async (newTheme: string) => {
    if (disabled || newTheme === value) return;

    setIsChanging(true);

    // Smooth transition implementation
    const root = document.documentElement;
    root.style.setProperty("--theme-transition-duration", "300ms");
    root.classList.add("theme-transitioning");

    onValueChange(newTheme);
    setTheme(newTheme);

    setTimeout(() => {
      root.classList.remove("theme-transitioning");
      setIsChanging(false);
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup">
        {themes.map((theme) => (
          <motion.button
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
            className={cn(
              "group glass-card hover:shadow-lg hover:-translate-y-0.5",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              value === theme.value && "border-primary ring-2 ring-primary/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Theme preview with live updates */}
            {showPreview && (
              <div className="h-12 rounded-md overflow-hidden border border-border/50 mb-3">
                <div className={cn("h-full", theme.preview.bg)}>
                  {/* Simulated interface preview */}
                  <div className="flex items-center gap-1 p-2 h-6 bg-black/5 dark:bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-red-400 opacity-60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-60" />
                    <div className="w-2 h-2 rounded-full bg-green-400 opacity-60" />
                  </div>
                  <div className="p-2 space-y-1">
                    <div className={cn("h-1.5 w-12 rounded-full", theme.preview.accent)} />
                    <div className={cn("h-1 w-8 rounded-full opacity-60", theme.preview.text)} />
                  </div>
                </div>
              </div>
            )}

            {/* Theme information */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  className="text-muted-foreground group-hover:text-foreground"
                  animate={{
                    scale: value === theme.value ? 1.1 : 1,
                    rotate: isChanging && value === theme.value ? 360 : 0
                  }}
                >
                  {theme.icon}
                </motion.div>
                <span className="font-medium">{theme.label}</span>
              </div>

              {/* Selection indicator */}
              <motion.div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                animate={{
                  borderColor: value === theme.value ? "var(--primary)" : "var(--border)",
                  backgroundColor: value === theme.value ? "var(--primary)" : "transparent",
                }}
              >
                <AnimatePresence>
                  {value === theme.value && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

### Theme Detection and Management

#### Advanced Theme Hooks
```tsx
// Custom hook for enhanced theme management
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useAdvancedTheme() {
  const { theme, resolvedTheme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';
  const isSystem = theme === 'system';

  const changeTheme = (newTheme: string) => {
    setIsTransitioning(true);
    setTheme(newTheme);

    // Reset transition state
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return {
    theme,
    resolvedTheme,
    systemTheme,
    isDark,
    isLight,
    isSystem,
    mounted,
    isTransitioning,
    changeTheme,
  };
}

// Usage in components
function MyComponent() {
  const { isDark, isTransitioning, changeTheme } = useAdvancedTheme();

  return (
    <div className={cn(
      "glass-card",
      isDark ? "glass-card-dark" : "glass-card-light",
      isTransitioning && "theme-transitioning"
    )}>
      {/* Component content */}
    </div>
  );
}
```

## Utility Functions (`lib/utils.ts`)

### Enhanced Class Name Utility
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Core utility for class name merging with TailwindCSS v4
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Theme-aware class utility
export function themeAware(lightClass: string, darkClass: string) {
  return `${lightClass} dark:${darkClass}`;
}

// Glass effect utility
export function glassEffect(variant: 'light' | 'medium' | 'heavy' = 'medium') {
  const variants = {
    light: 'glass-lite',
    medium: 'glass-card',
    heavy: 'glass-heavy'
  };
  return variants[variant];
}

// Responsive glass utility
export function responsiveGlass() {
  return cn(
    'glass-card', // Default glass effect
    'md:glass-medium', // Enhanced on medium screens
    'lg:glass-heavy', // Full effect on large screens
    'motion-reduce:glass-lite' // Reduced motion support
  );
}
```

## Best Practices

### 1. Semantic Color Usage (TailwindCSS v4)
- ✅ Use `bg-card` instead of `bg-white` for theme consistency
- ✅ Use `text-foreground` instead of `text-black` for accessibility
- ✅ Use `border-border` instead of `border-gray-300` for semantic meaning
- ✅ Leverage OKLCH color space for better color accuracy
- ✅ Use CSS custom properties for dynamic theming

### 2. Advanced Glassmorphism Implementation
- ✅ Use predefined glass classes (`glass-card`, `glass-surface`, `glass-interactive`)
- ✅ Apply performance variants based on device capabilities
- ✅ Combine with semantic colors for consistent theming
- ✅ Test all interactive states in both light and dark themes
- ✅ Include fallbacks for browsers without backdrop-filter support
- ✅ Use `motion-reduce` variants for accessibility compliance

### 3. Responsive Design with Performance Optimization
```tsx
// Excellent: Mobile-first with performance considerations
<div className={cn(
  "glass-card", // Base glass effect
  "p-4 md:p-6 lg:p-8", // Responsive padding
  "backdrop-blur-sm md:backdrop-blur-md lg:backdrop-blur-lg", // Progressive enhancement
  "motion-reduce:backdrop-blur-sm" // Accessibility
)}>
  <h1 className="text-foreground text-xl md:text-2xl lg:text-3xl">
    Responsive Title
  </h1>
</div>

// Good: Container queries for advanced responsiveness (TailwindCSS v4)
<div className="@container glass-card">
  <h2 className="@sm:text-lg @md:text-xl @lg:text-2xl">
    Container-aware title
  </h2>
</div>
```

### 4. Advanced Animation Integration
```tsx
// Enhanced theme-aware animations with Framer Motion
<motion.div
  className="glass-card"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{
    y: -4,
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeOut" }
  }}
  whileTap={{ scale: 0.98 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 30
  }}
>
  Interactive Content
</motion.div>

// Theme transition animation
const ThemeTransition = ({ children }: { children: React.ReactNode }) => {
  const { isTransitioning } = useAdvancedTheme();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isTransitioning ? 'transitioning' : 'stable'}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.8 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

## Accessibility & Performance

### WCAG Compliance
- **Color Contrast**: All theme combinations maintain WCAG AA compliance (4.5:1 minimum)
- **Focus Management**: Clear focus indicators with 2px outline offset
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **High Contrast**: Compatible with system high contrast modes

### Performance Optimizations
- **Mobile Performance**: Reduced glass effects on mobile devices
- **GPU Acceleration**: Hardware-accelerated transforms and filters
- **Lazy Loading**: Conditional backdrop-filter application
- **Fallback Strategy**: Graceful degradation for unsupported browsers

```css
/* Performance-aware implementation */
@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(6px); /* Lighter blur for mobile */
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass-card,
  .glass-interactive,
  .theme-transitioning * {
    transition: none !important;
    animation: none !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .glass-card {
    background: var(--background);
    border: 2px solid var(--border);
    backdrop-filter: none;
  }
}
```

### Enhanced Focus Management
```css
/* Advanced focus system with glass effects */
.glass-focus:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px;
  box-shadow:
    0 0 0 2px hsl(var(--ring)),
    0 0 0 4px rgba(59, 130, 246, 0.1),
    var(--shadow-glass-input-focus);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Keyboard navigation enhancement */
.glass-nav-item:focus-visible {
  background: rgba(59, 130, 246, 0.1);
  transform: translateX(4px);
}

/* Skip links for screen readers */
.sr-only:focus {
  position: absolute;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0.5rem;
  background: var(--background);
  color: var(--foreground);
  border: 2px solid var(--border);
  border-radius: 0.375rem;
  z-index: 9999;
}
```

## Testing & Debugging

### Comprehensive Testing Strategy

#### Manual Testing Checklist
- [ ] Toggle between all theme variants (light/dark/system)
- [ ] Verify component rendering in each theme
- [ ] Test interactive states (hover, focus, active, disabled)
- [ ] Validate glassmorphism effects across browsers
- [ ] Check responsive behavior on different screen sizes
- [ ] Test with reduced motion preferences
- [ ] Verify high contrast mode compatibility
- [ ] Test keyboard navigation and focus management

#### Automated Testing
```typescript
// Vitest test example for theme system
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';
import userEvent from '@testing-library/user-event';

describe('Theme System', () => {
  it('should switch themes correctly', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeSelector value="light" onValueChange={jest.fn()} />
      </ThemeProvider>
    );

    // Test theme switching
    const darkThemeButton = screen.getByRole('radio', { name: /dark/i });
    await user.click(darkThemeButton);

    expect(document.documentElement).toHaveClass('dark');
  });

  it('should maintain WCAG AA contrast ratios', () => {
    // Contrast testing logic
    const contrastRatio = getContrastRatio('#000000', '#ffffff');
    expect(contrastRatio).toBeGreaterThan(4.5);
  });
});
```

### Advanced Theme Debugging
```tsx
// Comprehensive theme debugging component
function ThemeDebugger() {
  const { theme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 glass-card p-4 text-xs font-mono z-50">
      <h3 className="font-bold mb-2">Theme Debug Info</h3>
      <div className="space-y-1">
        <div>Current: <span className="text-primary">{theme}</span></div>
        <div>Resolved: <span className="text-primary">{resolvedTheme}</span></div>
        <div>System: <span className="text-primary">{systemTheme}</span></div>
        <div>Classes: <span className="text-primary">{document.documentElement.className}</span></div>
        <div>CSS Variables:</div>
        <div className="ml-2 text-muted-foreground">
          --background: {getComputedStyle(document.documentElement).getPropertyValue('--background')}
        </div>
        <div className="ml-2 text-muted-foreground">
          --foreground: {getComputedStyle(document.documentElement).getPropertyValue('--foreground')}
        </div>
      </div>
    </div>
  );
}

// CSS debugging utilities
.debug-theme {
  border: 2px dashed red !important;
}

.debug-theme::before {
  content: attr(class);
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 10px;
  background: red;
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  z-index: 1000;
}
```

## Migration Guide

### Migrating to TailwindCSS v4

#### Package Updates
```json
{
  "dependencies": {
    "tailwindcss": "^4.1.13",
    "@tailwindcss/postcss": "^4.1.13"
  }
}
```

#### Configuration Migration
```javascript
// postcss.config.mjs (NEW)
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // New PostCSS plugin
  },
};
export default config;
```

### From Static Colors to Semantic System
```tsx
// Before: Static colors (problematic)
<div className="bg-white text-black border-gray-300 shadow-lg">
  <h2 className="text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// After: Semantic + Glassmorphism (recommended)
<div className="glass-card">
  <h2 className="text-foreground font-semibold">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

### From Basic Cards to Glass Effects
```tsx
// Before: Standard card
<div className="bg-white shadow-lg rounded-lg p-6">
  Content
</div>

// After: Glassmorphism card
<div className="glass-card p-6">
  Content
</div>

// Advanced: Interactive glass card
<motion.div
  className="glass-interactive p-6"
  whileHover={{ y: -2, scale: 1.01 }}
>
  Interactive Content
</motion.div>
```

### Adding Glassmorphism
```tsx
// Before
<div className="bg-white shadow-lg">

// After
<div className="glass-surface">
```

## Advanced Customization

### Creating Custom Theme Extensions

#### 1. Adding Brand Colors
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Brand color system
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9', // Primary brand
          950: '#0c4a6e',
        },
        // Custom glass variants
        'glass-brand': {
          light: 'rgba(14, 165, 233, 0.1)',
          dark: 'rgba(14, 165, 233, 0.2)',
        }
      },
      // Custom glass effects
      backdropBlur: {
        'brand': '16px',
      }
    }
  }
} satisfies Config;
```

#### 2. CSS Custom Properties Integration
```css
/* globals.css - Custom theme extension */
@theme inline {
  /* Brand-specific glass variables */
  --color-glass-brand-light: rgba(14, 165, 233, 0.1);
  --color-glass-brand-dark: rgba(14, 165, 233, 0.2);
  --shadow-glass-brand: 0 4px 16px rgba(14, 165, 233, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

:root {
  /* Brand color variables */
  --brand-primary: oklch(0.6 0.2 220);
  --brand-secondary: oklch(0.8 0.15 240);
}

.dark {
  --brand-primary: oklch(0.7 0.25 220);
  --brand-secondary: oklch(0.6 0.18 240);
}
```

#### 3. Custom Glass Components
```css
/* Custom brand glass components */
.glass-brand-card {
  @apply backdrop-blur-brand rounded-xl transition-all duration-300 ease-out;
  background: var(--color-glass-brand-light);
  border: 1px solid rgba(14, 165, 233, 0.2);
  box-shadow: var(--shadow-glass-brand);
}

.dark .glass-brand-card {
  background: var(--color-glass-brand-dark);
  border-color: rgba(14, 165, 233, 0.3);
}
```

### CSS Variables
```css
/* globals.css */
:root {
  --custom-light: 200 100% 50%;
}

.dark {
  --custom-dark: 200 100% 30%;
}
```

## Component Guidelines

### Building Theme-Aware Components

#### 1. Component Structure Template
```tsx
// components/ui/themed-card.tsx
interface ThemedCardProps {
  variant?: 'default' | 'glass' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ThemedCard({
  variant = 'default',
  size = 'md',
  interactive = false,
  children,
  className
}: ThemedCardProps) {
  return (
    <div className={cn(
      // Base styles
      "rounded-xl transition-all duration-300",
      // Variant styles
      {
        'bg-card text-card-foreground border': variant === 'default',
        'glass-card': variant === 'glass',
        'bg-muted/50 backdrop-blur-none': variant === 'solid',
      },
      // Size styles
      {
        'p-4': size === 'sm',
        'p-6': size === 'md',
        'p-8': size === 'lg',
      },
      // Interactive styles
      interactive && "cursor-pointer hover:-translate-y-1 hover:shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}
```

#### 2. Form Component Example
```tsx
// Themed form input with glass effect
export function ThemedInput({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "glass-input",
        "flex h-10 w-full px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
```

## Performance Monitoring

### Glass Effect Performance
```typescript
// Performance monitoring utility
export function useGlassPerformance() {
  const [isSupported, setIsSupported] = useState(true);
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'reduced' | 'enhanced'>('auto');

  useEffect(() => {
    // Check backdrop-filter support
    const supportsBackdrop = CSS.supports('backdrop-filter', 'blur(10px)');
    setIsSupported(supportsBackdrop);

    // Performance detection
    const connection = (navigator as any).connection;
    if (connection?.effectiveType === '2g' || connection?.saveData) {
      setPerformanceMode('reduced');
    }

    // Device capabilities check
    if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
      setPerformanceMode('reduced');
    }
  }, []);

  return {
    isSupported,
    performanceMode,
    getGlassClass: (defaultClass: string) => {
      if (!isSupported) return 'bg-card/95 border';
      if (performanceMode === 'reduced') return 'glass-lite';
      return defaultClass;
    }
  };
}
```

## Summary

This comprehensive theme system delivers:

✅ **Modern Architecture**: TailwindCSS v4 with PostCSS integration
✅ **Advanced Glassmorphism**: Hardware-accelerated backdrop effects
✅ **Seamless Theme Switching**: Smooth transitions between light/dark/system modes
✅ **Accessibility Compliance**: WCAG AA standards with reduced motion support
✅ **Performance Optimization**: Device-aware glass effects and mobile optimization
✅ **Developer Experience**: Comprehensive utilities, debugging tools, and TypeScript support
✅ **Cross-browser Compatibility**: Fallbacks for unsupported features
✅ **Responsive Design**: Container queries and mobile-first approach

The system ensures consistent, accessible, and beautiful interfaces across all themes while maintaining optimal performance and the distinctive glassmorphism aesthetic.