import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardLayout from "@/components/admin/dashboard-layout";
import type { AuthSession } from "@/types/better-auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return notFound();
  }

  const userWithRole = session.user as AuthSession["user"];
  if (userWithRole.role !== "admin") {
    return notFound();
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
