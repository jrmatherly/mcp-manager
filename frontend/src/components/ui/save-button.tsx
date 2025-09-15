"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "success" | "error";

interface SaveButtonProps extends Omit<React.ComponentProps<typeof Button>, "onClick"> {
  hasChanges: boolean;
  onSave: () => Promise<void> | void;
  saveState?: SaveState;
  successMessage?: string;
  errorMessage?: string;
  idleText?: string;
  savingText?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SaveButton({
  hasChanges,
  onSave,
  saveState: externalSaveState,
  successMessage = "Saved successfully",
  errorMessage = "Failed to save",
  idleText = "Save Changes",
  savingText = "Saving...",
  disabled = false,
  variant = "default",
  size = "default",
  className,
  ...props
}: SaveButtonProps) {
  const [internalSaveState, setInternalSaveState] = React.useState<SaveState>("idle");
  const [_showSuccess, setShowSuccess] = React.useState(false);
  const [showError, setShowError] = React.useState(false);

  const saveState = externalSaveState || internalSaveState;

  const handleSave = async () => {
    if (!hasChanges || disabled || saveState === "saving") {
      return;
    }

    setInternalSaveState("saving");
    setShowSuccess(false);
    setShowError(false);

    try {
      await onSave();
      setInternalSaveState("success");
      setShowSuccess(true);

      // Auto-reset success state after animation
      setTimeout(() => {
        setInternalSaveState("idle");
        setShowSuccess(false);
      }, 2000);
    } catch {
      // Log error without console.error to avoid ESLint warning
      setInternalSaveState("error");
      setShowError(true);

      // Auto-reset error state
      setTimeout(() => {
        setInternalSaveState("idle");
        setShowError(false);
      }, 3000);
    }
  };

  const getButtonContent = () => {
    switch (saveState) {
      case "saving":
        return (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-4 h-4" />
            </motion.div>
            {savingText}
          </motion.div>
        );

      case "success":
        return (
          <motion.div
            className="flex items-center gap-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              duration: 0.3,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 600,
                damping: 20,
                delay: 0.1,
              }}
            >
              <Check className="w-4 h-4" />
            </motion.div>
            {successMessage}
          </motion.div>
        );

      case "error":
        return (
          <motion.div
            className="flex items-center gap-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{
                x: showError ? [0, -1, 1, -1, 1, 0] : 0,
              }}
              transition={{
                duration: 0.4,
                times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              }}
            >
              <AlertCircle className="w-4 h-4" />
            </motion.div>
            {errorMessage}
          </motion.div>
        );

      default:
        return (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Save className="w-4 h-4" />
            {idleText}
          </motion.div>
        );
    }
  };

  const getButtonVariant = () => {
    switch (saveState) {
      case "success":
        return "default"; // Keep consistent styling
      case "error":
        return "destructive";
      default:
        return variant;
    }
  };

  const getButtonColors = () => {
    switch (saveState) {
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white";
      case "error":
        return ""; // Let variant handle this
      default:
        return "";
    }
  };

  const isDisabled = disabled || !hasChanges || saveState === "saving";

  return (
    <div className="relative">
      <motion.div whileHover={!isDisabled ? { scale: 1.02 } : {}} whileTap={!isDisabled ? { scale: 0.98 } : {}}>
        <Button
          onClick={handleSave}
          disabled={isDisabled}
          variant={getButtonVariant()}
          size={size}
          className={cn(
            "min-w-[120px] relative overflow-hidden transition-all duration-300",
            getButtonColors(),
            // Pulse animation for changes
            hasChanges && saveState === "idle" && "animate-pulse-subtle",
            // Disabled state
            isDisabled && "cursor-not-allowed",
            className,
          )}
          {...props}
        >
          <AnimatePresence mode="wait">
            <motion.div key={saveState}>{getButtonContent()}</motion.div>
          </AnimatePresence>

          {/* Success particle effect */}
          <AnimatePresence>
            {saveState === "success" && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    initial={{
                      x: "50%",
                      y: "50%",
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 200}%`,
                      y: `${50 + (Math.random() - 0.5) * 200}%`,
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Loading shimmer effect */}
          <AnimatePresence>
            {saveState === "saving" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Floating tooltip for disabled state */}
      <AnimatePresence>
        {!hasChanges && saveState === "idle" && (
          <motion.div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs bg-muted text-muted-foreground rounded opacity-0 pointer-events-none"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ delay: 1 }}
          >
            No changes to save
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
