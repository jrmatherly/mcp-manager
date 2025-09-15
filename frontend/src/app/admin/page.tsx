"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

const AdminPage = () => {
  const router = useRouter();
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  // Check authentication and role
  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        logger.warn("Admin page: No session, redirecting to login");
        router.push("/auth/login");
        return;
      }

      const userRole = (session.user as { role?: string })?.role;
      if (userRole !== "admin") {
        logger.warn("Admin page: User does not have admin role", {
          userId: session.user.id,
          actualRole: userRole,
          requiredRole: "admin",
        });
        router.push("/dashboard"); // Redirect to dashboard instead of 404
        return;
      }

      logger.info("Admin page: Access granted, redirecting to users", {
        userId: session.user.id,
        role: userRole,
      });
      router.push("/admin/users");
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

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    </div>
  );
};

export default AdminPage;
