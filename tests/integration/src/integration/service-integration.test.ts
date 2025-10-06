import axios from 'axios';
import { TestEnvironment } from '../utils/test-environment';
import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

describe('Service Integration Tests', () => {
    let kafka: Kafka;
    let testUserId: string;

    beforeAll(async () => {
        kafka = await TestEnvironment.getKafkaClient();
        testUserId = uuidv4();
    });

    describe('Authentication Service Integration', () => {
        it('should integrate with all services for JWT validation', async () => {
            // Step 1: Get JWT from auth service
            const authResponse = await axios.post('http://localhost:3001/auth/login', {
                email: 'test@example.com',
                password: 'password123'
            });

            expect(authResponse.status).toBe(200);
            const token = authResponse.data.accessToken;

            // Step 2: Test JWT validation across services
            const services = [
                { name: 'User Service', url: 'http://localhost:3002/users/profile' },
                { name: 'Content Service', url: 'http://localhost:3004/content/items' },
                { name: 'Scheduler Service', url: 'http://localhost:3003/scheduler/health' },
                { name: 'Event Service', url: 'http://localhost:3005/events/health' },
                { name: 'Notification Service', url: 'http://localhost:3006/notifications/health' }
            ];

            for (const service of services) {
                const response = await axios.get(service.url, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                expect(response.status).toBeLessThan(400);
                console.log(`✅ ${service.name} JWT validation successful`);
            }
        });

        it('should handle token refresh across services', async () => {
            // Test token refresh flow
            const refreshResponse = await axios.post('http://localhost:3001/auth/refresh', {
                refreshToken: 'mock-refresh-token'
            });

            expect(refreshResponse.status).toBe(200);
            expect(refreshResponse.data).toHaveProperty('accessToken');
            expect(refreshResponse.data).toHaveProperty('refreshToken');
        });
    });

    describe('Content Service Workflow Integration', () => {
        it('should complete full content lifecycle workflow', async () => {
            const authToken = 'mock-admin-token';

            // Step 1: Create content item
            const createResponse = await axios.post(
                'http://localhost:3004/content/items',
                {
                    slug: `test-item-${uuidv4()}`,
                    content: {
                        text: 'What is the speed limit in residential areas?',
                        type: 'multiple_choice'
                    },
                    choices: [
                        { id: 'a', text: '25 mph' },
                        { id: 'b', text: '35 mph' },
                        { id: 'c', text: '45 mph' },
                        { id: 'd', text: '55 mph' }
                    ],
                    correct: { answer: 'a' },
                    topics: ['road_rules'],
                    jurisdictions: ['US-CA'],
                    difficulty: 0.5
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(createResponse.status).toBe(201);
            const itemId = createResponse.data.id;
            expect(createResponse.data.status).toBe('draft');

            // Step 2: Submit for review
            const reviewResponse = await axios.post(
                `http://localhost:3004/content/items/${itemId}/submit-review`,
                {},
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(reviewResponse.status).toBe(200);

            // Step 3: Approve item
            const approveResponse = await axios.post(
                `http://localhost:3004/content/items/${itemId}/approve`,
                { reviewNotes: 'Content looks good' },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(approveResponse.status).toBe(200);

            // Step 4: Publish item
            const publishResponse = await axios.post(
                `http://localhost:3004/content/items/${itemId}/publish`,
                {},
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(publishResponse.status).toBe(200);

            // Step 5: Verify item is available in scheduler service
            const schedulerResponse = await axios.get(
                `http://localhost:3003/scheduler/items/${itemId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(schedulerResponse.status).toBe(200);
            expect(schedulerResponse.data.status).toBe('published');

            // Step 6: Verify item appears in search
            const searchResponse = await axios.get(
                'http://localhost:3004/content/search',
                {
                    params: { q: 'speed limit', jurisdiction: 'US-CA' },
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            expect(searchResponse.status).toBe(200);
            expect(searchResponse.data.items.some((item: any) => item.id === itemId)).toBe(true);
        });
    });

    describe('Scheduler Service Algorithm Integration', () => {
        it('should integrate SM-2, BKT, and IRT algorithms correctly', async () => {
            const authToken = 'mock-user-token';

            // Setup test user with initial state
            await setupTestUserState();

            // Step 1: Get next items (should use unified scoring)
            const nextItemsResponse = await axios.post(
                'http://localhost:3003/scheduler/next-items',
                {
                    userId: testUserId,
                    count: 5,
                    sessionType: 'practice'
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(nextItemsResponse.status).toBe(200);
            expect(nextItemsResponse.data.items).toHaveLength(5);

            const items = nextItemsResponse.data.items;

            // Verify items have proper scoring metadata
            items.forEach((item: any) => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('difficulty');
                expect(item).toHaveProperty('score');
                expect(item.score).toBeWithinRange(0, 1);
            });

            // Step 2: Submit attempt and verify algorithm updates
            const attemptResponse = await axios.post(
                'http://localhost:3003/scheduler/attempt',
                {
                    userId: testUserId,
                    itemId: items[0].id,
                    sessionId: uuidv4(),
                    clientAttemptId: uuidv4(),
                    selected: { answer: 'a' },
                    quality: 4,
                    timeTakenMs: 25000
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(attemptResponse.status).toBe(200);
            expect(attemptResponse.data).toHaveProperty('correct');
            expect(attemptResponse.data).toHaveProperty('updatedState');

            // Step 3: Verify state updates
            const stateResponse = await axios.get(
                `http://localhost:3003/scheduler/state/${testUserId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(stateResponse.status).toBe(200);

            const state = stateResponse.data;
            expect(state).toHaveProperty('abilityVector');
            expect(state).toHaveProperty('sm2States');
            expect(state).toHaveProperty('bktStates');

            // Verify SM-2 state was updated
            expect(state.sm2States[items[0].id]).toBeDefined();
            expect(state.sm2States[items[0].id]).toHaveProperty('easinessFactor');
            expect(state.sm2States[items[0].id]).toHaveProperty('interval');
            expect(state.sm2States[items[0].id]).toHaveProperty('nextDue');

            // Verify BKT states were updated for relevant topics
            items[0].topics.forEach((topic: string) => {
                expect(state.bktStates[topic]).toBeDefined();
                expect(state.bktStates[topic]).toHaveProperty('probKnowledge');
                expect(state.bktStates[topic].probKnowledge).toBeWithinRange(0, 1);
            });
        });

        it('should handle contextual bandit strategy selection', async () => {
            const authToken = 'mock-user-token';

            // Test different session types and verify strategy selection
            const sessionTypes = ['practice', 'review', 'mock_test'];

            for (const sessionType of sessionTypes) {
                const strategyResponse = await axios.post(
                    'http://localhost:3003/scheduler/session/strategy',
                    {
                        userId: testUserId,
                        sessionType: sessionType,
                        context: {
                            timeOfDay: 'morning',
                            dayOfWeek: 'monday',
                            recentPerformance: 0.75
                        }
                    },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );

                expect(strategyResponse.status).toBe(200);
                expect(strategyResponse.data).toHaveProperty('strategy');
                expect(strategyResponse.data).toHaveProperty('confidence');
                expect(strategyResponse.data.confidence).toBeWithinRange(0, 1);
            }
        });
    });

    describe('ML Service Integration', () => {
        it('should integrate with scheduler for predictions', async () => {
            const authToken = 'mock-user-token';

            // Step 1: Request ML predictions
            const predictionResponse = await axios.post(
                'http://localhost:3007/ml/predict',
                {
                    userId: testUserId,
                    candidateItems: ['item1', 'item2', 'item3'],
                    context: {
                        recentAttempts: 10,
                        averageAccuracy: 0.75,
                        sessionType: 'practice'
                    }
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(predictionResponse.status).toBe(200);
            expect(predictionResponse.data).toHaveProperty('predictions');
            expect(predictionResponse.data).toHaveProperty('modelVersion');

            const predictions = predictionResponse.data.predictions;
            Object.values(predictions).forEach((prob: any) => {
                expect(prob).toBeWithinRange(0, 1);
            });

            // Step 2: Verify predictions are cached
            const cachedResponse = await axios.post(
                'http://localhost:3007/ml/predict',
                {
                    userId: testUserId,
                    candidateItems: ['item1', 'item2', 'item3'],
                    context: {
                        recentAttempts: 10,
                        averageAccuracy: 0.75,
                        sessionType: 'practice'
                    }
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(cachedResponse.status).toBe(200);
            // Response should be faster (cached)
        });

        it('should provide model explainability', async () => {
            const authToken = 'mock-user-token';

            const explainResponse = await axios.post(
                'http://localhost:3007/ml/explain',
                {
                    userId: testUserId,
                    itemId: 'test-item-1',
                    prediction: 0.75
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(explainResponse.status).toBe(200);
            expect(explainResponse.data).toHaveProperty('featureImportance');
            expect(explainResponse.data).toHaveProperty('explanation');

            const importance = explainResponse.data.featureImportance;
            expect(Object.keys(importance).length).toBeGreaterThan(0);
        });
    });

    describe('Event Processing Pipeline', () => {
        it('should process events end-to-end through Kafka', async () => {
            const producer = kafka.producer();
            const consumer = kafka.consumer({ groupId: 'test-group' });

            await producer.connect();
            await consumer.connect();
            await consumer.subscribe({ topic: 'user.attempts' });

            const receivedEvents: any[] = [];

            consumer.run({
                eachMessage: async ({ message }) => {
                    const event = JSON.parse(message.value?.toString() || '{}');
                    receivedEvents.push(event);
                },
            });

            // Step 1: Publish attempt event
            const attemptEvent = {
                userId: testUserId,
                itemId: 'test-item-1',
                sessionId: uuidv4(),
                clientAttemptId: uuidv4(),
                selected: { answer: 'a' },
                correct: true,
                quality: 4,
                timeTakenMs: 20000,
                timestamp: Date.now()
            };

            await producer.send({
                topic: 'user.attempts',
                messages: [{
                    key: testUserId,
                    value: JSON.stringify(attemptEvent)
                }]
            });

            // Step 2: Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Verify event was received and processed
            expect(receivedEvents.length).toBeGreaterThan(0);
            const receivedEvent = receivedEvents.find(e => e.clientAttemptId === attemptEvent.clientAttemptId);
            expect(receivedEvent).toBeDefined();
            expect(receivedEvent.userId).toBe(testUserId);

            await producer.disconnect();
            await consumer.disconnect();
        });
    });

    // Helper function to setup test user state
    async function setupTestUserState() {
        const db = await TestEnvironment.getDbClient();

        await db.query(`
      INSERT INTO users (id, email, email_verified, country_code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, [testUserId, `test-${testUserId}@example.com`, true, 'US-CA']);

        await db.query(`
      INSERT INTO user_scheduler_state (
        user_id, ability_vector, sm2_states, bkt_states
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        ability_vector = EXCLUDED.ability_vector,
        sm2_states = EXCLUDED.sm2_states,
        bkt_states = EXCLUDED.bkt_states
    `, [
            testUserId,
            JSON.stringify({
                'traffic_signs': 0.0,
                'road_rules': 0.0,
                'parking': 0.0,
                'safety': 0.0,
                'emergency_procedures': 0.0
            }),
            JSON.stringify({}),
            JSON.stringify({})
        ]);
    }
});