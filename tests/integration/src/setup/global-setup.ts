import { execSync } from 'child_process';
import { TestEnvironment } from '../utils/test-environment';

export default async function globalSetup() {
    console.log('🚀 Starting global test setup...');

    try {
        // Start test environment
        console.log('📦 Starting Docker containers...');
        execSync('docker-compose -f docker-compose.test.yml up -d', {
            stdio: 'inherit',
            cwd: __dirname + '/../..'
        });

        // Wait for services to be healthy
        console.log('⏳ Waiting for services to be ready...');
        await TestEnvironment.waitForServices();

        // Initialize test data
        console.log('🌱 Seeding test data...');
        await TestEnvironment.seedTestData();

        console.log('✅ Global setup completed successfully');
    } catch (error) {
        console.error('❌ Global setup failed:', error);
        throw error;
    }
}