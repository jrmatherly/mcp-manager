import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Disable automatic preloading to prevent console warning
});

export const metadata: Metadata = {
  title: "MCP Manager",
  description: "A Next.js boilerplate for building web applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans antialiased bg-background`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
