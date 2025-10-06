module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/fixtures/**",
    "!src/utils/test-helpers.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/src/setup/jest.setup.ts"],
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 4,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  globalSetup: "<rootDir>/src/setup/global-setup.ts",
  globalTeardown: "<rootDir>/src/setup/global-teardown.ts",
};
