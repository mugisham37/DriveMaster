import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ContentController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/content/items (POST) - should create a new item', () => {
        const createItemDto = {
            slug: 'test-item-e2e',
            content: { text: 'What is the speed limit in residential areas?' },
            choices: [
                { id: 'a', text: '25 mph' },
                { id: 'b', text: '35 mph' },
                { id: 'c', text: '45 mph' },
                { id: 'd', text: '55 mph' },
            ],
            correct: { choiceIds: ['a'] },
            topics: ['speed-limits'],
            jurisdictions: ['US'],
            difficulty: 0.2,
            estimatedTime: 45,
        };

        return request(app.getHttpServer())
            .post('/content/items')
            .send(createItemDto)
            .expect(201)
            .expect((res) => {
                expect(res.body.slug).toBe('test-item-e2e');
                expect(res.body.status).toBe('draft');
                expect(res.body.version).toBe(1);
            });
    });

    it('/content/items (GET) - should query items with pagination', () => {
        return request(app.getHttpServer())
            .get('/content/items')
            .query({ page: 1, limit: 10 })
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('items');
                expect(res.body).toHaveProperty('total');
                expect(res.body).toHaveProperty('page');
                expect(res.body).toHaveProperty('limit');
                expect(res.body).toHaveProperty('totalPages');
            });
    });

    it('/content/items/search (GET) - should search items', () => {
        return request(app.getHttpServer())
            .get('/content/items/search')
            .query({ q: 'speed limit' })
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
    });

    it('/content/items/:id (GET) - should return 404 for non-existent item', () => {
        return request(app.getHttpServer())
            .get('/content/items/123e4567-e89b-12d3-a456-426614174000')
            .expect(404);
    });
});