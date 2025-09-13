import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Glassmorphism specific colors with opacity variants
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
        // Enhanced primary colors for glassmorphism
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Glassmorphism-compatible grays with precise opacity control
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
      },
      backgroundImage: {
        // Glassmorphism gradient backgrounds
        "gradient-glass": "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(243, 244, 246, 0.6) 100%)",
        "gradient-glass-dark": "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
        "gradient-ai": "linear-gradient(90deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 50%, rgba(236, 72, 153, 0.8) 100%)",
        // Body gradients for seamless glass effect
        "body-light": "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)",
        "body-dark": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)",
        // Data visualization gradients
        "data-gradient": "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)",
        "data-gradient-dark":
          "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)",
      },
      boxShadow: {
        // Glassmorphism shadow system
        glass: "0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        "glass-hover": "0 12px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
        "glass-dark": "0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "glass-dark-hover": "0 12px 48px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        // Enhanced interactive shadows
        "glass-button": "0 4px 16px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "glass-button-hover": "0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
        "glass-input": "inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.05)",
        "glass-input-dark": "inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)",
        "glass-input-focus": "0 0 0 3px rgba(59, 130, 246, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.06)",
        "glass-input-focus-dark": "0 0 0 3px rgba(59, 130, 246, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1)",
      },
      backdropBlur: {
        xs: "2px",
        "4xl": "72px",
      },
      animation: {
        // Glassmorphism-specific animations
        float: "float 6s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 1.5s infinite",
        "mcp-pulse": "mcp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "micro-bounce": "micro-bounce 0.2s ease-out",
        "card-hover": "card-hover 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glass-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "mcp-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
        },
        "micro-bounce": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "card-hover": {
          "0%": { transform: "translateY(0) scale(1)" },
          "100%": { transform: "translateY(-4px) scale(1.02)" },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      // 3D Transform utilities
      perspective: {
        "1000": "1000px",
        "1500": "1500px",
        "2000": "2000px",
      },
      // Enhanced border radius for glassmorphism
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      // Custom spacing for glass elements
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
    },
  },
} satisfies Config;

export default config;
