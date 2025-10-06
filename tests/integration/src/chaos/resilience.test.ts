import axios from 'axios';
import { TestEnvironment } from '../utils/test-environment';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

describe('Chaos Engineering and Resilience Tests', () => {
    let testUserId: string;
    let authToken: string;

    beforeAll(async () => {
        testUserId = uuidv4();
        authToken = 'mock-jwt-token';
    });

    describe('Service Failure Scenarios', () => {
        it('should handle auth service failure gracefully', async () => {
            // Step 1: Verify normal operation
            const normalResponse = await axios.get(
                `http://localhost:3002/users/${testUserId}/profile`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 5000
                }
            );

            expect(normalResponse.status).toBeLessThan(400);

            // Step 2: Simulate auth service failure
            try {
                execSync('docker-compose -f docker-compose.test.yml stop auth-service', {
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                console.log('Auth service stop command failed (expected in test environment)');
            }

            // Step 3: Test circuit breaker behavior
            let circuitBreakerTriggered = false;

            for (let i = 0; i < 10; i++) {
                try {
                    await axios.get(
                        `http://localhost:3002/users/${testUserId}/profile`,
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 2000
                        }
                    );
                } catch (error: any) {
                    if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
                        circuitBreakerTriggered = true;
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            expect(circuitBreakerTriggered).toBe(true);

            // Step 4: Restart service and verify recovery
            try {
                execSync('docker-compose -f docker-compose.test.yml start auth-service', {
                    stdio: 'pipe',
                    timeout: 30000
                });
            } catch (error) {
                console.log('Auth service restart command failed (expected in test environment)');
            }

            // Wait for service recovery
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Verify service recovery
            let serviceRecovered = false;
            for (let i = 0; i < 20; i++) {
                try {
                    const recoveryResponse = await axios.get(
                        `http://localhost:3002/users/${testUserId}/profile`,
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 5000
                        }
                    );

                    if (recoveryResponse.status < 400) {
                        serviceRecovered = true;
                        break;
                    }
                } catch (error) {
                    // Service still recovering
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            expect(serviceRecovered).toBe(true);
        }, 120000); // 2 minute timeout

        it('should handle database connection failures', async () => {
            // Step 1: Verify normal database operations
            const db = await TestEnvironment.getDbClient();
            const normalQuery = await db.query('SELECT 1 as test');
            expect(normalQuery.rows[0].test).toBe(1);

            // Step 2: Simulate database connection issues
            try {
                execSync('docker-compose -f docker-compose.test.yml pause postgres-test', {
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                console.log('Database pause command failed (expected in test environment)');
            }

            // Step 3: Test service behavior with database unavailable
            let databaseErrorDetected = false;

            for (let i = 0; i < 5; i++) {
                try {
                    await axios.post(
                        'http://localhost:3003/scheduler/attempt',
                        {
                            userId: testUserId,
                            itemId: 'test-item-1',
                            sessionId: uuidv4(),
                            clientAttemptId: uuidv4(),
                            selected: { answer: 'a' },
                            quality: 4,
                            timeTakenMs: 20000
                        },
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 5000
                        }
                    );
                } catch (error: any) {
                    if (error.response?.status >= 500 || error.code === 'ECONNREFUSED') {
                        databaseErrorDetected = true;
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            expect(databaseErrorDetected).toBe(true);

            // Step 4: Resume database and verify recovery
            try {
                execSync('docker-compose -f docker-compose.test.yml unpause postgres-test', {
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                console.log('Database unpause command failed (expected in test environment)');
            }

            // Wait for database recovery
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify database operations resume
            let databaseRecovered = false;
            for (let i = 0; i < 10; i++) {
                try {
                    const recoveryQuery = await db.query('SELECT 1 as test');
                    if (recoveryQuery.rows[0].test === 1) {
                        databaseRecovered = true;
                        break;
                    }
                } catch (error) {
                    // Database still recovering
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            expect(databaseRecovered).toBe(true);
        }, 90000); // 1.5 minute timeout

        it('should handle Redis cache failures gracefully', async () => {
            // Step 1: Verify cache is working
            const redis = await TestEnvironment.getRedisClient();
            await redis.set('test-key', 'test-value');
            const cachedValue = await redis.get('test-key');
            expect(cachedValue).toBe('test-value');

            // Step 2: Simulate Redis failure
            try {
                execSync('docker-compose -f docker-compose.test.yml stop redis-test', {
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                console.log('Redis stop command failed (expected in test environment)');
            }

            // Step 3: Test service behavior without cache
            // Services should fall back to database
            const fallbackResponse = await axios.get(
                `http://localhost:3003/scheduler/state/${testUserId}`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 10000 // Longer timeout as it hits database
                }
            );

            expect(fallbackResponse.status).toBe(200);
            // Response should still work but be slower

            // Step 4: Restart Redis and verify cache recovery
            try {
                execSync('docker-compose -f docker-compose.test.yml start redis-test', {
                    stdio: 'pipe',
                    timeout: 30000
                });
            } catch (error) {
                console.log('Redis restart command failed (expected in test environment)');
            }

            // Wait for Redis recovery
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify cache is working again
            let cacheRecovered = false;
            for (let i = 0; i < 10; i++) {
                try {
                    const newRedis = await TestEnvironment.getRedisClient();
                    await newRedis.set('recovery-test', 'success');
                    const recoveryValue = await newRedis.get('recovery-test');
                    if (recoveryValue === 'success') {
                        cacheRecovered = true;
                        break;
                    }
                } catch (error) {
                    // Cache still recovering
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            expect(cacheRecovered).toBe(true);
        }, 90000);
    });

    describe('Network Partition Scenarios', () => {
        it('should handle Kafka broker failures', async () => {
            const kafka = await TestEnvironment.getKafkaClient();

            // Step 1: Verify normal Kafka operations
            const producer = kafka.producer();
            await producer.connect();

            await producer.send({
                topic: 'user.attempts',
                messages: [{
                    key: testUserId,
                    value: JSON.stringify({
                        userId: testUserId,
                        itemId: 'test-item',
                        timestamp: Date.now()
                    })
                }]
            });

            await producer.disconnect();

            // Step 2: Simulate Kafka failure
            try {
                execSync('docker-compose -f docker-compose.test.yml stop kafka-test', {
                    stdio: 'pipe',
                    timeout: 10000
                });
            } catch (error) {
                console.log('Kafka stop command failed (expected in test environment)');
            }

            // Step 3: Test event service behavior
            let kafkaErrorDetected = false;

            for (let i = 0; i < 3; i++) {
                try {
                    await axios.post(
                        'http://localhost:3005/events/attempt',
                        {
                            userId: testUserId,
                            itemId: 'test-item',
                            sessionId: uuidv4(),
                            correct: true,
                            timestamp: Date.now()
                        },
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 5000
                        }
                    );
                } catch (error: any) {
                    if (error.response?.status >= 500) {
                        kafkaErrorDetected = true;
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Events should be queued or service should return error
            expect(kafkaErrorDetected).toBe(true);

            // Step 4: Restart Kafka and verify recovery
            try {
                execSync('docker-compose -f docker-compose.test.yml start zookeeper-test kafka-test', {
                    stdio: 'pipe',
                    timeout: 60000
                });
            } catch (error) {
                console.log('Kafka restart command failed (expected in test environment)');
            }

            // Wait for Kafka recovery
            await new Promise(resolve => setTimeout(resolve, 30000));

            // Verify Kafka operations resume
            let kafkaRecovered = false;
            for (let i = 0; i < 10; i++) {
                try {
                    const recoveryProducer = kafka.producer();
                    await recoveryProducer.connect();

                    await recoveryProducer.send({
                        topic: 'user.attempts',
                        messages: [{
                            key: testUserId,
                            value: JSON.stringify({
                                userId: testUserId,
                                itemId: 'recovery-test',
                                timestamp: Date.now()
                            })
                        }]
                    });

                    await recoveryProducer.disconnect();
                    kafkaRecovered = true;
                    break;
                } catch (error) {
                    // Kafka still recovering
                }

                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            expect(kafkaRecovered).toBe(true);
        }, 180000); // 3 minute timeout
    });

    describe('Load and Stress Testing', () => {
        it('should handle concurrent user sessions', async () => {
            const concurrentUsers = 50;
            const sessionsPerUser = 3;

            const promises = [];

            for (let i = 0; i < concurrentUsers; i++) {
                const userId = uuidv4();

                for (let j = 0; j < sessionsPerUser; j++) {
                    promises.push(simulateUserSession(userId));
                }
            }

            // Execute all sessions concurrently
            const results = await Promise.allSettled(promises);

            // Analyze results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            console.log(`Concurrent sessions: ${successful} successful, ${failed} failed`);

            // At least 80% should succeed under normal load
            expect(successful / (successful + failed)).toBeGreaterThan(0.8);
        }, 300000); // 5 minute timeout

        it('should maintain performance under sustained load', async () => {
            const loadDuration = 60000; // 1 minute
            const requestInterval = 100; // 100ms between requests
            const startTime = Date.now();

            const responseTimes: number[] = [];
            const errors: any[] = [];

            while (Date.now() - startTime < loadDuration) {
                const requestStart = Date.now();

                try {
                    await axios.post(
                        'http://localhost:3003/scheduler/next-items',
                        {
                            userId: testUserId,
                            count: 5,
                            sessionType: 'practice'
                        },
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 5000
                        }
                    );

                    const responseTime = Date.now() - requestStart;
                    responseTimes.push(responseTime);
                } catch (error) {
                    errors.push(error);
                }

                await new Promise(resolve => setTimeout(resolve, requestInterval));
            }

            // Analyze performance metrics
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
            const errorRate = errors.length / (responseTimes.length + errors.length);

            console.log(`Performance metrics:
        - Average response time: ${avgResponseTime}ms
        - P95 response time: ${p95ResponseTime}ms
        - Error rate: ${(errorRate * 100).toFixed(2)}%
        - Total requests: ${responseTimes.length + errors.length}
      `);

            // Performance assertions
            expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
            expect(p95ResponseTime).toBeLessThan(1000); // P95 under 1 second
            expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
        }, 120000); // 2 minute timeout
    });

    // Helper function to simulate a complete user session
    async function simulateUserSession(userId: string): Promise<void> {
        const sessionId = uuidv4();

        // Start session
        await axios.post(
            'http://localhost:3003/scheduler/session/start',
            {
                userId: userId,
                sessionType: 'practice',
                targetDuration: 300 // 5 minutes
            },
            {
                headers: { Authorization: `Bearer ${authToken}` },
                timeout: 10000
            }
        );

        // Complete 5 attempts
        for (let i = 0; i < 5; i++) {
            await axios.post(
                'http://localhost:3003/scheduler/attempt',
                {
                    userId: userId,
                    itemId: `item-${i}`,
                    sessionId: sessionId,
                    clientAttemptId: uuidv4(),
                    selected: { answer: 'a' },
                    quality: Math.floor(Math.random() * 6),
                    timeTakenMs: Math.floor(Math.random() * 30000) + 10000
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    timeout: 10000
                }
            );

            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // End session
        await axios.post(
            'http://localhost:3003/scheduler/session/end',
            { userId: userId, sessionId: sessionId },
            {
                headers: { Authorization: `Bearer ${authToken}` },
                timeout: 10000
            }
        );
    }
});