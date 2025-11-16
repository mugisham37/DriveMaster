/**
 * Webpack Optimization Configuration
 * 
 * Advanced webpack configuration for optimal code splitting and bundle sizes.
 * 
 * Requirements: 13.1, 13.5
 * Task: 14.1
 */

import type { Configuration } from 'webpack';

/**
 * Get optimized webpack configuration for code splitting
 */
export function getOptimizedSplitChunks(): Configuration['optimization'] {
  return {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for core React libraries
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-is)[\\/]/,
          name: 'vendor-react',
          priority: 40,
          reuseExistingChunk: true,
        },
        
        // Next.js framework chunk
        nextVendor: {
          test: /[\\/]node_modules[\\/](next)[\\/]/,
          name: 'vendor-next',
          priority: 35,
          reuseExistingChunk: true,
        },
        
        // UI library chunk (shadcn/ui dependencies)
        uiVendor: {
          test: /[\\/]node_modules[\\/](@radix-ui|class-variance-authority|clsx|tailwind-merge)[\\/]/,
          name: 'vendor-ui',
          priority: 30,
          reuseExistingChunk: true,
        },
        
        // Chart library chunk (recharts is heavy)
        chartsVendor: {
          test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
          name: 'vendor-charts',
          priority: 25,
          reuseExistingChunk: true,
        },
        
        // Form libraries chunk
        formsVendor: {
          test: /[\\/]node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/,
          name: 'vendor-forms',
          priority: 20,
          reuseExistingChunk: true,
        },
        
        // Animation libraries chunk
        animationVendor: {
          test: /[\\/]node_modules[\\/](framer-motion|@lottiefiles)[\\/]/,
          name: 'vendor-animation',
          priority: 15,
          reuseExistingChunk: true,
        },
        
        // Utility libraries chunk
        utilsVendor: {
          test: /[\\/]node_modules[\\/](date-fns|lodash|ramda)[\\/]/,
          name: 'vendor-utils',
          priority: 10,
          reuseExistingChunk: true,
        },
        
        // Common shared code across routes
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          name: 'common',
        },
        
        // Default vendor chunk for remaining node_modules
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
          name: 'vendor-default',
        },
      },
      
      // Maximum size limits
      maxSize: {
        // Split chunks larger than 200KB
        javascript: 200 * 1024,
        styles: 100 * 1024,
      },
      
      // Minimum size to create a chunk
      minSize: 20 * 1024, // 20KB
      
      // Maximum async requests at an entry point
      maxAsyncRequests: 30,
      
      // Maximum initial requests at an entry point
      maxInitialRequests: 30,
    },
    
    // Runtime chunk for webpack runtime code
    runtimeChunk: {
      name: 'runtime',
    },
    
    // Module IDs optimization
    moduleIds: 'deterministic',
    
    // Minimize in production
    minimize: process.env.NODE_ENV === 'production',
  };
}

/**
 * Get module concatenation settings for better tree shaking
 */
export function getModuleConcatenation(): Configuration['optimization'] {
  return {
    concatenateModules: true,
    usedExports: true,
    sideEffects: true,
  };
}

/**
 * Get performance hints configuration
 */
export function getPerformanceConfig(): Configuration['performance'] {
  return {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 200 * 1024, // 200KB
    maxAssetSize: 100 * 1024, // 100KB
    assetFilter: (assetFilename) => {
      // Only check JS and CSS files
      return /\.(js|css)$/.test(assetFilename);
    },
  };
}

/**
 * Get resolve configuration for faster module resolution
 */
export function getResolveConfig(): Configuration['resolve'] {
  return {
    // Prioritize ES modules for better tree shaking
    mainFields: ['module', 'main'],
    
    // Extensions to try when resolving modules
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    
    // Aliases for common paths (already configured in tsconfig)
    alias: {
      // Add any additional aliases here if needed
    },
    
    // Symlinks resolution
    symlinks: true,
  };
}

/**
 * Get cache configuration for faster rebuilds
 */
export function getCacheConfig(): Configuration['cache'] {
  return {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
    cacheDirectory: '.next/cache/webpack',
  };
}

/**
 * Bundle analyzer configuration (for development)
 */
export function getBundleAnalyzerConfig() {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
  
  return new BundleAnalyzerPlugin({
    analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
    analyzerPort: 8888,
    openAnalyzer: true,
    generateStatsFile: true,
    statsFilename: 'bundle-stats.json',
    reportFilename: 'bundle-report.html',
  });
}

/**
 * Get complete optimized webpack configuration
 */
export function getCompleteWebpackOptimization(): Configuration {
  return {
    optimization: {
      ...getOptimizedSplitChunks(),
      ...getModuleConcatenation(),
    },
    performance: getPerformanceConfig(),
    resolve: getResolveConfig(),
    cache: getCacheConfig(),
  };
}

/**
 * Validate bundle sizes against targets
 */
export interface BundleSizeReport {
  name: string;
  size: number;
  gzipSize: number;
  target: number;
  exceedsTarget: boolean;
}

export function validateBundleSizes(
  stats: any,
  targets: { initial: number; route: number; vendor: number }
): BundleSizeReport[] {
  const reports: BundleSizeReport[] = [];
  
  if (!stats || !stats.assets) {
    return reports;
  }
  
  stats.assets.forEach((asset: any) => {
    const name = asset.name;
    const size = asset.size / 1024; // Convert to KB
    const gzipSize = asset.gzipSize ? asset.gzipSize / 1024 : size * 0.3; // Estimate if not available
    
    let target = targets.route;
    if (name.includes('vendor')) {
      target = targets.vendor;
    } else if (name.includes('main') || name.includes('runtime')) {
      target = targets.initial;
    }
    
    reports.push({
      name,
      size,
      gzipSize,
      target,
      exceedsTarget: gzipSize > target,
    });
  });
  
  return reports;
}

/**
 * Log bundle size report
 */
export function logBundleSizeReport(reports: BundleSizeReport[]) {
  console.log('\n📦 Bundle Size Report\n');
  console.log('─'.repeat(80));
  console.log(
    'Asset'.padEnd(40) +
    'Size'.padEnd(12) +
    'Gzip'.padEnd(12) +
    'Target'.padEnd(12) +
    'Status'
  );
  console.log('─'.repeat(80));
  
  reports.forEach((report) => {
    const status = report.exceedsTarget ? '❌ EXCEEDS' : '✅ OK';
    const statusColor = report.exceedsTarget ? '\x1b[31m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    
    console.log(
      report.name.padEnd(40) +
      `${report.size.toFixed(2)}KB`.padEnd(12) +
      `${report.gzipSize.toFixed(2)}KB`.padEnd(12) +
      `${report.target}KB`.padEnd(12) +
      `${statusColor}${status}${resetColor}`
    );
  });
  
  console.log('─'.repeat(80));
  
  const exceeding = reports.filter(r => r.exceedsTarget);
  if (exceeding.length > 0) {
    console.log(`\n⚠️  ${exceeding.length} bundle(s) exceed target size`);
  } else {
    console.log('\n✅ All bundles within target sizes');
  }
  console.log('');
}
