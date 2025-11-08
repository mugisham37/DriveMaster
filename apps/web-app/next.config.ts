import type { NextConfig } from "next";
import {
  getOptimizedWebpackConfig,
  getPerformancePlugins,
} from "./src/lib/config/webpack";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ["@heroicons/react", "lucide-react"],
  },

  // Turbopack configuration
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Image optimization configuration
  images: {
    domains: [
      "assets.exercism.org",
      "avatars.githubusercontent.com",
      "github.com",
      "exercism.org",
      "localhost",
      // Add other domains as needed
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enhanced webpack configuration for optimal performance
  webpack: (config, options) => {
    // Apply optimized webpack configuration
    const optimizedConfig = getOptimizedWebpackConfig(config, options);

    // Add performance plugins
    const performancePlugins = getPerformancePlugins(
      options.webpack,
      options.dev,
    );
    optimizedConfig.plugins = [
      ...(optimizedConfig.plugins || []),
      ...performancePlugins,
    ];

    return optimizedConfig;
  },

  // Compression and caching
  compress: true,

  // Build optimization settings
  poweredByHeader: false,
  generateEtags: true,

  // Output configuration for performance
  output: "standalone",

  // Environment variables
  env: {
    NEXT_PUBLIC_ASSETS_HOST: process.env.NEXT_PUBLIC_ASSETS_HOST || "",
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || "",
    RAILS_API_URL: process.env.RAILS_API_URL || "http://localhost:3000",
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Redirects for maintaining URL structure
  async redirects() {
    return [
      // Add redirects as needed to maintain Rails URL compatibility
    ];
  },

  // Rewrites for API proxy
  async rewrites() {
    return [
      {
        source: "/api/rails/:path*",
        destination: `${process.env.RAILS_API_URL || "http://localhost:3000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
