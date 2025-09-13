/**
 * Glassmorphism Design System Demo Components
 * Tailwind CSS v4 Implementation with CSS Variables
 *
 * This file demonstrates the complete glassmorphism design system
 * with all available components and variants.
 */

import React from "react";
// import { motion } from "framer-motion"; // Unused import removed

export function GlassDemo() {
  return (
    <div className="min-h-screen p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold glass-text">Glassmorphism Design System</h1>
        <p className="text-lg text-muted-foreground">Tailwind CSS v4 Implementation with Native CSS Variables</p>
      </div>

      {/* Core Glass Cards */}
      <section className="glass-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-3">Standard Glass Card</h3>
          <p className="text-muted-foreground mb-4">Basic glassmorphism card with hover effects and backdrop blur.</p>
          <button className="glass-button">Glass Button</button>
        </div>

        <div className="ai-tool-card p-6">
          <h3 className="text-lg font-semibold mb-3">AI Tool Card</h3>
          <p className="text-muted-foreground mb-4">Enhanced card with gradient top border and scaling effects.</p>
          <div className="flex items-center space-x-2">
            <div className="mcp-connection-indicator">
              <span className="glass-badge">Connected</span>
            </div>
          </div>
        </div>

        <div className="glass-heavy p-6">
          <h3 className="text-lg font-semibold mb-3">Heavy Glass</h3>
          <p className="text-muted-foreground mb-4">Maximum blur and saturation for premium sections.</p>
          <div className="glass-skeleton h-4 w-3/4 mb-2"></div>
          <div className="glass-skeleton h-4 w-1/2"></div>
        </div>
      </section>

      {/* Form Elements */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Glass Form Elements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Glass Input</label>
            <input type="text" placeholder="Enter text..." className="glass-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Glass Textarea</label>
            <textarea placeholder="Enter description..." className="glass-textarea" />
          </div>
        </div>
        <div className="flex space-x-4">
          <button className="btn-glass-primary">Primary</button>
          <button className="btn-glass-secondary">Secondary</button>
          <button className="btn-glass-danger">Danger</button>
        </div>
      </section>

      {/* Status Badges */}
      <section className="glass-card p-6">
        <h2 className="text-2xl font-semibold mb-4">Status Indicators</h2>
        <div className="flex flex-wrap gap-3">
          <span className="glass-badge">Success</span>
          <span className="glass-badge-warning">Warning</span>
          <span className="glass-badge-error">Error</span>
          <span className="glass-badge-info">Info</span>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium">MCP Connection Status</h3>
          <div className="flex space-x-6">
            <div className="mcp-connection-indicator mcp-status-connected">
              <span className="text-sm">Connected</span>
            </div>
            <div className="mcp-connection-indicator mcp-status-connecting">
              <span className="text-sm">Connecting</span>
            </div>
            <div className="mcp-connection-indicator mcp-status-error">
              <span className="text-sm">Error</span>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Examples */}
      <section className="glass-nav p-4">
        <h2 className="text-xl font-semibold mb-4">Glass Navigation</h2>
        <nav className="flex space-x-1">
          <a href="#" className="glass-nav-item active">
            Dashboard
          </a>
          <a href="#" className="glass-nav-item">
            MCP Servers
          </a>
          <a href="#" className="glass-nav-item">
            Analytics
          </a>
          <a href="#" className="glass-nav-item">
            Settings
          </a>
        </nav>
      </section>

      {/* Animation Showcase */}
      <section className="glass-grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="float-animation text-6xl mb-4">🚀</div>
          <h3 className="font-semibold">Float Animation</h3>
          <p className="text-sm text-muted-foreground">Continuous floating motion</p>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="animate-breathe text-6xl mb-4">💫</div>
          <h3 className="font-semibold">Breathe Animation</h3>
          <p className="text-sm text-muted-foreground">Gentle pulsing effect</p>
        </div>

        <div className="glass-card p-6 text-center">
          <div className="animate-gradient-shift bg-gradient-ai h-16 rounded-lg mb-4"></div>
          <h3 className="font-semibold">Gradient Shift</h3>
          <p className="text-sm text-muted-foreground">Dynamic color transitions</p>
        </div>
      </section>

      {/* 3D Card Flip Demo */}
      <section className="flex justify-center">
        <div className="flip-card">
          <div className="flip-card-inner">
            <div className="flip-card-front glass-card p-8 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Front Side</h3>
                <p className="text-muted-foreground">Click to flip</p>
              </div>
            </div>
            <div className="flip-card-back glass-card p-8 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Back Side</h3>
                <p className="text-muted-foreground">3D CSS transforms</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Variants */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Performance Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-lite p-6">
            <h3 className="font-semibold mb-2">Glass Lite</h3>
            <p className="text-sm text-muted-foreground">Minimal blur for better performance on low-end devices</p>
          </div>
          <div className="glass-medium p-6">
            <h3 className="font-semibold mb-2">Glass Medium</h3>
            <p className="text-sm text-muted-foreground">Balanced performance and visual appeal</p>
          </div>
          <div className="glass-heavy p-6">
            <h3 className="font-semibold mb-2">Glass Heavy</h3>
            <p className="text-sm text-muted-foreground">Maximum visual effects for modern devices</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Utility hook for flip card interaction
export function useFlipCard() {
  const [isFlipped, setIsFlipped] = React.useState(false);

  const toggleFlip = () => setIsFlipped(!isFlipped);

  return { isFlipped, toggleFlip };
}

// Enhanced Glass Modal Component
export function GlassModal({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="glass-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="glass-focus p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default GlassDemo;
