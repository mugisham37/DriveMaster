import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentRecommendationService } from './content-recommendation.service';
import { Item, ItemStatus } from '../content/entities/item.entity';

describe('ContentRecommendationService', () => {
    let service: ContentRecommendationService;
    let elasticsearchService: jest.Mocked<ElasticsearchService>;
    let itemRepository: jest.Mocked<Repository<Item>>;

    const mockElasticsearchService = {
        search: jest.fn(),
    } as any;

    const mockItemRepository = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContentRecommendationService,
                {
                    provide: ElasticsearchService,
                    useValue: mockElasticsearchService,
                },
                {
                    provide: getRepositoryToken(Item),
                    useValue: mockItemRepository,
                },
            ],
        }).compile();

        service = module.get<ContentRecommendationService>(ContentRecommendationService);
        elasticsearchService = module.get(ElasticsearchService);
        itemRepository = module.get(getRepositoryToken(Item));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getSimilarContent', () => {
        it('should return similar content items', async () => {
            const mockSourceItem = {
                id: '1',
                slug: 'source-item',
                status: ItemStatus.PUBLISHED,
                isActive: true,
            } as Item;

            const mockResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '2',
                                slug: 'similar-item',
                                content: { text: 'Similar content' },
                                topics: ['traffic-signs'],
                                difficulty: 0.5,
                            },
                            _score: 0.8,
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            itemRepository.findOne.mockResolvedValue(mockSourceItem);
            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.getSimilarContent('1', 5);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('2');
            expect(result[0].similarity).toBe(0.8);
            expect(elasticsearchService.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: expect.objectContaining({
                        bool: expect.objectContaining({
                            must: expect.arrayContaining([
                                expect.objectContaining({
                                    more_like_this: expect.objectContaining({
                                        fields: ['content.text', 'topics', 'tags', 'cognitiveLevel'],
                                        like: [{ _index: 'content_items', _id: '1' }],
                                    }),
                                }),
                            ]),
                            must_not: [{ term: { id: '1' } }],
                        }),
                    }),
                })
            );
        });

        it('should throw error if source item not found', async () => {
            itemRepository.findOne.mockResolvedValue(null);

            await expect(service.getSimilarContent('nonexistent', 5))
                .rejects.toThrow('Item with ID \'nonexistent\' not found');
        });
    });

    describe('getPersonalizedRecommendations', () => {
        it('should return personalized recommendations', async () => {
            const mockWeakTopicsResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '1',
                                slug: 'weak-topic-item',
                                topics: ['traffic-signs'],
                                difficulty: 0.3,
                            },
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            const mockDifficultyResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '2',
                                slug: 'difficulty-matched-item',
                                difficulty: 0.2,
                            },
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            elasticsearchService.search
                .mockResolvedValueOnce(mockWeakTopicsResponse)
                .mockResolvedValueOnce(mockDifficultyResponse);

            const result = await service.getPersonalizedRecommendations('user1', 10);

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('score');
            expect(result[0]).toHaveProperty('reason');
            expect(elasticsearchService.search).toHaveBeenCalledTimes(2);
        });
    });

    describe('getTrendingContent', () => {
        it('should return trending content', async () => {
            const mockResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '1',
                                slug: 'trending-item',
                                publishedAt: new Date(),
                                difficulty: 0.0,
                            },
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.getTrendingContent({
                jurisdiction: 'CA',
                timeframe: '7d',
                limit: 10,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('trendingScore');
            expect(result[0]).toHaveProperty('usageCount');
            expect(elasticsearchService.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: expect.objectContaining({
                        bool: expect.objectContaining({
                            filter: expect.arrayContaining([
                                { term: { jurisdictions: 'CA' } },
                                { term: { status: ItemStatus.PUBLISHED } },
                                { term: { isActive: true } },
                            ]),
                        }),
                    }),
                })
            );
        });
    });

    describe('getRecommendationsByTopic', () => {
        it('should return topic-based recommendations', async () => {
            const mockResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '1',
                                slug: 'topic-item',
                                topics: ['traffic-signs'],
                                difficulty: 0.5,
                            },
                            _score: 1.0,
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.getRecommendationsByTopic(
                ['traffic-signs'],
                0.5,
                10
            );

            expect(result).toHaveLength(1);
            expect(result[0].relevanceScore).toBe(1.0);
            expect(elasticsearchService.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: expect.objectContaining({
                        bool: expect.objectContaining({
                            must: [{ terms: { topics: ['traffic-signs'] } }],
                            filter: expect.arrayContaining([
                                {
                                    range: {
                                        difficulty: { gte: 0, lte: 1 },
                                    },
                                },
                            ]),
                        }),
                    }),
                })
            );
        });
    });

    describe('getContentGapRecommendations', () => {
        it('should analyze content gaps and return recommendations', async () => {
            const mockResponse = {
                aggregations: {
                    topics_distribution: {
                        buckets: [
                            {
                                key: 'traffic-signs',
                                doc_count: 5,
                                difficulty_stats: { avg: 0.5 },
                            },
                            {
                                key: 'parking-rules',
                                doc_count: 15,
                                difficulty_stats: { avg: 0.3 },
                            },
                        ],
                    },
                    difficulty_distribution: {
                        buckets: [
                            { key: -1.0, doc_count: 3 },
                            { key: -0.5, doc_count: 8 },
                            { key: 0.0, doc_count: 12 },
                        ],
                    },
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: { value: 0 } },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.getContentGapRecommendations('CA');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);

            // Should identify traffic-signs as a topic gap (doc_count < 10)
            const topicGap = result.find(item => item.type === 'topic_gap' && item.topic === 'traffic-signs');
            expect(topicGap).toBeDefined();
            expect(topicGap.currentCount).toBe(5);
            expect(topicGap.recommendation).toBe('Create more content for this topic');
        });
    });

    describe('updateRecommendationModels', () => {
        it('should log interaction without throwing error', async () => {
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

            await expect(
                service.updateRecommendationModels('user1', 'item1', 'viewed')
            ).resolves.not.toThrow();

            consoleSpy.mockRestore();
        });
    });
});