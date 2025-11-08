#!/usr/bin/env node

/**
 * Performance configuration verification script
 * Validates that all performance optimizations are properly configured
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying performance configuration...");

const checks = [];
const warnings = [];
const errors = [];

// 1. Check Next.js configuration
console.log("📋 Checking Next.js configuration...");
const nextConfigPath = path.join(process.cwd(), "next.config.ts");

if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, "utf8");

  // Check for essential performance configurations
  const requiredConfigs = [
    "compress: true",
    "swcMinify: true",
    "poweredByHeader: false",
    "generateEtags: true",
    "images:",
    "webpack:",
    "headers()",
  ];

  requiredConfigs.forEach((config) => {
    if (nextConfig.includes(config)) {
      checks.push(`✅ ${config} configured`);
    } else {
      warnings.push(`⚠️  ${config} not found in configuration`);
    }
  });

  // Check for image optimization
  if (nextConfig.includes("formats: ['image/webp', 'image/avif']")) {
    checks.push("✅ Modern image formats configured");
  } else {
    warnings.push("⚠️  Modern image formats not configured");
  }

  // Check for caching headers
  if (nextConfig.includes("Cache-Control")) {
    checks.push("✅ Caching headers configured");
  } else {
    warnings.push("⚠️  Caching headers not configured");
  }
} else {
  errors.push("❌ next.config.ts not found");
}

// 2. Check environment configuration
console.log("🌍 Checking environment configuration...");
const envExamplePath = path.join(process.cwd(), ".env.example");

if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, "utf8");

  const requiredEnvVars = [
    "NEXT_PUBLIC_ASSETS_HOST",
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_WS_URL",
    "NEXTAUTH_SECRET",
    "NEXT_PUBLIC_ANALYTICS_ID",
  ];

  requiredEnvVars.forEach((envVar) => {
    if (envExample.includes(envVar)) {
      checks.push(`✅ ${envVar} documented`);
    } else {
      warnings.push(`⚠️  ${envVar} not documented`);
    }
  });
} else {
  warnings.push("⚠️  .env.example not found");
}

// 3. Check performance monitoring setup
console.log("📊 Checking performance monitoring...");
const performancePath = path.join(process.cwd(), "lib", "performance.ts");

if (fs.existsSync(performancePath)) {
  checks.push("✅ Performance monitoring configured");

  const performanceCode = fs.readFileSync(performancePath, "utf8");

  if (
    performanceCode.includes("getCLS") &&
    performanceCode.includes("getLCP")
  ) {
    checks.push("✅ Core Web Vitals tracking enabled");
  } else {
    warnings.push("⚠️  Core Web Vitals tracking incomplete");
  }
} else {
  warnings.push("⚠️  Performance monitoring not configured");
}

// 4. Check webpack configuration
console.log("⚙️  Checking webpack configuration...");
const webpackConfigPath = path.join(
  process.cwd(),
  "lib",
  "config",
  "webpack.ts",
);

if (fs.existsSync(webpackConfigPath)) {
  checks.push("✅ Custom webpack configuration available");

  const webpackConfig = fs.readFileSync(webpackConfigPath, "utf8");

  if (webpackConfig.includes("splitChunks")) {
    checks.push("✅ Code splitting configured");
  }

  if (webpackConfig.includes("svgo")) {
    checks.push("✅ SVG optimization configured");
  }
} else {
  warnings.push("⚠️  Custom webpack configuration not found");
}

// 5. Check build optimization script
console.log("🚀 Checking build optimization...");
const buildOptPath = path.join(
  process.cwd(),
  "scripts",
  "build-optimization.js",
);

if (fs.existsSync(buildOptPath)) {
  checks.push("✅ Build optimization script available");
} else {
  warnings.push("⚠️  Build optimization script not found");
}

// 6. Check package.json scripts
console.log("📦 Checking package.json scripts...");
const packageJsonPath = path.join(process.cwd(), "package.json");

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const requiredScripts = [
    "build",
    "build:analyze",
    "performance",
    "type-check",
  ];

  requiredScripts.forEach((script) => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      checks.push(`✅ ${script} script configured`);
    } else {
      warnings.push(`⚠️  ${script} script not configured`);
    }
  });

  // Check for Turbopack usage
  if (
    packageJson.scripts.dev &&
    packageJson.scripts.dev.includes("--turbopack")
  ) {
    checks.push("✅ Turbopack enabled for development");
  } else {
    warnings.push("⚠️  Turbopack not enabled for development");
  }
} else {
  errors.push("❌ package.json not found");
}

// 7. Check TypeScript configuration
console.log("📝 Checking TypeScript configuration...");
const tsconfigPath = path.join(process.cwd(), "tsconfig.json");

if (fs.existsSync(tsconfigPath)) {
  try {
    // Remove comments from JSON before parsing (simple approach for JSONC)
    const tsconfigContent = fs
      .readFileSync(tsconfigPath, "utf8")
      .split("\n")
      .map((line) => {
        // Remove line comments but preserve strings
        const commentIndex = line.indexOf("//");
        if (commentIndex !== -1) {
          // Simple check: if // is not inside quotes, remove it
          const beforeComment = line.substring(0, commentIndex);
          const quoteCount = (beforeComment.match(/"/g) || []).length;
          if (quoteCount % 2 === 0) {
            return beforeComment.trim();
          }
        }
        return line;
      })
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
      .replace(/,(\s*[}\]])/g, "$1"); // Remove trailing commas

    const tsconfig = JSON.parse(tsconfigContent);

    if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
      checks.push("✅ Strict TypeScript mode enabled");
    } else {
      warnings.push("⚠️  Strict TypeScript mode not enabled");
    }

    // Check for additional strict options
    const strictOptions = [
      "noImplicitAny",
      "noImplicitReturns",
      "noUnusedLocals",
      "noUnusedParameters",
    ];

    let strictCount = 0;
    strictOptions.forEach((option) => {
      if (tsconfig.compilerOptions && tsconfig.compilerOptions[option]) {
        strictCount++;
      }
    });

    if (strictCount >= 3) {
      checks.push("✅ Additional strict TypeScript options enabled");
    } else {
      warnings.push("⚠️  Consider enabling more strict TypeScript options");
    }
  } catch (error) {
    warnings.push("⚠️  Could not parse tsconfig.json");
  }
} else {
  warnings.push("⚠️  tsconfig.json not found");
}

// Generate report
console.log("\n📋 Performance Configuration Report");
console.log("=".repeat(50));

console.log("\n✅ Configured Features:");
checks.forEach((check) => console.log(`   ${check}`));

if (warnings.length > 0) {
  console.log("\n⚠️  Warnings:");
  warnings.forEach((warning) => console.log(`   ${warning}`));
}

if (errors.length > 0) {
  console.log("\n❌ Errors:");
  errors.forEach((error) => console.log(`   ${error}`));
}

// Performance score
const totalChecks = checks.length + warnings.length + errors.length;
const score = Math.round((checks.length / totalChecks) * 100);

console.log(`\n🎯 Performance Configuration Score: ${score}%`);

if (score >= 90) {
  console.log(
    "🎉 Excellent! Your performance configuration is well optimized.",
  );
} else if (score >= 75) {
  console.log(
    "👍 Good! Consider addressing the warnings for better performance.",
  );
} else if (score >= 60) {
  console.log("⚠️  Fair. Several optimizations are missing.");
} else {
  console.log("❌ Poor. Significant performance optimizations are needed.");
}

// Recommendations
console.log("\n💡 Next Steps:");
console.log("   1. Run `npm run build:analyze` to analyze bundle size");
console.log("   2. Set up performance monitoring in production");
console.log("   3. Configure CDN for optimal asset delivery");
console.log("   4. Run Lighthouse audits on key pages");
console.log("   5. Set up performance budgets in CI/CD");

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);
