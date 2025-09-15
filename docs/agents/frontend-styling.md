# Glassmorphism Design System - Tailwind CSS v4

This project uses a comprehensive glassmorphism design system built with Tailwind CSS v4's new CSS-first configuration approach.

## Key Features

### Tailwind CSS v4 Migration
- **CSS-first configuration**: Theme configured in CSS using `@theme` directive
- **Native cascade layers**: Uses `@layer` for proper CSS organization
- **CSS variables**: All theme values use CSS custom properties
- **No tailwind.config.js**: Configuration is done entirely in CSS

### Design System Components

#### Core Elements
- `.glass-card` - Basic glassmorphism card with hover effects
- `.glass-nav` - Navigation bar with glass effect
- `.glass-button` - Interactive button with shimmer effect
- `.glass-input` - Form input with glass styling
- `.ai-tool-card` - Enhanced card with gradient borders

#### Status Indicators
- `.glass-badge` - Success status badge
- `.glass-badge-warning` - Warning status
- `.glass-badge-error` - Error status
- `.glass-badge-info` - Information status
- `.mcp-connection-indicator` - MCP server status with pulse animation

#### Performance Variants
- `.glass-lite` - Minimal blur for low-end devices
- `.glass-medium` - Balanced performance
- `.glass-heavy` - Maximum visual effects

## CSS Variables System

All glassmorphism properties are defined as CSS variables in the `@theme` block:

```css
@theme inline {
  /* Glassmorphism Colors */
  --color-glass-white: rgba(255, 255, 255, 0.95);
  --color-glass-dark: rgba(15, 23, 42, 0.90);
  --color-glass-border-light: rgba(0, 0, 0, 0.1);
  --color-glass-border-dark: rgba(255, 255, 255, 0.1);
  
  /* Shadow System */
  --shadow-glass: 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --shadow-glass-hover: 0 12px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  
  /* Animations */
  --animate-float: float 6s ease-in-out infinite;
  --animate-glass-shimmer: glass-shimmer 1.5s infinite;
  --animate-mcp-pulse: mcp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Usage Examples

### Basic Glass Card
```tsx
<div className="glass-card p-6">
  <h3 className="text-lg font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Card content</p>
</div>
```

### Interactive Button
```tsx
<button className="glass-button">
  Click Me
</button>
```

### Form Elements
```tsx
<input 
  type="text" 
  placeholder="Enter text..."
  className="glass-input"
/>
```

### MCP Status Indicator
```tsx
<div className="mcp-connection-indicator mcp-status-connected">
  <span className="glass-badge">Connected</span>
</div>
```

## Animation System

The system includes several custom animations:

- **Float**: Subtle vertical movement for logos and icons
- **Glass Shimmer**: Loading state animation
- **MCP Pulse**: Connection status indicator
- **Gradient Shift**: Dynamic color transitions
- **Breathe**: Gentle pulsing effect

## Dark Mode Support

All components automatically adapt to dark mode using CSS custom properties:

```css
.dark .glass-card {
  background: var(--color-glass-dark);
  border-color: var(--color-glass-border-dark);
  box-shadow: var(--shadow-glass-dark);
}
```

## Performance Considerations

### Mobile Optimization
- Reduced backdrop blur on mobile devices
- Simplified animations for better performance
- Responsive design adjustments

### Accessibility
- `prefers-reduced-motion` support
- Focus states for keyboard navigation
- Proper contrast ratios maintained

### Browser Compatibility
- Graceful degradation for older browsers
- WebKit vendor prefixes included
- Fallback styles for unsupported features

## Customization

### Adding New Glass Components
1. Define component in the `@layer components` section
2. Use existing CSS variables for consistency
3. Follow the naming convention: `.glass-[component]`
4. Add dark mode variant if needed

### Modifying Theme Variables
Update values in the `@theme inline` block:

```css
@theme inline {
  --color-glass-white: rgba(255, 255, 255, 0.90); /* Adjust opacity */
  --shadow-glass: 0 6px 20px rgba(0, 0, 0, 0.12); /* Modify shadow */
}
```

### Performance Tuning
Use appropriate blur levels:
- `backdrop-blur-sm` (4px) - Mobile/low-end devices
- `backdrop-blur-md` (12px) - Standard
- `backdrop-blur-2xl` (40px) - Premium effects

## File Structure

```
frontend/src/
├── app/
│   └── globals.css          # Main Tailwind v4 config with glassmorphism
├── components/ui/
│   └── glass-demo.tsx       # Demo components and examples
└── styles/
    └── README.md           # This documentation
```

## Migration from Tailwind v3

Key changes from the old v3 configuration:

1. **No tailwind.config.js**: All configuration moved to CSS
2. **@theme directive**: Replaces theme extension in JS config
3. **CSS variables**: All values accessible as CSS custom properties
4. **Native @layer**: Better CSS cascade control
5. **@custom-variant**: Custom variant definitions in CSS

This system provides a modern, maintainable, and highly customizable glassmorphism design system optimized for the MCP Manager application.