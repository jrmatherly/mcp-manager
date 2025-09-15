"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import toast, { Toaster } from "react-hot-toast";
import { Check, X, Info, Loader2 } from "lucide-react";

interface ToastConfigProps {
  children?: React.ReactNode;
}

export function ToastConfig({ children }: ToastConfigProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    toast.remove(); // Clear any existing toasts when theme changes
  }, [resolvedTheme]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 20,
          left: 20,
          bottom: 20,
          right: 20,
        }}
        toastOptions={{
          // Default options
          duration: 4000,
          className: "",
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            backdropFilter: "blur(8px)",
            maxWidth: "420px",
          },

          // Success
          success: {
            duration: 3000,
            iconTheme: {
              primary: "hsl(var(--primary))",
              secondary: "hsl(var(--primary-foreground))",
            },
            style: {
              border: "1px solid hsl(var(--primary) / 0.2)",
              background: "hsl(var(--background) / 0.95)",
            },
          },

          // Error
          error: {
            duration: 5000,
            iconTheme: {
              primary: "hsl(var(--destructive))",
              secondary: "hsl(var(--destructive-foreground))",
            },
            style: {
              border: "1px solid hsl(var(--destructive) / 0.2)",
              background: "hsl(var(--background) / 0.95)",
            },
          },

          // Loading
          loading: {
            duration: Infinity,
            iconTheme: {
              primary: "hsl(var(--muted-foreground))",
              secondary: "hsl(var(--muted))",
            },
            style: {
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background) / 0.95)",
            },
          },
        }}
      />
    </>
  );
}

// Enhanced toast functions with better theming and accessibility
export const enhancedToast = {
  success: (message: string, options?: Record<string, unknown>) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } glass-card p-4 flex items-center gap-3 pointer-events-auto max-w-md w-full rounded-lg shadow-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">{message}</div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-sm"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      options,
    );
  },

  error: (message: string, options?: Record<string, unknown>) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } glass-card p-4 flex items-center gap-3 pointer-events-auto max-w-md w-full rounded-lg shadow-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 text-sm font-medium text-red-800 dark:text-red-200">{message}</div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-sm"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      options,
    );
  },

  loading: (message: string, options?: Record<string, unknown>) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } glass-card p-4 flex items-center gap-3 pointer-events-auto max-w-md w-full rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          </div>
          <div className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-200">{message}</div>
        </div>
      ),
      { ...options, duration: Infinity },
    );
  },

  info: (message: string, options?: Record<string, unknown>) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } glass-card p-4 flex items-center gap-3 pointer-events-auto max-w-md w-full rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-200">{message}</div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      options,
    );
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    _options?: Record<string, unknown>,
  ) => {
    const id = enhancedToast.loading(messages.loading);

    promise
      .then((data) => {
        toast.dismiss(id);
        const successMessage = typeof messages.success === "function" ? messages.success(data) : messages.success;
        enhancedToast.success(successMessage);
        return data;
      })
      .catch((error) => {
        toast.dismiss(id);
        const errorMessage = typeof messages.error === "function" ? messages.error(error) : messages.error;
        enhancedToast.error(errorMessage);
        throw error;
      });

    return promise;
  },
};
