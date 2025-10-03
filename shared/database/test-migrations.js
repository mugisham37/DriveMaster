#!/usr/bin/env node

/**
 * Test script to verify database migrations work correctly
 * This script tests the complete migration workflow
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🧪 Testing Database Migration System");
console.log("=====================================\n");

// Test configuration
const testSteps = [
  {
    name: "Build TypeScript",
    command: "npm run build",
    description: "Compile TypeScript to JavaScript",
  },
  {
    name: "Test Database Connection",
    command: "npm run test-connection",
    description: "Verify database connectivity",
  },
  {
    name: "Run Migrations",
    command: "npm run migrate",
    description: "Execute all migration files",
  },
  {
    name: "Validate Schema",
    command: "npm run validate-schema",
    description: "Validate database schema integrity",
  },
  {
    name: "Check Migration Status",
    command: "npx tsx src/cli.ts migration status",
    description: "Display migration status",
  },
  {
    name: "Seed Database",
    command: "npm run seed",
    description: "Populate database with test data",
  },
  {
    name: "Test Database Queries",
    command:
      'npx tsx -e "' +
      'import { createAppConnection, schema } from "./src/index"; ' +
      "const db = createAppConnection().getDb(); " +
      "db.select().from(schema.users).limit(5).then(users => { " +
      "  console.log(`Found ${users.length} users`); " +
      "  process.exit(0); " +
      "}).catch(err => { " +
      '  console.error("Query failed:", err); ' +
      "  process.exit(1); " +
      "});" +
      '"',
    description: "Test basic database queries",
  },
];

let passedTests = 0;
let failedTests = 0;

// Run each test step
for (const step of testSteps) {
  console.log(`📋 ${step.name}`);
  console.log(`   ${step.description}`);

  try {
    const output = execSync(step.command, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: "pipe",
    });

    console.log("   ✅ PASSED");
    if (output.trim()) {
      console.log(`   Output: ${output.trim().split("\n")[0]}...`);
    }
    passedTests++;
  } catch (error) {
    console.log("   ❌ FAILED");
    console.log(`   Error: ${error.message}`);
    if (error.stdout) {
      console.log(`   Stdout: ${error.stdout.toString().trim()}`);
    }
    if (error.stderr) {
      console.log(`   Stderr: ${error.stderr.toString().trim()}`);
    }
    failedTests++;
  }

  console.log("");
}

// Summary
console.log("📊 Test Summary");
console.log("===============");
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(
  `📈 Success Rate: ${Math.round(
    (passedTests / (passedTests + failedTests)) * 100
  )}%`
);

if (failedTests === 0) {
  console.log("\n🎉 All tests passed! Migration system is working correctly.");
  process.exit(0);
} else {
  console.log("\n⚠️  Some tests failed. Please check the errors above.");
  process.exit(1);
}
