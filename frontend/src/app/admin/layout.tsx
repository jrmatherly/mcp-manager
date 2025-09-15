import ClientAdminLayout from "./client-layout";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientAdminLayout>{children}</ClientAdminLayout>;
}
