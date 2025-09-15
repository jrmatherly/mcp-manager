import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ShadowVariant {
  name: string;
  className: string;
  description: string;
}

const shadowVariants: ShadowVariant[] = [
  {
    name: "Enhanced Hover",
    className: "hover:shadow-card-hover-enhanced",
    description: "Multi-layer shadow with blue glow in dark mode",
  },
  {
    name: "Subtle Enhanced",
    className: "hover:shadow-card-subtle-enhanced",
    description: "Gentle shadow with purple accent glow",
  },
  {
    name: "Strong Enhanced",
    className: "hover:shadow-card-strong-enhanced",
    description: "Bold shadow with dual-color glow effect",
  },
  {
    name: "Tailwind Default",
    className: "hover:shadow-md",
    description: "Standard Tailwind shadow (may be invisible in dark mode)",
  },
  {
    name: "Tailwind Large",
    className: "hover:shadow-lg",
    description: "Larger standard shadow",
  },
  {
    name: "CSS Variable Based",
    className: "hover:[box-shadow:var(--shadow-card-hover-light)] dark:hover:[box-shadow:var(--shadow-card-hover-dark)]",
    description: "Using CSS variables for theme-aware shadows",
  },
];

export function ShadowShowcase() {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Dark Mode Shadow Showcase</h2>
        <p className="text-muted-foreground">Hover over each card to see shadow effects in both light and dark mode</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shadowVariants.map((variant) => (
          <Card key={variant.name} className={cn("transition-all duration-300 hover:-translate-y-1 cursor-pointer", variant.className)}>
            <CardHeader>
              <CardTitle className="text-lg">{variant.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{variant.description}</p>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <code className="text-xs break-all">{variant.className}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-muted/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Implementation Guide</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">1. Use Enhanced Utilities (Recommended)</h4>
            <p className="text-muted-foreground">
              Use <code>hover:shadow-card-hover-enhanced</code> for dashboard cards with excellent dark mode visibility.
            </p>
          </div>
          <div>
            <h4 className="font-medium">2. CSS Variable Approach</h4>
            <p className="text-muted-foreground">
              Use CSS variables for maximum control:{" "}
              <code>hover:[box-shadow:var(--shadow-card-hover-light)] dark:hover:[box-shadow:var(--shadow-card-hover-dark)]</code>
            </p>
          </div>
          <div>
            <h4 className="font-medium">3. Component-Level Shadows</h4>
            <p className="text-muted-foreground">Apply shadows directly in component styles for complex multi-layer effects.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
