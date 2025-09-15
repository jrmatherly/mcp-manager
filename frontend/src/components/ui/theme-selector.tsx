"use client";

import * as React from "react";
import { Monitor, Moon, Sun, Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemeOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  preview: {
    bg: string;
    card: string;
    text: string;
    accent: string;
  };
}

const themes: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
    description: "Clean and bright interface",
    preview: {
      bg: "bg-white",
      card: "bg-gray-50",
      text: "bg-gray-900",
      accent: "bg-blue-500",
    },
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
    description: "Easy on the eyes in low light",
    preview: {
      bg: "bg-gray-900",
      card: "bg-gray-800",
      text: "bg-white",
      accent: "bg-blue-400",
    },
  },
  {
    value: "system",
    label: "System",
    icon: <Monitor className="h-4 w-4" />,
    description: "Matches your system preference",
    preview: {
      bg: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800",
      card: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700",
      text: "bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200",
      accent: "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500",
    },
  },
];

interface ThemeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
  showDescription?: boolean;
}

export function ThemeSelector({
  value,
  onValueChange,
  disabled = false,
  className,
  showPreview = true,
  showDescription = true,
}: ThemeSelectorProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isChanging, setIsChanging] = React.useState(false);

  // Handle hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    if (disabled || newTheme === value) {
      return;
    }

    setIsChanging(true);

    // Add a smooth transition class to the root element
    const root = document.documentElement;
    root.style.setProperty("--theme-transition-duration", "300ms");
    root.classList.add("theme-transitioning");

    // Apply theme change
    onValueChange(newTheme);
    setTheme(newTheme);

    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove("theme-transitioning");
      setIsChanging(false);
    }, 300);
  };

  const handleKeyDown = (event: React.KeyboardEvent, theme: ThemeOption) => {
    if (disabled) {
      return;
    }

    const currentIndex = themes.findIndex((t) => t.value === theme.value);
    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : themes.length - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = currentIndex < themes.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        handleThemeChange(theme.value);
        return;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = themes.length - 1;
        break;
      default:
        return;
    }

    // Focus the new theme button
    const buttons = document.querySelectorAll(`[role="radio"][data-theme]`);
    const targetButton = buttons[newIndex] as HTMLButtonElement;
    if (targetButton) {
      targetButton.focus();
    }
  };

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {themes.map((theme) => (
          <div key={theme.value} className="glass-card h-24 animate-pulse bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-labelledby="theme-selector-label">
        <AnimatePresence mode="wait">
          {themes.map((theme) => {
            const isSelected = value === theme.value;
            const isCurrent = currentTheme === theme.value;

            return (
              <motion.button
                key={theme.value}
                type="button"
                disabled={disabled}
                onClick={() => handleThemeChange(theme.value)}
                onKeyDown={(e) => handleKeyDown(e, theme)}
                data-theme={theme.value}
                className={cn(
                  "group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all duration-300",
                  "glass-card hover:shadow-lg hover:-translate-y-0.5",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border hover:border-primary/50",
                  disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
                )}
                aria-checked={isSelected}
                aria-describedby={`theme-${theme.value}-description`}
                role="radio"
                tabIndex={disabled ? -1 : 0}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: themes.indexOf(theme) * 0.1 }}
                whileHover={!disabled ? { scale: 1.02 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
              >
                {/* Background gradient overlay for selected state */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isSelected ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />

                {/* Theme preview section */}
                {showPreview && (
                  <div className="relative mb-3 h-12 rounded-md overflow-hidden border border-border/50">
                    <div className={cn("absolute inset-0", theme.preview.bg)}>
                      {/* Simulated window chrome */}
                      <div className="flex items-center gap-1 p-2 h-6 bg-black/5 dark:bg-white/5">
                        <div className="w-2 h-2 rounded-full bg-red-400 opacity-60" />
                        <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-60" />
                        <div className="w-2 h-2 rounded-full bg-green-400 opacity-60" />
                      </div>

                      {/* Content preview */}
                      <div className="p-2 space-y-1">
                        <div className={cn("h-1.5 w-12 rounded-full", theme.preview.accent)} />
                        <div className={cn("h-1 w-8 rounded-full opacity-60", theme.preview.text)} />
                        <div className={cn("h-3 w-full rounded", theme.preview.card)}>
                          <div className="flex items-center justify-between p-1 h-full">
                            <div className={cn("h-1 w-6 rounded-full opacity-40", theme.preview.text)} />
                            <div className={cn("h-1 w-1 rounded-full", theme.preview.accent)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transition overlay */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{
                        x: isChanging && isSelected ? "100%" : "-100%",
                      }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </div>
                )}

                {/* Theme info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <motion.div
                        className={cn("text-muted-foreground group-hover:text-foreground transition-colors", isSelected && "text-primary")}
                        animate={{
                          scale: isSelected ? 1.1 : 1,
                          rotate: isChanging && isSelected ? 360 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {theme.icon}
                      </motion.div>
                      <span className={cn("font-medium text-sm transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                        {theme.label}
                      </span>
                      {isCurrent && !isChanging && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    {showDescription && (
                      <p id={`theme-${theme.value}-description`} className="text-xs text-muted-foreground leading-relaxed">
                        {theme.description}
                      </p>
                    )}
                  </div>

                  {/* Selection indicator */}
                  <motion.div
                    className={cn(
                      "ml-2 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      "transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 group-hover:border-muted-foreground/50",
                    )}
                    animate={{
                      scale: isSelected ? 1 : 0.8,
                      borderColor: isSelected ? "var(--primary)" : "var(--border)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="w-3 h-3" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Loading overlay */}
                <AnimatePresence>
                  {isChanging && isSelected && (
                    <motion.div
                      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Palette className="w-4 h-4 text-primary" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Current theme indicator */}
      <motion.div
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {isChanging ? (
          <motion.span className="inline-flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Palette className="w-3 h-3" />
            </motion.div>
            Applying theme...
          </motion.span>
        ) : (
          <span>
            Currently using: <strong>{themes.find((t) => t.value === currentTheme)?.label}</strong>
          </span>
        )}
      </motion.div>
    </div>
  );
}
