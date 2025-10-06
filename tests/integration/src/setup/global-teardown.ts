import { execSync } from 'child_process';

export default async function globalTeardown() {
    console.log('🧹 Starting global test teardown...');

    try {
        // Stop and remove test containers
        console.log('🛑 Stopping Docker containers...');
        execSync('docker-compose -f docker-compose.test.yml down -v', {
            stdio: 'inherit',
            cwd: __dirname + '/../..'
        });

        console.log('✅ Global teardown completed successfully');
    } catch (error) {
        console.error('❌ Global teardown failed:', error);
        // Don't throw error in teardown to avoid masking test failures
    }
}