import type { NextConfig } from "next";
import { env } from "./src/env"; // Import and validate environment variables at build time

const nextConfig: NextConfig = {
  /* config options here */

  // Redirect configuration for API proxy
  async rewrites() {
    // Use the backend URL from environment variables
    const backendUrl = env.BACKEND_URL;

    return [
      // Proxy API requests to the backend server (excluding /api/auth for Better-Auth)
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/mcp/:path*",
        destination: `${backendUrl}/mcp/:path*`,
      },
      {
        source: "/oauth/:path*",
        destination: `${backendUrl}/oauth/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/metrics",
        destination: `${backendUrl}/metrics`,
      },
    ];
  },

  // Webpack configuration for better compatibility
  webpack: (config, { isServer }) => {
    // Fix for postgres and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }

    return config;
  },

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },

  // Image optimization configuration
  images: {
    remotePatterns: (() => {
      // Extract hostnames from environment URLs
      const patterns: Array<{
        protocol: "http" | "https";
        hostname: string;
        port?: string;
        pathname: string;
      }> = [];

      // Parse backend URL
      try {
        const backendUrl = new URL(env.BACKEND_URL);
        patterns.push({
          protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
          hostname: backendUrl.hostname,
          port: backendUrl.port || "",
          pathname: "/**",
        });
      } catch (e) {
        // Fallback if URL parsing fails
        console.warn("Failed to parse BACKEND_URL for images config:", e);
      }

      // Parse app URL if it exists
      if (env.NEXT_PUBLIC_APP_URL) {
        try {
          const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
          patterns.push({
            protocol: appUrl.protocol.replace(":", "") as "http" | "https",
            hostname: appUrl.hostname,
            port: appUrl.port || "",
            pathname: "/**",
          });
        } catch (e) {
          console.warn("Failed to parse NEXT_PUBLIC_APP_URL for images config:", e);
        }
      }

      // Default fallback patterns if no valid URLs found
      if (patterns.length === 0) {
        patterns.push(
          {
            protocol: "http",
            hostname: "localhost",
            port: "",
            pathname: "/**",
          },
          {
            protocol: "https",
            hostname: "localhost",
            port: "",
            pathname: "/**",
          }
        );
      }

      return patterns;
    })(),
  },

  // Output configuration
  output: "standalone",
};

export default nextConfig;
