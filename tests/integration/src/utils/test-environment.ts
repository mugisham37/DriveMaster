import { Client } from 'pg';
import Redis from 'redis';
import { Kafka } from 'kafkajs';
import axios from 'axios';
import { TestDataGenerator } from './test-data-generator';

export class TestEnvironment {
    private static pgClient: Client;
    private static redisClient: any;
    private static kafkaClient: Kafka;

    static async waitForServices(): Promise<void> {
        const maxRetries = 30;
        const retryDelay = 2000;

        // Wait for PostgreSQL
        await this.waitForService('PostgreSQL', async () => {
            const client = new Client({
                host: 'localhost',
                port: 5433,
                database: 'adaptive_learning_test',
                user: 'test_user',
                password: 'test_password',
            });
            await client.connect();
            await client.query('SELECT 1');
            await client.end();
        }, maxRetries, retryDelay);

        // Wait for Redis
        await this.waitForService('Redis', async () => {
            const client = Redis.createClient({ url: 'redis://localhost:6380' });
            await client.connect();
            await client.ping();
            await client.disconnect();
        }, maxRetries, retryDelay);

        // Wait for Kafka
        await this.waitForService('Kafka', async () => {
            const kafka = new Kafka({
                clientId: 'test-client',
                brokers: ['localhost:9093'],
            });
            const admin = kafka.admin();
            await admin.connect();
            await admin.listTopics();
            await admin.disconnect();
        }, maxRetries, retryDelay);

        // Wait for MinIO
        await this.waitForService('MinIO', async () => {
            const response = await axios.get('http://localhost:9001/minio/health/live');
            if (response.status !== 200) {
                throw new Error('MinIO not ready');
            }
        }, maxRetries, retryDelay);

        // Wait for OpenSearch
        await this.waitForService('OpenSearch', async () => {
            const response = await axios.get('http://localhost:9201/_cluster/health');
            if (response.status !== 200) {
                throw new Error('OpenSearch not ready');
            }
        }, maxRetries, retryDelay);
    }

    private static async waitForService(
        serviceName: string,
        healthCheck: () => Promise<void>,
        maxRetries: number,
        retryDelay: number
    ): Promise<void> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await healthCheck();
                console.log(`✅ ${serviceName} is ready`);
                return;
            } catch (error) {
                console.log(`⏳ Waiting for ${serviceName}... (${i + 1}/${maxRetries})`);
                if (i === maxRetries - 1) {
                    throw new Error(`${serviceName} failed to start after ${maxRetries} retries`);
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    static async getDbClient(): Promise<Client> {
        if (!this.pgClient) {
            this.pgClient = new Client({
                host: 'localhost',
                port: 5433,
                database: 'adaptive_learning_test',
                user: 'test_user',
                password: 'test_password',
            });
            await this.pgClient.connect();
        }
        return this.pgClient;
    }

    static async getRedisClient(): Promise<any> {
        if (!this.redisClient) {
            this.redisClient = Redis.createClient({ url: 'redis://localhost:6380' });
            await this.redisClient.connect();
        }
        return this.redisClient;
    }

    static async getKafkaClient(): Promise<Kafka> {
        if (!this.kafkaClient) {
            this.kafkaClient = new Kafka({
                clientId: 'test-client',
                brokers: ['localhost:9093'],
            });
        }
        return this.kafkaClient;
    }

    static async seedTestData(): Promise<void> {
        const db = await this.getDbClient();
        const generator = new TestDataGenerator(db);

        // Create test users
        await generator.createTestUsers(100);

        // Create test content items
        await generator.createTestItems(500);

        // Create test attempts data
        await generator.createTestAttempts(1000);

        // Setup Kafka topics
        await this.setupKafkaTopics();

        console.log('✅ Test data seeded successfully');
    }

    static async setupKafkaTopics(): Promise<void> {
        const kafka = await this.getKafkaClient();
        const admin = kafka.admin();

        await admin.connect();

        const topics = [
            { topic: 'user.attempts', numPartitions: 3, replicationFactor: 1 },
            { topic: 'user.sessions', numPartitions: 2, replicationFactor: 1 },
            { topic: 'ml.training_events', numPartitions: 2, replicationFactor: 1 },
            { topic: 'notifications.push', numPartitions: 1, replicationFactor: 1 },
        ];

        try {
            await admin.createTopics({ topics });
            console.log('✅ Kafka topics created');
        } catch (error) {
            // Topics might already exist, which is fine
            console.log('ℹ️ Kafka topics already exist or creation failed:', error);
        }

        await admin.disconnect();
    }

    static async cleanupTestData(): Promise<void> {
        const db = await this.getDbClient();
        const redis = await this.getRedisClient();

        // Clean up database (keep schema, remove data)
        await db.query('TRUNCATE TABLE attempts, skill_mastery, user_scheduler_state RESTART IDENTITY CASCADE');

        // Clean up Redis
        await redis.flushDb();
    }

    static async cleanupTestArtifacts(): Promise<void> {
        // Clean up any temporary files, connections, etc.
        // This runs after each test
    }

    static async cleanup(): Promise<void> {
        if (this.pgClient) {
            await this.pgClient.end();
        }
        if (this.redisClient) {
            await this.redisClient.disconnect();
        }
    }
}