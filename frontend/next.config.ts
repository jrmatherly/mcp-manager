import type { NextConfig } from "next";
import "./src/env"; // Validate environment variables at build time

const nextConfig: NextConfig = {
  /* config options here */

  // Redirect configuration for API proxy
  async rewrites() {
    return [
      // Proxy API requests to the backend server (excluding /api/auth for Better-Auth)
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
      {
        source: "/mcp/:path*",
        destination: "http://localhost:8000/mcp/:path*",
      },
      {
        source: "/oauth/:path*",
        destination: "http://localhost:8000/oauth/:path*",
      },
      {
        source: "/health",
        destination: "http://localhost:8000/health",
      },
      {
        source: "/metrics",
        destination: "http://localhost:8000/metrics",
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
    domains: ["localhost"],
  },

  // Output configuration
  output: "standalone",
};

export default nextConfig;
