interface WebpackOptions {
  buildId: string;
  dev: boolean;
  isServer: boolean;
  defaultLoaders: {
    babel: {
      loader: string;
      options: Record<string, unknown>;
    };
  };
  nextRuntime?: "nodejs" | "edge";
  webpack: {
    ProgressPlugin: new (...args: unknown[]) => unknown;
  };
}

interface WebpackConfiguration {
  optimization?: {
    usedExports?: boolean;
    sideEffects?: boolean;
    splitChunks?: {
      chunks?: string;
      cacheGroups?: Record<string, unknown>;
    };
  };
  module?: {
    rules?: Array<{
      test: RegExp;
      use: Array<{
        loader: string;
        options?: Record<string, unknown>;
      }>;
    }>;
  };
  resolve?: {
    alias?: Record<string, string>;
  };
  plugins?: unknown[];
}

/**
 * Get optimized webpack configuration for production builds
 */
export function getOptimizedWebpackConfig(
  config: WebpackConfiguration,
  options: WebpackOptions,
): WebpackConfiguration {
  // Clone the config to avoid mutations
  const optimizedConfig = { ...config };

  // Optimize for production builds
  if (!options.dev) {
    // Enable tree shaking
    optimizedConfig.optimization = {
      ...optimizedConfig.optimization,
      usedExports: true,
      sideEffects: false,

      // Optimize chunk splitting
      splitChunks: {
        ...optimizedConfig.optimization?.splitChunks,
        chunks: "all",
        cacheGroups: {
          ...optimizedConfig.optimization?.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    };
  }

  // SVG optimization
  if (!optimizedConfig.module) {
    optimizedConfig.module = { rules: [] };
  }

  // Add SVG loader rule
  optimizedConfig.module.rules = [
    ...(optimizedConfig.module.rules || []),
    {
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [
                {
                  name: "preset-default",
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
                "removeDimensions",
              ],
            },
          },
        },
      ],
    },
  ];

  // Resolve configuration
  optimizedConfig.resolve = {
    ...optimizedConfig.resolve,
    alias: {
      ...optimizedConfig.resolve?.alias,
      "@": process.cwd() + "/src",
      "@juliangarnierorg/anime-beta":
        process.cwd() + "/src/lib/anime-beta-mock.ts",
      "@exercism/highlightjs-futhark":
        process.cwd() + "/src/lib/highlightjs-mock.ts",
      "@exercism/highlightjs-uiua":
        process.cwd() + "/src/lib/highlightjs-mock.ts",
    },
  };

  return optimizedConfig;
}

/**
 * Get performance-focused webpack plugins
 */
export function getPerformancePlugins(
  webpack: WebpackOptions["webpack"],
  isDev: boolean,
): unknown[] {
  const plugins: unknown[] = [];

  // Progress plugin for better build feedback
  if (isDev) {
    plugins.push(
      new webpack.ProgressPlugin({
        activeModules: false,
        entries: true,
        modules: true,
        modulesCount: 5000,
        profile: false,
        dependencies: true,
        dependenciesCount: 10000,
        percentBy: null,
      }),
    );
  }

  // Note: Bundle analyzer and compression plugins are handled by Next.js built-in optimizations
  // or can be added via separate webpack plugins in next.config.ts if needed

  return plugins;
}
