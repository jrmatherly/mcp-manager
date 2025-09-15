"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import DashboardLayout from "@/components/admin/dashboard-layout";
import { logger } from "@/lib/logger";

interface ClientAdminLayoutProps {
  children: React.ReactNode;
}

export default function ClientAdminLayout({ children }: ClientAdminLayoutProps) {
  const router = useRouter();
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  // Check authentication and role
  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        logger.warn("Admin layout: No session, redirecting to login");
        router.push("/auth/login");
        return;
      }

      const userRole = (session.user as { role?: string })?.role;
      if (userRole !== "admin") {
        logger.warn("Admin layout: User does not have admin role", {
          userId: session.user.id,
          actualRole: userRole,
          requiredRole: "admin",
        });
        router.push("/dashboard"); // Redirect to dashboard instead of 404
        return;
      }

      logger.info("Admin layout: Access granted", {
        userId: session.user.id,
        role: userRole,
      });
    }
  }, [session, isPending, router]);

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render the page if not authenticated
  if (!session?.user) {
    return null;
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}