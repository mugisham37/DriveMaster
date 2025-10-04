import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { Item, ItemStatus } from '../content/entities/item.entity';

describe('SearchService', () => {
    let service: SearchService;
    let elasticsearchService: jest.Mocked<ElasticsearchService>;
    let itemRepository: jest.Mocked<Repository<Item>>;

    const mockElasticsearchService = {
        search: jest.fn(),
        index: jest.fn(),
        delete: jest.fn(),
        bulk: jest.fn(),
        indices: {
            exists: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            stats: jest.fn(),
        },
    } as any;

    const mockItemRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
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

        service = module.get<SearchService>(SearchService);
        elasticsearchService = module.get(ElasticsearchService);
        itemRepository = module.get(getRepositoryToken(Item));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('should perform full-text search successfully', async () => {
            const mockResponse = {
                hits: {
                    hits: [
                        {
                            _source: {
                                id: '1',
                                slug: 'test-item',
                                content: { text: 'Test content' },
                                topics: ['traffic-signs'],
                                difficulty: 0.5,
                            },
                            _score: 1.0,
                            highlight: {},
                        },
                    ],
                    total: { value: 1 },
                },
                aggregations: {
                    topics: { buckets: [] },
                    jurisdictions: { buckets: [] },
                    itemTypes: { buckets: [] },
                    cognitiveLevels: { buckets: [] },
                    difficultyRanges: { buckets: [] },
                    tags: { buckets: [] },
                },
                took: 10,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.search({
                query: 'traffic signs',
                page: 1,
                limit: 20,
            });

            expect(result.hits).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.hits[0].id).toBe('1');
            expect(elasticsearchService.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    index: 'content_items',
                    query: expect.any(Object),
                })
            );
        });

        it('should handle search with filters', async () => {
            const mockResponse = {
                hits: { hits: [], total: { value: 0 } },
                aggregations: {},
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            await service.search({
                query: 'parking',
                topics: ['parking-rules'],
                jurisdictions: ['CA'],
                minDifficulty: 0,
                maxDifficulty: 1,
                page: 1,
                limit: 10,
            });

            expect(elasticsearchService.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: expect.objectContaining({
                        bool: expect.objectContaining({
                            must: expect.arrayContaining([
                                expect.objectContaining({
                                    multi_match: expect.objectContaining({
                                        query: 'parking',
                                    }),
                                }),
                            ]),
                            filter: expect.arrayContaining([
                                { terms: { topics: ['parking-rules'] } },
                                { terms: { jurisdictions: ['CA'] } },
                                { range: { difficulty: { gte: 0, lte: 1 } } },
                            ]),
                        }),
                    }),
                })
            );
        });
    });

    describe('getSuggestions', () => {
        it('should return search suggestions', async () => {
            const mockResponse = {
                suggest: {
                    content_suggest: [
                        {
                            options: [
                                { text: 'traffic signs', _score: 1.0 },
                                { text: 'traffic lights', _score: 0.8 },
                            ],
                        },
                    ],
                    topic_suggest: [
                        {
                            options: [
                                { text: 'traffic-signs', _score: 0.9 },
                            ],
                        },
                    ],
                },
                took: 5,
                timed_out: false,
                _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
                hits: { hits: [], total: { value: 0 } },
            } as any;

            elasticsearchService.search.mockResolvedValue(mockResponse);

            const result = await service.getSuggestions('traffic', 5);

            expect(result).toHaveLength(3);
            expect(result[0].text).toBe('traffic signs');
            expect(result[0].type).toBe('content');
            expect(result[1].text).toBe('traffic-signs');
            expect(result[1].type).toBe('topic');
        });
    });

    describe('indexItem', () => {
        it('should index an item successfully', async () => {
            const mockItem = {
                id: '1',
                slug: 'test-item',
                content: { text: 'Test content' },
                choices: [],
                correct: {},
                explanation: null,
                difficulty: 0.5,
                discrimination: 1.0,
                guessing: 0.25,
                topics: ['traffic-signs'],
                jurisdictions: ['CA'],
                itemType: 'multiple_choice',
                cognitiveLevel: 'knowledge',
                tags: ['test-tag'],
                estimatedTime: 60,
                points: 1,
                status: ItemStatus.PUBLISHED,
                publishedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
            } as Item;

            elasticsearchService.index.mockResolvedValue({} as any);

            await service.indexItem(mockItem);

            expect(elasticsearchService.index).toHaveBeenCalledWith({
                index: 'content_items',
                id: '1',
                document: expect.objectContaining({
                    id: '1',
                    slug: 'test-item',
                    content: { text: 'Test content' },
                    topics: ['traffic-signs'],
                }),
            });
        });
    });

    describe('removeItem', () => {
        it('should remove an item from index', async () => {
            elasticsearchService.delete.mockResolvedValue({} as any);

            await service.removeItem('1');

            expect(elasticsearchService.delete).toHaveBeenCalledWith({
                index: 'content_items',
                id: '1',
            });
        });

        it('should handle 404 errors gracefully', async () => {
            const error = new Error('Not found');
            (error as any).meta = { statusCode: 404 };
            elasticsearchService.delete.mockRejectedValue(error);

            await expect(service.removeItem('1')).resolves.not.toThrow();
        });
    });

    describe('bulkIndexItems', () => {
        it('should bulk index items successfully', async () => {
            const mockItems = [
                {
                    id: '1',
                    slug: 'item-1',
                    content: { text: 'Content 1' },
                    choices: [],
                    correct: {},
                    explanation: null,
                    difficulty: 0.5,
                    discrimination: 1.0,
                    guessing: 0.25,
                    topics: ['traffic-signs'],
                    jurisdictions: ['CA'],
                    itemType: 'multiple_choice',
                    cognitiveLevel: 'knowledge',
                    tags: ['tag1'],
                    estimatedTime: 60,
                    points: 1,
                    status: ItemStatus.PUBLISHED,
                    publishedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                } as Item,
                {
                    id: '2',
                    slug: 'item-2',
                    content: { text: 'Content 2' },
                    choices: [],
                    correct: {},
                    explanation: null,
                    difficulty: 0.3,
                    discrimination: 1.0,
                    guessing: 0.25,
                    topics: ['parking-rules'],
                    jurisdictions: ['CA'],
                    itemType: 'multiple_choice',
                    cognitiveLevel: 'comprehension',
                    tags: ['tag2'],
                    estimatedTime: 45,
                    points: 1,
                    status: ItemStatus.PUBLISHED,
                    publishedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                } as Item,
            ];

            elasticsearchService.bulk.mockResolvedValue({
                errors: false,
                items: [],
            } as any);

            await service.bulkIndexItems(mockItems);

            expect(elasticsearchService.bulk).toHaveBeenCalledWith({
                body: expect.arrayContaining([
                    { index: { _index: 'content_items', _id: '1' } },
                    expect.objectContaining({ id: '1' }),
                    { index: { _index: 'content_items', _id: '2' } },
                    expect.objectContaining({ id: '2' }),
                ]),
            });
        });
    });

    describe('reindexAll', () => {
        it('should reindex all published items', async () => {
            const mockItems = [
                {
                    id: '1',
                    slug: 'reindex-item',
                    content: { text: 'Reindex content' },
                    choices: [],
                    correct: {},
                    explanation: null,
                    difficulty: 0.0,
                    discrimination: 1.0,
                    guessing: 0.25,
                    topics: ['general'],
                    jurisdictions: ['CA'],
                    itemType: 'multiple_choice',
                    cognitiveLevel: 'knowledge',
                    tags: ['reindex'],
                    estimatedTime: 30,
                    points: 1,
                    status: ItemStatus.PUBLISHED,
                    publishedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                } as Item,
            ];

            // Reset mocks to clear any calls from module initialization
            jest.clearAllMocks();

            // Mock for deleteIndex (which checks if index exists first)
            (elasticsearchService.indices.exists as jest.Mock)
                .mockResolvedValueOnce(true)  // For deleteIndex
                .mockResolvedValueOnce(false); // For ensureIndexExists
            (elasticsearchService.indices.delete as jest.Mock).mockResolvedValue({} as any);
            (elasticsearchService.indices.create as jest.Mock).mockResolvedValue({} as any);
            itemRepository.find.mockResolvedValue(mockItems);
            elasticsearchService.bulk.mockResolvedValue({
                errors: false,
                items: [],
            } as any);

            await service.reindexAll();

            expect(elasticsearchService.indices.delete).toHaveBeenCalled();
            expect(elasticsearchService.indices.create).toHaveBeenCalled();
            expect(itemRepository.find).toHaveBeenCalledWith({
                where: {
                    status: ItemStatus.PUBLISHED,
                    isActive: true,
                },
                relations: ['mediaAssets'],
            });
            expect(elasticsearchService.bulk).toHaveBeenCalled();
        });
    });

    describe('getIndexStats', () => {
        it('should return index statistics', async () => {
            const mockStats = {
                indices: {
                    content_items: {
                        total: {
                            docs: { count: 100 },
                            store: { size_in_bytes: 1024000 },
                        },
                    },
                },
            };

            (elasticsearchService.indices.stats as jest.Mock).mockResolvedValue(mockStats as any);

            const result = await service.getIndexStats();

            expect(result).toEqual({
                indexName: 'content_items',
                documentCount: 100,
                indexSize: 1024000,
                lastUpdated: expect.any(Date),
            });
        });
    });
});