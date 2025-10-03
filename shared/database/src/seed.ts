import { createMigrationConnection, schema } from './connection';
import { v4 as uuidv4 } from 'uuid';

// Seed data for development and testing
export class DatabaseSeeder {
    private db: ReturnType<typeof createMigrationConnection>['getDb'];

    constructor() {
        const connection = createMigrationConnection();
        this.db = connection.getDb();
    }

    // Seed users
    async seedUsers() {
        console.log('Seeding users...');

        const users = [
            {
                id: uuidv4(),
                email: 'admin@adaptive-learning.com',
                emailVerified: true,
                countryCode: 'US',
                userRole: 'admin' as const,
                preferences: {
                    theme: 'light',
                    notifications: true,
                    language: 'en'
                }
            },
            {
                id: uuidv4(),
                email: 'author@adaptive-learning.com',
                emailVerified: true,
                countryCode: 'US',
                userRole: 'content_author' as const,
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    language: 'en'
                }
            },
            {
                id: uuidv4(),
                email: 'reviewer@adaptive-learning.com',
                emailVerified: true,
                countryCode: 'CA',
                userRole: 'content_reviewer' as const,
                preferences: {
                    theme: 'light',
                    notifications: false,
                    language: 'en'
                }
            },
            {
                id: uuidv4(),
                email: 'learner1@example.com',
                emailVerified: true,
                countryCode: 'US',
                userRole: 'learner' as const,
                preferences: {
                    theme: 'light',
                    notifications: true,
                    language: 'en',
                    studyReminders: true,
                    difficultyPreference: 'adaptive'
                }
            },
            {
                id: uuidv4(),
                email: 'learner2@example.com',
                emailVerified: true,
                countryCode: 'CA',
                userRole: 'learner' as const,
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    language: 'en',
                    studyReminders: false,
                    difficultyPreference: 'challenging'
                }
            }
        ];

        await this.db.insert(schema.users).values(users).onConflictDoNothing();
        console.log(`Seeded ${users.length} users`);

        return users;
    }

    // Seed content items
    async seedContent() {
        console.log('Seeding content items...');

        // Get admin user for created_by
        const adminUser = await this.db
            .select()
            .from(schema.users)
            .where(schema.eq(schema.users.email, 'admin@adaptive-learning.com'))
            .limit(1);

        if (adminUser.length === 0) {
            throw new Error('Admin user not found. Please seed users first.');
        }

        const items = [
            {
                id: uuidv4(),
                slug: 'traffic-sign-stop-complete',
                content: {
                    text: 'What does a red octagonal sign with white letters spelling "STOP" mean?',
                    image: 'stop-sign.jpg',
                    type: 'multiple_choice'
                },
                choices: [
                    { id: 'a', text: 'Come to a complete stop' },
                    { id: 'b', text: 'Slow down and proceed with caution' },
                    { id: 'c', text: 'Yield to oncoming traffic' },
                    { id: 'd', text: 'Stop only if traffic is present' }
                ],
                correct: ['a'],
                explanation: {
                    text: 'A stop sign requires drivers to come to a complete stop at the marked line, crosswalk, or intersection, regardless of traffic conditions.',
                    reference: 'Traffic Code Section 21.3'
                },
                topics: ['traffic_signs', 'road_rules', 'intersections'],
                jurisdictions: ['US', 'CA'],
                difficulty: -0.5, // Easy question
                discrimination: 1.2,
                guessing: 0.25,
                estimatedTime: 45,
                status: 'published' as const,
                createdBy: adminUser[0].id
            },
            {
                id: uuidv4(),
                slug: 'right-of-way-four-way-stop',
                content: {
                    text: 'At a four-way stop intersection, if you and another vehicle arrive at the same time, who has the right of way?',
                    type: 'multiple_choice'
                },
                choices: [
                    { id: 'a', text: 'The vehicle on your right' },
                    { id: 'b', text: 'The vehicle on your left' },
                    { id: 'c', text: 'The larger vehicle' },
                    { id: 'd', text: 'Whoever honks first' }
                ],
                correct: ['a'],
                explanation: {
                    text: 'When two vehicles arrive simultaneously at a four-way stop, the vehicle on the right has the right of way.',
                    reference: 'Traffic Code Section 15.2'
                },
                topics: ['right_of_way', 'intersections', 'traffic_rules'],
                jurisdictions: ['US', 'CA'],
                difficulty: 0.2, // Medium-easy
                discrimination: 1.0,
                guessing: 0.25,
                estimatedTime: 60,
                status: 'published' as const,
                createdBy: adminUser[0].id
            },
            {
                id: uuidv4(),
                slug: 'speed-limit-residential-area',
                content: {
                    text: 'What is the typical speed limit in a residential area when no signs are posted?',
                    type: 'multiple_choice'
                },
                choices: [
                    { id: 'a', text: '15 mph' },
                    { id: 'b', text: '25 mph' },
                    { id: 'c', text: '35 mph' },
                    { id: 'd', text: '45 mph' }
                ],
                correct: ['b'],
                explanation: {
                    text: 'In most jurisdictions, the default speed limit in residential areas is 25 mph when no signs are posted.',
                    reference: 'Traffic Code Section 8.1'
                },
                topics: ['speed_limits', 'residential_driving', 'traffic_laws'],
                jurisdictions: ['US'],
                difficulty: 0.0, // Medium
                discrimination: 0.9,
                guessing: 0.25,
                estimatedTime: 50,
                status: 'published' as const,
                createdBy: adminUser[0].id
            },
            {
                id: uuidv4(),
                slug: 'parallel-parking-steps',
                content: {
                    text: 'When parallel parking, what is the first step after finding a suitable parking space?',
                    type: 'multiple_choice'
                },
                choices: [
                    { id: 'a', text: 'Turn on your hazard lights' },
                    { id: 'b', text: 'Signal your intention to park' },
                    { id: 'c', text: 'Check your mirrors and blind spots' },
                    { id: 'd', text: 'Begin backing up immediately' }
                ],
                correct: ['b'],
                explanation: {
                    text: 'Always signal your intention to park to alert other drivers of your maneuver before beginning the parking process.',
                    reference: 'Driving Manual Chapter 7'
                },
                topics: ['parking', 'vehicle_operation', 'safety_procedures'],
                jurisdictions: ['US', 'CA'],
                difficulty: 0.8, // Harder question
                discrimination: 1.1,
                guessing: 0.25,
                estimatedTime: 75,
                status: 'published' as const,
                createdBy: adminUser[0].id
            },
            {
                id: uuidv4(),
                slug: 'blood-alcohol-limit',
                content: {
                    text: 'What is the legal blood alcohol concentration (BAC) limit for drivers 21 and over in most US states?',
                    type: 'multiple_choice'
                },
                choices: [
                    { id: 'a', text: '0.05%' },
                    { id: 'b', text: '0.08%' },
                    { id: 'c', text: '0.10%' },
                    { id: 'd', text: '0.12%' }
                ],
                correct: ['b'],
                explanation: {
                    text: 'The legal BAC limit for drivers 21 and over is 0.08% in all US states. Lower limits apply to commercial drivers and those under 21.',
                    reference: 'DUI Laws Section 4.1'
                },
                topics: ['dui_laws', 'legal_limits', 'safety'],
                jurisdictions: ['US'],
                difficulty: -0.2, // Easy-medium
                discrimination: 1.3,
                guessing: 0.25,
                estimatedTime: 40,
                status: 'published' as const,
                createdBy: adminUser[0].id
            }
        ];

        await this.db.insert(schema.items).values(items).onConflictDoNothing();
        console.log(`Seeded ${items.length} content items`);

        return items;
    }

    // Seed learning goals
    async seedLearningGoals() {
        console.log('Seeding learning goals...');

        // Get learner users
        const learners = await this.db
            .select()
            .from(schema.users)
            .where(schema.eq(schema.users.userRole, 'learner'));

        if (learners.length === 0) {
            console.log('No learners found, skipping learning goals');
            return [];
        }

        const goals = learners.flatMap(learner => [
            {
                id: uuidv4(),
                userId: learner.id,
                title: 'Master Traffic Signs',
                description: 'Learn to identify and understand all common traffic signs',
                targetTopics: ['traffic_signs', 'road_rules'],
                targetMastery: 0.85,
                targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                currentMastery: 0.0
            },
            {
                id: uuidv4(),
                userId: learner.id,
                title: 'Right of Way Rules',
                description: 'Understand right of way rules at intersections and various traffic situations',
                targetTopics: ['right_of_way', 'intersections', 'traffic_rules'],
                targetMastery: 0.80,
                targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
                currentMastery: 0.0
            }
        ]);

        await this.db.insert(schema.learningGoals).values(goals).onConflictDoNothing();
        console.log(`Seeded ${goals.length} learning goals`);

        return goals;
    }

    // Seed skill mastery data
    async seedSkillMastery() {
        console.log('Seeding skill mastery data...');

        const learners = await this.db
            .select()
            .from(schema.users)
            .where(schema.eq(schema.users.userRole, 'learner'));

        if (learners.length === 0) {
            console.log('No learners found, skipping skill mastery');
            return [];
        }

        const topics = [
            'traffic_signs', 'right_of_way', 'speed_limits', 'parking',
            'intersections', 'road_rules', 'safety_procedures', 'dui_laws'
        ];

        const masteryData = learners.flatMap(learner =>
            topics.map(topic => ({
                userId: learner.id,
                topic,
                mastery: Math.random() * 0.6, // Random mastery between 0 and 0.6
                confidence: 0.3 + Math.random() * 0.4, // Random confidence between 0.3 and 0.7
                lastPracticed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
                practiceCount: Math.floor(Math.random() * 20) + 1,
                correctStreak: Math.floor(Math.random() * 5),
                longestStreak: Math.floor(Math.random() * 10) + 1,
                totalTimeMs: Math.floor(Math.random() * 300000) + 60000 // 1-5 minutes
            }))
        );

        await this.db.insert(schema.skillMastery).values(masteryData).onConflictDoNothing();
        console.log(`Seeded ${masteryData.length} skill mastery records`);

        return masteryData;
    }

    // Run all seeders
    async seedAll() {
        console.log('Starting database seeding...');

        try {
            const users = await this.seedUsers();
            const items = await this.seedContent();
            const goals = await this.seedLearningGoals();
            const mastery = await this.seedSkillMastery();

            console.log('Database seeding completed successfully!');
            console.log(`Summary:
        - Users: ${users.length}
        - Content Items: ${items.length}
        - Learning Goals: ${goals.length}
        - Skill Mastery Records: ${mastery.length}
      `);

        } catch (error) {
            console.error('Database seeding failed:', error);
            throw error;
        }
    }

    // Clear all seed data (for testing)
    async clearSeedData() {
        console.log('Clearing seed data...');

        // Delete in reverse dependency order
        await this.db.delete(schema.skillMastery);
        await this.db.delete(schema.learningGoals);
        await this.db.delete(schema.items);
        await this.db.delete(schema.refreshTokens);
        await this.db.delete(schema.oauthProviders);
        await this.db.delete(schema.users);

        console.log('Seed data cleared');
    }
}

// Convenience function to run seeding
export async function seedDatabase() {
    const seeder = new DatabaseSeeder();
    await seeder.seedAll();
}

export async function clearSeedData() {
    const seeder = new DatabaseSeeder();
    await seeder.clearSeedData();
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('Seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}