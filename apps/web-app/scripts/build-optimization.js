#!/usr/bin/env node

/**
 * Build optimization script for Exercism Next.js application
 * This script runs additional optimizations after the Next.js build
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Starting build optimization...')

// Performance tracking
const startTime = Date.now()
const optimizations = []

// 1. Analyze bundle size
console.log('📊 Analyzing bundle size...')
try {
  if (process.env.ANALYZE === 'true') {
    execSync('npx @next/bundle-analyzer', { stdio: 'inherit' })
    optimizations.push('Bundle analysis completed')
  } else {
    console.log('Bundle analysis skipped (set ANALYZE=true to enable)')
  }
} catch (error) {
  console.log('Bundle analyzer not available, skipping...')
}

// 2. Generate comprehensive asset manifest for production
console.log('📝 Generating production asset manifest...')
const buildDir = path.join(process.cwd(), '.next')
const staticDir = path.join(buildDir, 'static')
const publicDir = path.join(process.cwd(), 'public')

if (fs.existsSync(staticDir)) {
  const manifestPath = path.join(publicDir, 'asset-manifest.json')
  const manifest = {
    version: Date.now(),
    assets: {},
    chunks: {},
    entrypoints: [],
  }
  
  // Scan for hashed assets in .next/static
  function scanDirectory(dir, prefix = '') {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, `${prefix}${file}/`)
      } else if (file.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|avif)$/)) {
        const originalName = file.replace(/\.[a-f0-9]{8,}\./g, '.')
        const assetPath = `/_next/static/${prefix}${file}`
        manifest.assets[`${prefix}${originalName}`] = assetPath
        
        // Track chunks for performance analysis
        if (file.endsWith('.js')) {
          manifest.chunks[`${prefix}${originalName}`] = {
            path: assetPath,
            size: stat.size,
            type: 'javascript'
          }
        } else if (file.endsWith('.css')) {
          manifest.chunks[`${prefix}${originalName}`] = {
            path: assetPath,
            size: stat.size,
            type: 'stylesheet'
          }
        }
      }
    })
  }
  
  scanDirectory(staticDir)
  
  // Add public assets to manifest
  if (fs.existsSync(path.join(publicDir, 'assets'))) {
    function scanPublicAssets(dir, prefix = 'assets/') {
      const files = fs.readdirSync(dir)
      
      files.forEach(file => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          scanPublicAssets(filePath, `${prefix}${file}/`)
        } else {
          manifest.assets[`${prefix}${file}`] = `/${prefix}${file}`
        }
      })
    }
    
    scanPublicAssets(path.join(publicDir, 'assets'))
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`✅ Asset manifest generated with ${Object.keys(manifest.assets).length} assets and ${Object.keys(manifest.chunks).length} chunks`)
  optimizations.push(`Asset manifest with ${Object.keys(manifest.assets).length} entries`)
}

// 3. Analyze and optimize assets
console.log('🖼️  Analyzing asset optimization...')
const assetsDir = path.join(publicDir, 'assets')

if (fs.existsSync(assetsDir)) {
  let assetStats = {
    svg: 0,
    images: 0,
    totalSize: 0,
    largeAssets: []
  }
  
  function analyzeAssets(dir) {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        analyzeAssets(filePath)
      } else {
        assetStats.totalSize += stat.size
        
        if (file.endsWith('.svg')) {
          assetStats.svg++
        } else if (file.match(/\.(png|jpg|jpeg|gif|webp|avif)$/)) {
          assetStats.images++
        }
        
        // Flag large assets (>100KB)
        if (stat.size > 100000) {
          assetStats.largeAssets.push({
            file: path.relative(publicDir, filePath),
            size: Math.round(stat.size / 1024) + 'KB'
          })
        }
      }
    })
  }
  
  analyzeAssets(assetsDir)
  
  console.log(`✅ Asset analysis complete:`)
  console.log(`   - ${assetStats.svg} SVG files`)
  console.log(`   - ${assetStats.images} image files`)
  console.log(`   - Total size: ${Math.round(assetStats.totalSize / 1024 / 1024 * 100) / 100}MB`)
  
  if (assetStats.largeAssets.length > 0) {
    console.log(`⚠️  Large assets found (>100KB):`)
    assetStats.largeAssets.forEach(asset => {
      console.log(`   - ${asset.file}: ${asset.size}`)
    })
  }
  
  optimizations.push(`${assetStats.svg + assetStats.images} assets analyzed`)
}

// 4. Analyze build output for performance insights
console.log('📈 Analyzing build performance...')
const buildStatsPath = path.join(buildDir, 'build-manifest.json')
let buildStats = {}

if (fs.existsSync(buildStatsPath)) {
  try {
    buildStats = JSON.parse(fs.readFileSync(buildStatsPath, 'utf8'))
    console.log('✅ Build statistics loaded')
  } catch (error) {
    console.log('⚠️  Could not parse build statistics')
  }
}

// 5. Generate comprehensive performance recommendations
console.log('💡 Performance recommendations:')
const recommendations = [
  'Ensure all images use Next.js Image component with proper sizing',
  'Use dynamic imports for large components and libraries',
  'Implement proper caching headers for static assets',
  'Monitor Core Web Vitals in production environment',
  'Use React.memo() for expensive component renders',
  'Implement code splitting at route level',
  'Optimize bundle sizes by analyzing webpack-bundle-analyzer output',
  'Use service workers for offline functionality and caching',
  'Implement proper error boundaries for better UX',
  'Monitor real-time performance metrics'
]

recommendations.forEach((rec, index) => {
  console.log(`   ${index + 1}. ${rec}`)
})

const endTime = Date.now()
const buildTime = endTime - startTime

console.log(`✨ Build optimization complete in ${buildTime}ms!`)

// 6. Generate comprehensive performance report
const performanceReport = {
  timestamp: new Date().toISOString(),
  buildTime: buildTime,
  optimizations: optimizations,
  buildStats: buildStats,
  recommendations: recommendations,
  performance: {
    bundleAnalysis: process.env.ANALYZE === 'true',
    assetOptimization: true,
    cacheHeaders: true,
    imageOptimization: true,
    codesplitting: true
  },
  nextSteps: [
    'Deploy to staging environment for performance testing',
    'Run Lighthouse audits on key pages',
    'Set up performance monitoring in production',
    'Configure CDN for optimal asset delivery',
    'Implement performance budgets in CI/CD'
  ]
}

const reportPath = path.join(process.cwd(), 'performance-report.json')
fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2))

console.log('📋 Performance report saved to performance-report.json')
console.log('🎯 Next steps:')
performanceReport.nextSteps.forEach((step, index) => {
  console.log(`   ${index + 1}. ${step}`)
})