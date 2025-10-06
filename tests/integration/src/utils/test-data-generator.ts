import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

export class TestDataGenerator {
    constructor(private db: Client) { }

    async createTestUsers(count: number): Promise<string[]> {
        const userIds: string[] = [];

        for (let i = 0; i < count; i++) {
            const userId = uuidv4();
            const email = faker.internet.email();
            const countryCode = faker.location.countryCode();

            await this.db.query(`
        INSERT INTO users (id, email, email_verified, country_code, preferences, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                userId,
                email,
                true,
                countryCode,
                JSON.stringify({
                    language: 'en',
                    timezone: 'UTC',
                    notifications: true
                }),
                faker.date.past()
            ]);

            userIds.push(userId);
        }

        console.log(`✅ Created ${count} test users`);
        return userIds;
    }

    async createTestItems(count: number): Promise<string[]> {
        const itemIds: string[] = [];
        const topics = ['traffic_signs', 'road_rules', 'parking', 'safety', 'emergency_procedures'];
        const jurisdictions = ['US-CA', 'US-NY', 'US-TX', 'CA-ON', 'CA-BC'];

        for (let i = 0; i < count; i++) {
            const itemId = uuidv4();
            const slug = `test-item-${i}`;

            const content = {
                text: faker.lorem.sentence(),
                type: 'multiple_choice'
            };

            const choices = [
                { id: 'a', text: faker.lorem.words(3) },
                { id: 'b', text: faker.lorem.words(3) },
                { id: 'c', text: faker.lorem.words(3) },
                { id: 'd', text: faker.lorem.words(3) }
            ];

            const correct = { answer: faker.helpers.arrayElement(['a', 'b', 'c', 'd']) };

            await this.db.query(`
        INSERT INTO items (
          id, slug, content, choices, correct, difficulty, discrimination,
          topics, jurisdictions, item_type, status, created_at, published_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
                itemId,
                slug,
                JSON.stringify(content),
                JSON.stringify(choices),
                JSON.stringify(correct),
                faker.number.float({ min: -2, max: 2, precision: 0.1 }), // IRT difficulty
                faker.number.float({ min: 0.5, max: 2.5, precision: 0.1 }), // IRT discrimination
                JSON.stringify(faker.helpers.arrayElements(topics, { min: 1, max: 3 })),
                JSON.stringify(faker.helpers.arrayElements(jurisdictions, { min: 1, max: 2 })),
                'multiple_choice',
                'published',
                faker.date.past(),
                faker.date.past()
            ]);

            itemIds.push(itemId);
        }

        console.log(`✅ Created ${count} test items`);
        return itemIds;
    }

    async createTestAttempts(count: number): Promise<void> {
        // Get existing users and items
        const usersResult = await this.db.query('SELECT id FROM users LIMIT 50');
        const itemsResult = await this.db.query('SELECT id FROM items LIMIT 100');

        const userIds = usersResult.rows.map(row => row.id);
        const itemIds = itemsResult.rows.map(row => row.id);

        if (userIds.length === 0 || itemIds.length === 0) {
            console.log('⚠️ No users or items found, skipping attempt creation');
            return;
        }

        for (let i = 0; i < count; i++) {
            const userId = faker.helpers.arrayElement(userIds);
            const itemId = faker.helpers.arrayElement(itemIds);
            const sessionId = uuidv4();
            const clientAttemptId = uuidv4();

            const correct = faker.datatype.boolean();
            const quality = correct ? faker.number.int({ min: 3, max: 5 }) : faker.number.int({ min: 0, max: 2 });

            await this.db.query(`
        INSERT INTO attempts (
          user_id, item_id, session_id, client_attempt_id,
          selected, correct, quality, confidence, time_taken_ms,
          hints_used, device_type, app_version, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
                userId,
                itemId,
                sessionId,
                clientAttemptId,
                JSON.stringify({ answer: faker.helpers.arrayElement(['a', 'b', 'c', 'd']) }),
                correct,
                quality,
                faker.number.int({ min: 1, max: 5 }),
                faker.number.int({ min: 5000, max: 120000 }), // 5s to 2min
                faker.number.int({ min: 0, max: 3 }),
                faker.helpers.arrayElement(['mobile', 'web']),
                '1.0.0',
                faker.date.past()
            ]);
        }

        console.log(`✅ Created ${count} test attempts`);
    }

    async createTestSchedulerStates(userIds: string[]): Promise<void> {
        for (const userId of userIds) {
            const abilityVector = {
                'traffic_signs': faker.number.float({ min: -2, max: 2, precision: 0.1 }),
                'road_rules': faker.number.float({ min: -2, max: 2, precision: 0.1 }),
                'parking': faker.number.float({ min: -2, max: 2, precision: 0.1 }),
                'safety': faker.number.float({ min: -2, max: 2, precision: 0.1 }),
                'emergency_procedures': faker.number.float({ min: -2, max: 2, precision: 0.1 })
            };

            await this.db.query(`
        INSERT INTO user_scheduler_state (
          user_id, ability_vector, sm2_states, bkt_states,
          consecutive_days, total_study_time_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                userId,
                JSON.stringify(abilityVector),
                JSON.stringify({}), // Empty SM-2 states initially
                JSON.stringify({}), // Empty BKT states initially
                faker.number.int({ min: 0, max: 30 }),
                faker.number.int({ min: 0, max: 3600000 }) // Up to 1 hour
            ]);
        }

        console.log(`✅ Created scheduler states for ${userIds.length} users`);
    }
}