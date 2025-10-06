import { TestEnvironment } from '../utils/test-environment';

// Extend Jest matchers
expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});

// Global test configuration
beforeAll(async () => {
    // Set test timeouts
    jest.setTimeout(60000);
});

beforeEach(async () => {
    // Clean up test data before each test
    await TestEnvironment.cleanupTestData();
});

afterEach(async () => {
    // Clean up any test artifacts
    await TestEnvironment.cleanupTestArtifacts();
});

// Declare custom matchers for TypeScript
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
        }
    }
}