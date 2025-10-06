import axios from 'axios';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';

describe('Performance and Load Testing', () => {
    const BASE_URLS = {
        auth: 'http://localhost:3001',
        user: 'http://localhost:3002',
        scheduler: 'http://localhost:3003',
        content: 'http://localhost:3004',
        events: 'http://localhost:3005',
        ml: 'http://localhost:3007'
    };

    describe('API Response Time Tests', () => {
        it('should meet SLA requirements for critical endpoints', async () => {
            const authToken = 'mock-jwt-token';
            const testUserId = uuidv4();

            const criticalEndpoints = [
                {
                    name: 'Next Item Selection',
                    method: 'POST',
                    url: `${BASE_URLS.scheduler}/scheduler/next-items`,
                    data: { userId: testUserId, count: 5, sessionType: 'practice' },
                    slaMs: 300 // 300ms SLA requirement
                },
                {
                    name: 'Attempt Recording',
                    method: 'POST',
                    url: `${BASE_URLS.scheduler}/scheduler/attempt`,
                    data: {
                        userId: testUserId,
                        itemId: 'test-item-1',
                        sessionId: uuidv4(),
                        clientAttemptId: uuidv4(),
                        selected: { answer: 'a' },
                        quality: 4,
                        timeTakenMs: 20000
                    },
                    slaMs: 200 // 200ms SLA requirement
                },
                {
                    name: 'User Profile Retrieval',
                    method: 'GET',
                    url: `${BASE_URLS.user}/users/${testUserId}/profile`,
                    data: null,
                    slaMs: 150 // 150ms SLA requirement
                },
                {
                    name: 'Content Search',
                    method: 'GET',
                    url: `${BASE_URLS.content}/content/search?q=traffic&jurisdiction=US-CA`,
                    data: null,
                    slaMs: 500 // 500ms SLA requirement
                }
            ];

            for (const endpoint of criticalEndpoints) {
                const responseTimes: number[] = [];

                // Warm up (3 requests)
                for (let i = 0; i < 3; i++) {
                    try {
                        if (endpoint.method === 'GET') {
                            await axios.get(endpoint.url, {
                                headers: { Authorization: `Bearer ${authToken}` },
                                timeout: 5000
                            });
                        } else {
                            await axios.post(endpoint.url, endpoint.data, {
                                headers: { Authorization: `Bearer ${authToken}` },
                                timeout: 5000
                            });
                        }
                    } catch (error) {
                        // Ignore warm-up errors
                    }
                }

                // Measure performance (10 requests)
                for (let i = 0; i < 10; i++) {
                    const startTime = performance.now();

                    try {
                        if (endpoint.method === 'GET') {
                            await axios.get(endpoint.url, {
                                headers: { Authorization: `Bearer ${authToken}` },
                                timeout: 5000
                            });
                        } else {
                            await axios.post(endpoint.url, endpoint.data, {
                                headers: { Authorization: `Bearer ${authToken}` },
                                timeout: 5000
                            });
                        }

                        const endTime = performance.now();
                        responseTimes.push(endTime - startTime);
                    } catch (error) {
                        console.warn(`Request failed for ${endpoint.name}:`, error);
                        // Record as timeout for SLA calculation
                        responseTimes.push(5000);
                    }
                }

                // Calculate metrics
                const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
                const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

                console.log(`${endpoint.name} Performance:
          - Average: ${avgResponseTime.toFixed(2)}ms
          - P95: ${p95ResponseTime.toFixed(2)}ms
          - P99: ${p99ResponseTime.toFixed(2)}ms
          - SLA: ${endpoint.slaMs}ms
        `);

                // SLA assertions
                expect(p95ResponseTime).toBeLessThan(endpoint.slaMs);
                expect(avgResponseTime).toBeLessThan(endpoint.slaMs * 0.7); // Average should be well under SLA
            }
        }, 60000);

        it('should handle burst traffic patterns', async () => {
            const authToken = 'mock-jwt-token';
            const burstSize = 100;
            const burstDuration = 5000; // 5 seconds

            const startTime = performance.now();
            const promises: Promise<any>[] = [];

            // Create burst of concurrent requests
            for (let i = 0; i < burstSize; i++) {
                const promise = axios.post(
                    `${BASE_URLS.scheduler}/scheduler/next-items`,
                    {
                        userId: uuidv4(),
                        count: 5,
                        sessionType: 'practice'
                    },
                    {
                        headers: { Authorization: `Bearer ${authToken}` },
                        timeout: 10000
                    }
                ).then(response => ({
                    success: true,
                    responseTime: performance.now() - startTime,
                    status: response.status
                })).catch(error => ({
                    success: false,
                    responseTime: performance.now() - startTime,
                    error: error.message
                }));

                promises.push(promise);
            }

            const results = await Promise.all(promises);
            const endTime = performance.now();

            // Analyze burst results
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            const successRate = successful / (successful + failed);
            const avgResponseTime = results
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.responseTime, 0) / successful;

            console.log(`Burst Traffic Results:
        - Total requests: ${burstSize}
        - Successful: ${successful}
        - Failed: ${failed}
        - Success rate: ${(successRate * 100).toFixed(2)}%
        - Average response time: ${avgResponseTime.toFixed(2)}ms
        - Total duration: ${(endTime - startTime).toFixed(2)}ms
      `);

            // Burst traffic assertions
            expect(successRate).toBeGreaterThan(0.9); // 90% success rate
            expect(avgResponseTime).toBeLessThan(2000); // Under 2 seconds average
        }, 30000);
    });

    describe('Throughput Testing', () => {
        it('should maintain throughput under sustained load', async () => {
            const authToken = 'mock-jwt-token';
            const testDuration = 30000; // 30 seconds
            const targetRPS = 50; // 50 requests per second
            const requestInterval = 1000 / targetRPS; // 20ms between requests

            const startTime = performance.now();
            const results: any[] = [];
            let requestCount = 0;

            while (performance.now() - startTime < testDuration) {
                const requestStart = performance.now();
                requestCount++;

                try {
                    const response = await axios.post(
                        `${BASE_URLS.scheduler}/scheduler/next-items`,
                        {
                            userId: uuidv4(),
                            count: 3,
                            sessionType: 'practice'
                        },
                        {
                            headers: { Authorization: `Bearer ${authToken}` },
                            timeout: 5000
                        }
                    );

                    results.push({
                        success: true,
                        responseTime: performance.now() - requestStart,
                        status: response.status,
                        timestamp: performance.now() - startTime
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        responseTime: performance.now() - requestStart,
                        error: error,
                        timestamp: performance.now() - startTime
                    });
                }

                // Maintain request rate
                const elapsed = performance.now() - requestStart;
                const delay = Math.max(0, requestInterval - elapsed);
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            const totalDuration = performance.now() - startTime;
            const actualRPS = (results.length / totalDuration) * 1000;
            const successfulRequests = results.filter(r => r.success).length;
            const successRate = successfulRequests / results.length;

            const responseTimes = results
                .filter(r => r.success)
                .map(r => r.responseTime);

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

            console.log(`Sustained Load Results:
        - Target RPS: ${targetRPS}
        - Actual RPS: ${actualRPS.toFixed(2)}
        - Total requests: ${results.length}
        - Successful requests: ${successfulRequests}
        - Success rate: ${(successRate * 100).toFixed(2)}%
        - Average response time: ${avgResponseTime.toFixed(2)}ms
        - P95 response time: ${p95ResponseTime.toFixed(2)}ms
        - Test duration: ${(totalDuration / 1000).toFixed(2)}s
      `);

            // Throughput assertions
            expect(actualRPS).toBeGreaterThan(targetRPS * 0.8); // Within 20% of target
            expect(successRate).toBeGreaterThan(0.95); // 95% success rate
            expect(p95ResponseTime).toBeLessThan(1000); // P95 under 1 second
        }, 45000);
    });

    describe('Memory and Resource Usage', () => {
        it('should not have memory leaks during extended operation', async () => {
            const authToken = 'mock-jwt-token';
            const iterations = 1000;
            const memoryCheckInterval = 100;

            const memoryUsage: number[] = [];

            for (let i = 0; i < iterations; i++) {
                // Perform typical operations
                await axios.post(
                    `${BASE_URLS.scheduler}/scheduler/next-items`,
                    {
                        userId: uuidv4(),
                        count: 5,
                        sessionType: 'practice'
                    },
                    {
                        headers: { Authorization: `Bearer ${authToken}` },
                        timeout: 5000
                    }
                );

                await axios.post(
                    `${BASE_URLS.scheduler}/scheduler/attempt`,
                    {
                        userId: uuidv4(),
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

                // Check memory usage periodically
                if (i % memoryCheckInterval === 0) {
                    const memUsage = process.memoryUsage();
                    memoryUsage.push(memUsage.heapUsed);

                    if (memoryUsage.length > 1) {
                        const memoryGrowth = memUsage.heapUsed - memoryUsage[0];
                        const growthRate = memoryGrowth / (i + 1);

                        console.log(`Memory check at iteration ${i}:
              - Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
              - Growth from start: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB
              - Growth rate per iteration: ${(growthRate / 1024).toFixed(2)} KB
            `);
                    }
                }

                // Small delay to prevent overwhelming
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            // Analyze memory usage trend
            if (memoryUsage.length >= 3) {
                const initialMemory = memoryUsage[0];
                const finalMemory = memoryUsage[memoryUsage.length - 1];
                const memoryGrowth = finalMemory - initialMemory;
                const growthPercentage = (memoryGrowth / initialMemory) * 100;

                console.log(`Memory Analysis:
          - Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB
          - Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
          - Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB
          - Growth percentage: ${growthPercentage.toFixed(2)}%
        `);

                // Memory leak assertion - growth should be reasonable
                expect(growthPercentage).toBeLessThan(50); // Less than 50% growth
            }
        }, 120000); // 2 minute timeout
    });

    describe('Database Performance', () => {
        it('should handle concurrent database operations efficiently', async () => {
            const authToken = 'mock-jwt-token';
            const concurrentOperations = 50;
            const operationsPerConnection = 10;

            const promises: Promise<any>[] = [];

            for (let i = 0; i < concurrentOperations; i++) {
                const userId = uuidv4();

                // Create a series of database operations for each user
                const operationPromise = (async () => {
                    const operationTimes: number[] = [];

                    for (let j = 0; j < operationsPerConnection; j++) {
                        const startTime = performance.now();

                        try {
                            // Simulate typical database operations
                            await axios.post(
                                `${BASE_URLS.scheduler}/scheduler/attempt`,
                                {
                                    userId: userId,
                                    itemId: `item-${j}`,
                                    sessionId: uuidv4(),
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

                            const endTime = performance.now();
                            operationTimes.push(endTime - startTime);
                        } catch (error) {
                            operationTimes.push(10000); // Record as timeout
                        }
                    }

                    return {
                        userId,
                        operationTimes,
                        avgTime: operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length
                    };
                })();

                promises.push(operationPromise);
            }

            const results = await Promise.all(promises);

            // Analyze database performance
            const allOperationTimes = results.flatMap(r => r.operationTimes);
            const avgOperationTime = allOperationTimes.reduce((a, b) => a + b, 0) / allOperationTimes.length;
            const p95OperationTime = allOperationTimes.sort((a, b) => a - b)[Math.floor(allOperationTimes.length * 0.95)];
            const slowOperations = allOperationTimes.filter(t => t > 1000).length;
            const slowOperationRate = slowOperations / allOperationTimes.length;

            console.log(`Database Performance Results:
        - Total operations: ${allOperationTimes.length}
        - Concurrent connections: ${concurrentOperations}
        - Average operation time: ${avgOperationTime.toFixed(2)}ms
        - P95 operation time: ${p95OperationTime.toFixed(2)}ms
        - Slow operations (>1s): ${slowOperations}
        - Slow operation rate: ${(slowOperationRate * 100).toFixed(2)}%
      `);

            // Database performance assertions
            expect(avgOperationTime).toBeLessThan(500); // Average under 500ms
            expect(p95OperationTime).toBeLessThan(2000); // P95 under 2 seconds
            expect(slowOperationRate).toBeLessThan(0.1); // Less than 10% slow operations
        }, 180000); // 3 minute timeout
    });
});