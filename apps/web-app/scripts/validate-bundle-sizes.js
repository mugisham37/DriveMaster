/**
 * Bundle Size Validation Script
 * 
 * Validates that bundle sizes meet performance targets.
 * Run after build to ensure bundles are within acceptable limits.
 * 
 * Usage: node scripts/validate-bundle-sizes.js
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Bundle size targets (in KB, gzipped)
const TARGETS = {
  initial: 200,
  route: 100,
  vendor: 150,
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Get gzipped size of a file
 */
function getGzipSize(filePath) {
  const content = fs.readFileSync(filePath);
  const gzipped = gzipSync(content);
  return gzipped.length / 1024; // Return size in KB
}

/**
 * Get all JS files from .next directory
 */
function getJSFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Categorize bundle by name
 */
function categorizeBundle(filename) {
  if (filename.includes('webpack-runtime') || filename.includes('main-app')) {
    return { category: 'initial', target: TARGETS.initial };
  } else if (filename.includes('vendor') || filename.includes('node_modules')) {
    return { category: 'vendor', target: TARGETS.vendor };
  } else {
    return { category: 'route', target: TARGETS.route };
  }
}

/**
 * Format size for display
 */
function formatSize(sizeKB) {
  return `${sizeKB.toFixed(2)}KB`;
}

/**
 * Main validation function
 */
function validateBundleSizes() {
  console.log(`\n${colors.cyan}📦 Bundle Size Validation${colors.reset}\n`);
  console.log('─'.repeat(100));
  console.log(
    'File'.padEnd(60) +
    'Size'.padEnd(12) +
    'Gzip'.padEnd(12) +
    'Target'.padEnd(12) +
    'Status'
  );
  console.log('─'.repeat(100));
  
  const buildDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(buildDir, 'static', 'chunks');
  
  if (!fs.existsSync(staticDir)) {
    console.error(`${colors.red}Error: Build directory not found. Run 'npm run build' first.${colors.reset}`);
    process.exit(1);
  }
  
  const jsFiles = getJSFiles(staticDir);
  const reports = [];
  let totalSize = 0;
  let totalGzipSize = 0;
  
  for (const file of jsFiles) {
    const stat = fs.statSync(file);
    const size = stat.size / 1024; // KB
    const gzipSize = getGzipSize(file);
    const relativePath = path.relative(staticDir, file);
    const { category, target } = categorizeBundle(relativePath);
    const exceedsTarget = gzipSize > target;
    
    totalSize += size;
    totalGzipSize += gzipSize;
    
    reports.push({
      file: relativePath,
      size,
      gzipSize,
      target,
      category,
      exceedsTarget,
    });
  }
  
  // Sort by gzip size (largest first)
  reports.sort((a, b) => b.gzipSize - a.gzipSize);
  
  // Display results
  for (const report of reports) {
    const status = report.exceedsTarget ? '❌ EXCEEDS' : '✅ OK';
    const statusColor = report.exceedsTarget ? colors.red : colors.green;
    
    // Truncate filename if too long
    const displayName = report.file.length > 58 
      ? '...' + report.file.slice(-55) 
      : report.file;
    
    console.log(
      displayName.padEnd(60) +
      formatSize(report.size).padEnd(12) +
      formatSize(report.gzipSize).padEnd(12) +
      `${report.target}KB`.padEnd(12) +
      `${statusColor}${status}${colors.reset}`
    );
  }
  
  console.log('─'.repeat(100));
  
  // Summary
  const exceeding = reports.filter(r => r.exceedsTarget);
  const totalFiles = reports.length;
  
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  Total size: ${formatSize(totalSize)} (uncompressed)`);
  console.log(`  Total gzip size: ${formatSize(totalGzipSize)}`);
  console.log(`  Average gzip size: ${formatSize(totalGzipSize / totalFiles)}`);
  
  if (exceeding.length > 0) {
    console.log(`\n${colors.yellow}⚠️  ${exceeding.length} bundle(s) exceed target size:${colors.reset}`);
    for (const report of exceeding) {
      console.log(`  - ${report.file}: ${formatSize(report.gzipSize)} > ${report.target}KB`);
    }
    console.log(`\n${colors.yellow}Consider:${colors.reset}`);
    console.log('  1. Adding more dynamic imports for heavy components');
    console.log('  2. Splitting large vendor chunks');
    console.log('  3. Removing unused dependencies');
    console.log('  4. Using lighter alternatives for heavy libraries');
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All bundles within target sizes!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run validation
try {
  validateBundleSizes();
} catch (error) {
  console.error(`${colors.red}Error during validation:${colors.reset}`, error);
  process.exit(1);
}
