"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnsavedChangesIndicatorProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave?: () => void;
  onReset?: () => void;
  className?: string;
  variant?: "floating" | "inline" | "minimal";
  showActions?: boolean;
}

export function UnsavedChangesIndicator({
  hasChanges,
  isSaving,
  onSave,
  onReset,
  className,
  variant = "floating",
  showActions = true,
}: UnsavedChangesIndicatorProps) {
  if (!hasChanges && !isSaving) {
    return null;
  }

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: variant === "floating" ? 20 : 0,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: variant === "floating" ? 20 : 0,
      scale: 0.9,
      transition: {
        duration: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
  };

  if (variant === "minimal") {
    return (
      <AnimatePresence>
        {(hasChanges || isSaving) && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "inline-flex items-center gap-2 text-sm",
              isSaving ? "text-primary" : "text-orange-600 dark:text-orange-400",
              className,
            )}
          >
            <motion.div
              animate={{
                scale: isSaving ? [1, 1.2, 1] : [1, 1.1, 1],
                opacity: isSaving ? [1, 0.7, 1] : 1,
              }}
              transition={{
                duration: isSaving ? 1 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {isSaving ? <Save className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </motion.div>
            <span className="font-medium">{isSaving ? "Saving..." : "Unsaved changes"}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === "inline") {
    return (
      <AnimatePresence>
        {(hasChanges || isSaving) && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30",
              isSaving && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30",
              className,
            )}
          >
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <motion.div
                animate={{
                  scale: isSaving ? [1, 1.2, 1] : [1, 1.1, 1],
                  rotate: isSaving ? [0, 360] : 0,
                }}
                transition={{
                  duration: isSaving ? 1 : 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={cn(
                  "p-2 rounded-full",
                  isSaving
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                )}
              >
                {isSaving ? <Save className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </motion.div>
              <div>
                <div
                  className={cn(
                    "font-medium text-sm",
                    isSaving ? "text-blue-800 dark:text-blue-200" : "text-orange-800 dark:text-orange-200",
                  )}
                >
                  {isSaving ? "Saving changes..." : "You have unsaved changes"}
                </div>
                <div
                  className={cn("text-xs mt-0.5", isSaving ? "text-blue-600 dark:text-blue-300" : "text-orange-600 dark:text-orange-300")}
                >
                  {isSaving ? "Please wait while your settings are being saved" : "Your changes will be lost if you navigate away"}
                </div>
              </div>
            </motion.div>

            {showActions && !isSaving && (
              <motion.div variants={itemVariants} className="flex items-center gap-2">
                {onReset && (
                  <motion.button
                    type="button"
                    onClick={onReset}
                    className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Reset changes"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                )}
                {onSave && (
                  <motion.button
                    type="button"
                    onClick={onSave}
                    className="px-3 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-md transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Save Now
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Floating variant (default)
  return (
    <AnimatePresence>
      {(hasChanges || isSaving) && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed bottom-4 right-4 z-50 max-w-sm",
            "glass-card p-4 shadow-lg border",
            "bg-background/95 backdrop-blur-sm",
            className,
          )}
        >
          <motion.div variants={itemVariants} className="flex items-start gap-3">
            <motion.div
              animate={{
                scale: isSaving ? [1, 1.2, 1] : [1, 1.1, 1],
                rotate: isSaving ? [0, 360] : 0,
              }}
              transition={{
                duration: isSaving ? 1 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={cn(
                "p-2 rounded-full mt-0.5",
                isSaving
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
              )}
            >
              {isSaving ? <Save className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-medium text-sm",
                  isSaving ? "text-blue-800 dark:text-blue-200" : "text-orange-800 dark:text-orange-200",
                )}
              >
                {isSaving ? "Saving your changes..." : "Unsaved changes detected"}
              </div>
              <div
                className={cn(
                  "text-xs mt-1 leading-relaxed",
                  isSaving ? "text-blue-600 dark:text-blue-300" : "text-orange-600 dark:text-orange-300",
                )}
              >
                {isSaving ? "Please wait while your settings are being saved" : "Don't forget to save your changes before leaving"}
              </div>

              {showActions && !isSaving && (
                <motion.div variants={itemVariants} className="flex items-center gap-2 mt-3">
                  {onReset && (
                    <motion.button
                      type="button"
                      onClick={onReset}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 rounded transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </motion.button>
                  )}
                  {onSave && (
                    <motion.button
                      type="button"
                      onClick={onSave}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 rounded transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Save className="w-3 h-3" />
                      Save Now
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
