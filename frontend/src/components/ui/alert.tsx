import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-300 ease-out [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10 dark:bg-destructive/20",
        success:
          "border-green-500/50 text-green-700 dark:text-green-300 dark:border-green-400/50 [&>svg]:text-green-600 dark:[&>svg]:text-green-400 bg-green-50 dark:bg-green-950/50",
        warning:
          "border-amber-500/50 text-amber-700 dark:text-amber-300 dark:border-amber-400/50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 bg-amber-50 dark:bg-amber-950/50",
        info: "border-blue-500/50 text-blue-700 dark:text-blue-300 dark:border-blue-400/50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400 bg-blue-50 dark:bg-blue-950/50",
      },
      size: {
        sm: "px-3 py-2 text-xs [&>svg]:left-3 [&>svg]:top-3 [&>svg~*]:pl-6",
        default: "px-4 py-3 text-sm [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
        lg: "px-6 py-4 text-base [&>svg]:left-5 [&>svg]:top-5 [&>svg~*]:pl-8",
      },
      glassmorphism: {
        true: "backdrop-blur-lg bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-white/10 shadow-glass dark:shadow-glass-dark",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glassmorphism: false,
    },
  },
);

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, size, glassmorphism, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant, size, glassmorphism }), className)} {...props} />
  ),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-medium leading-none tracking-tight",
      "text-sm sm:text-base", // Responsive typography
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-xs sm:text-sm [&_p]:leading-relaxed",
        "text-muted-foreground", // Better contrast for descriptions
        className,
      )}
      {...props}
    />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
