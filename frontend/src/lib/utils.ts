import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Core utility for class name merging with TailwindCSS v4 optimization
 * Combines clsx for conditional classes and twMerge for TailwindCSS class deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Theme-aware class utility for light/dark mode
 * @param lightClass - Classes for light theme
 * @param darkClass - Classes for dark theme
 * @returns Combined class string with dark mode prefix
 */
export function themeAware(lightClass: string, darkClass: string) {
  return `${lightClass} dark:${darkClass}`;
}

/**
 * Glass effect utility with performance variants
 * @param variant - Glass effect intensity
 * @returns Appropriate glass class for the variant
 */
export function glassEffect(variant: 'light' | 'medium' | 'heavy' = 'medium') {
  const variants = {
    light: 'glass-lite',
    medium: 'glass-card',
    heavy: 'glass-heavy'
  };
  return variants[variant];
}

/**
 * Responsive glass utility with progressive enhancement
 * Applies lighter effects on mobile for better performance
 * @returns Responsive glass classes
 */
export function responsiveGlass() {
  return cn(
    'glass-card', // Default glass effect
    'md:glass-medium', // Enhanced on medium screens
    'lg:glass-heavy', // Full effect on large screens
    'motion-reduce:glass-lite' // Reduced motion support
  );
}

/**
 * Accessibility-aware focus classes
 * @param baseClass - Base component classes
 * @returns Focus-enhanced classes with proper WCAG compliance
 */
export function focusAware(baseClass: string) {
  return cn(
    baseClass,
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
  );
}
