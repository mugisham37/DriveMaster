import axios from 'axios';
import { TestEnvironment } from '../utils/test-environment';
import { v4 as uuidv4 } from 'uuid';

describe('End-to-End User Journey Tests', () => {
    let testUserId: string;
    let authToken: string;

    beforeAll(async () => {
        // These tests assume services are running on standard ports
        // In a real environment, you'd start the services or use test containers
    });

    beforeEach(async () => {
        testUserId = uuidv4();
    });

    describe('Complete User Onboarding Flow', () => {
        it('should complete full user registration and placement test', async () => {
            // Step 1: User Registration
            const registrationResponse = await axios.post('http://localhost:3001/auth/register', {
                email: `test-${testUserId}@example.com`,
                password: 'TestPassword123!',
                countryCode: 'US-CA'
            });

            expect(registrationResponse.status).toBe(201);
            expect(registrationResponse.data).toHaveProperty('accessToken');
            authToken = registrationResponse.data.accessToken;

            // Step 2: Email Verification (simulated)
            const verificationResponse = await axios.post(
                'http://localhost:3001/auth/verify-email',
                { token: 'mock-verification-token' },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(verificationResponse.status).toBe(200);

            // Step 3: Initial Profile Setup
            const profileResponse = await axios.put(
                `http://localhost:3002/users/${testUserId}/profile`,
                {
                    preferences: {
                        language: 'en',
                        timezone: 'America/Los_Angeles',
                        notifications: true
                    }
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(profileResponse.status).toBe(200);

            // Step 4: Placement Test Administration
            const placementStartResponse = await axios.post(
                'http://localhost:3003/scheduler/placement/start',
                { userId: testUserId },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(placementStartResponse.status).toBe(200);
            expect(placementStartResponse.data).toHaveProperty('sessionId');
            expect(placementStartResponse.data).toHaveProperty('items');
            expect(placementStartResponse.data.items).toHaveLength(15); // Placement test length

            const sessionId = placementStartResponse.data.sessionId;
            const placementItems = placementStartResponse.data.items;

            // Step 5: Complete Placement Test
            const placementAttempts = [];
            for (let i = 0; i < placementItems.length; i++) {
                const item = placementItems[i];
                const isCorrect = Math.random() > 0.3; // 70% correct rate
                const selectedAnswer = isCorrect ? item.correct.answer : 'wrong_answer';

                const attemptResponse = await axios.post(
                    'http://localhost:3003/scheduler/attempt',
                    {
                        userId: testUserId,
                        itemId: item.id,
                        sessionId: sessionId,
                        clientAttemptId: uuidv4(),
                        selected: { answer: selectedAnswer },
                        timeTakenMs: Math.floor(Math.random() * 30000) + 10000, // 10-40 seconds
                        confidence: Math.floor(Math.random() * 5) + 1
                    },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );

                expect(attemptResponse.status).toBe(200);
                expect(attemptResponse.data).toHaveProperty('correct');
                expect(attemptResponse.data).toHaveProperty('nextItem');

                placementAttempts.push(attemptResponse.data);
            }

            // Step 6: Finalize Placement Test
            const placementResultsResponse = await axios.post(
                'http://localhost:3003/scheduler/placement/complete',
                { userId: testUserId, sessionId: sessionId },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(placementResultsResponse.status).toBe(200);
            expect(placementResultsResponse.data).toHaveProperty('abilityEstimates');
            expect(placementResultsResponse.data).toHaveProperty('recommendedPath');

            // Step 7: Verify User State Initialization
            const userStateResponse = await axios.get(
                `http://localhost:3003/scheduler/state/${testUserId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(userStateResponse.status).toBe(200);
            expect(userStateResponse.data).toHaveProperty('abilityVector');
            expect(userStateResponse.data).toHaveProperty('sm2States');
            expect(userStateResponse.data).toHaveProperty('bktStates');

            // Verify ability estimates are reasonable
            const abilityVector = userStateResponse.data.abilityVector;
            Object.values(abilityVector).forEach((ability: any) => {
                expect(ability).toBeWithinRange(-3, 3); // Reasonable IRT ability range
            });
        }, 120000); // 2 minute timeout for full flow

        it('should handle adaptive learning session with proper item selection', async () => {
            // Assume user is already registered and has completed placement test
            await setupTestUserWithPlacement();

            // Step 1: Start Practice Session
            const sessionStartResponse = await axios.post(
                'http://localhost:3003/scheduler/session/start',
                {
                    userId: testUserId,
                    sessionType: 'practice',
                    targetDuration: 1800, // 30 minutes
                    topicFocus: ['traffic_signs', 'road_rules']
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(sessionStartResponse.status).toBe(200);
            expect(sessionStartResponse.data).toHaveProperty('sessionId');
            expect(sessionStartResponse.data).toHaveProperty('nextItems');

            const sessionId = sessionStartResponse.data.sessionId;
            let nextItems = sessionStartResponse.data.nextItems;

            // Step 2: Complete Multiple Items in Session
            const sessionAttempts = [];
            for (let i = 0; i < 10; i++) {
                expect(nextItems).toHaveLength.greaterThan(0);
                const item = nextItems[0];

                // Simulate user response with varying performance
                const performanceLevel = 0.75; // 75% accuracy
                const isCorrect = Math.random() < performanceLevel;
                const quality = isCorrect ?
                    Math.floor(Math.random() * 3) + 3 : // 3-5 for correct
                    Math.floor(Math.random() * 3); // 0-2 for incorrect

                const attemptResponse = await axios.post(
                    'http://localhost:3003/scheduler/attempt',
                    {
                        userId: testUserId,
                        itemId: item.id,
                        sessionId: sessionId,
                        clientAttemptId: uuidv4(),
                        selected: { answer: isCorrect ? item.correct.answer : 'wrong' },
                        quality: quality,
                        timeTakenMs: Math.floor(Math.random() * 45000) + 15000, // 15-60 seconds
                        confidence: Math.floor(Math.random() * 5) + 1,
                        hintsUsed: Math.random() > 0.8 ? 1 : 0
                    },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );

                expect(attemptResponse.status).toBe(200);
                expect(attemptResponse.data).toHaveProperty('correct', isCorrect);
                expect(attemptResponse.data).toHaveProperty('updatedState');

                sessionAttempts.push(attemptResponse.data);
                nextItems = attemptResponse.data.nextItems || [];

                // Verify adaptive behavior - difficulty should adjust based on performance
                if (i > 3) { // After a few attempts
                    const recentCorrect = sessionAttempts.slice(-3).every(a => a.correct);
                    const recentIncorrect = sessionAttempts.slice(-3).every(a => !a.correct);

                    if (recentCorrect && nextItems.length > 0) {
                        // Should get harder items after consistent success
                        expect(nextItems[0].difficulty).toBeGreaterThan(item.difficulty - 0.5);
                    } else if (recentIncorrect && nextItems.length > 0) {
                        // Should get easier items after consistent failure
                        expect(nextItems[0].difficulty).toBeLessThan(item.difficulty + 0.5);
                    }
                }
            }

            // Step 3: End Session
            const sessionEndResponse = await axios.post(
                'http://localhost:3003/scheduler/session/end',
                { userId: testUserId, sessionId: sessionId },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(sessionEndResponse.status).toBe(200);
            expect(sessionEndResponse.data).toHaveProperty('summary');
            expect(sessionEndResponse.data.summary).toHaveProperty('itemsAttempted');
            expect(sessionEndResponse.data.summary).toHaveProperty('correctCount');
            expect(sessionEndResponse.data.summary).toHaveProperty('totalTime');

            // Step 4: Verify Progress Updates
            const progressResponse = await axios.get(
                `http://localhost:3002/users/${testUserId}/progress`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(progressResponse.status).toBe(200);
            expect(progressResponse.data).toHaveProperty('mastery');
            expect(progressResponse.data).toHaveProperty('streaks');
            expect(progressResponse.data).toHaveProperty('totalStudyTime');
        }, 180000); // 3 minute timeout
    });

    describe('Cross-Platform Synchronization', () => {
        it('should sync progress between mobile and web platforms', async () => {
            await setupTestUserWithPlacement();

            // Step 1: Simulate mobile session
            const mobileSessionResponse = await axios.post(
                'http://localhost:3003/scheduler/session/start',
                {
                    userId: testUserId,
                    sessionType: 'practice',
                    deviceType: 'mobile',
                    appVersion: '1.0.0'
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            const mobileSessionId = mobileSessionResponse.data.sessionId;

            // Complete some attempts on mobile
            for (let i = 0; i < 5; i++) {
                await axios.post(
                    'http://localhost:3003/scheduler/attempt',
                    {
                        userId: testUserId,
                        itemId: `test-item-${i}`,
                        sessionId: mobileSessionId,
                        clientAttemptId: uuidv4(),
                        selected: { answer: 'a' },
                        quality: 4,
                        timeTakenMs: 20000,
                        deviceType: 'mobile'
                    },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
            }

            await axios.post(
                'http://localhost:3003/scheduler/session/end',
                { userId: testUserId, sessionId: mobileSessionId },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            // Step 2: Verify sync on web platform
            const webProgressResponse = await axios.get(
                `http://localhost:3002/users/${testUserId}/progress`,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'User-Agent': 'web-app/1.0.0'
                    }
                }
            );

            expect(webProgressResponse.status).toBe(200);
            expect(webProgressResponse.data.totalStudyTime).toBeGreaterThan(0);

            // Step 3: Start web session and verify state continuity
            const webSessionResponse = await axios.post(
                'http://localhost:3003/scheduler/session/start',
                {
                    userId: testUserId,
                    sessionType: 'practice',
                    deviceType: 'web'
                },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(webSessionResponse.status).toBe(200);
            expect(webSessionResponse.data.nextItems).toBeDefined();

            // Verify that the scheduler considers previous mobile session
            const schedulerState = await axios.get(
                `http://localhost:3003/scheduler/state/${testUserId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(schedulerState.data.lastSessionEnd).toBeDefined();
            expect(schedulerState.data.totalStudyTime).toBeGreaterThan(0);
        });
    });

    // Helper function to set up a test user with completed placement test
    async function setupTestUserWithPlacement() {
        const db = await TestEnvironment.getDbClient();

        // Insert test user
        await db.query(`
      INSERT INTO users (id, email, email_verified, country_code)
      VALUES ($1, $2, $3, $4)
    `, [testUserId, `test-${testUserId}@example.com`, true, 'US-CA']);

        // Insert scheduler state with placement results
        await db.query(`
      INSERT INTO user_scheduler_state (
        user_id, ability_vector, sm2_states, bkt_states
      )
      VALUES ($1, $2, $3, $4)
    `, [
            testUserId,
            JSON.stringify({
                'traffic_signs': 0.5,
                'road_rules': 0.2,
                'parking': -0.3,
                'safety': 0.8,
                'emergency_procedures': 0.1
            }),
            JSON.stringify({}),
            JSON.stringify({})
        ]);

        // Mock auth token (in real test, would get from auth service)
        authToken = 'mock-jwt-token';
    }
});