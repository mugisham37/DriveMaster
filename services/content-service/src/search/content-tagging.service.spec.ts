import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentTaggingService } from './content-tagging.service';
import { Item } from '../content/entities/item.entity';

describe('ContentTaggingService', () => {
    let service: ContentTaggingService;
    let itemRepository: jest.Mocked<Repository<Item>>;

    const mockItemRepository = {
        createQueryBuilder: jest.fn(),
        update: jest.fn(),
        getRawMany: jest.fn(),
    };

    const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getRawMany: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContentTaggingService,
                {
                    provide: getRepositoryToken(Item),
                    useValue: mockItemRepository,
                },
            ],
        }).compile();

        service = module.get<ContentTaggingService>(ContentTaggingService);
        itemRepository = module.get(getRepositoryToken(Item));

        mockItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeContent', () => {
        it('should analyze content and suggest tags', async () => {
            const content = {
                text: 'What does a stop sign mean? You must come to a complete stop.',
            };
            const choices = [
                { text: 'Come to a complete stop' },
                { text: 'Slow down and proceed' },
                { text: 'Yield to other traffic' },
            ];
            const explanation = {
                text: 'A stop sign requires drivers to come to a complete stop before proceeding.',
            };

            const result = await service.analyzeContent(content, choices, explanation);

            expect(result).toHaveProperty('suggestedTags');
            expect(result).toHaveProperty('suggestedCategories');
            expect(result).toHaveProperty('topicRelevance');
            expect(result).toHaveProperty('difficultyEstimate');
            expect(result).toHaveProperty('cognitiveLevel');

            // Should detect traffic signs topic
            const trafficSignsTag = result.suggestedTags.find(tag => tag.tag === 'traffic-signs');
            expect(trafficSignsTag).toBeDefined();
            expect(trafficSignsTag?.confidence).toBeGreaterThan(0);

            // Should have topic relevance for traffic-signs
            expect(result.topicRelevance['traffic-signs']).toBeGreaterThan(0);

            // Should determine cognitive level
            expect(result.cognitiveLevel).toBeDefined();
            expect(['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'])
                .toContain(result.cognitiveLevel);
        });

        it('should handle content with parking terminology', async () => {
            const content = {
                text: 'Where can you park in a residential area? Check for parking signs and time limits.',
            };

            const result = await service.analyzeContent(content);

            const parkingTag = result.suggestedTags.find(tag => tag.tag === 'parking-rules');
            expect(parkingTag).toBeDefined();
            expect(result.topicRelevance['parking-rules']).toBeGreaterThan(0);
        });

        it('should estimate difficulty based on content complexity', async () => {
            const easyContent = {
                text: 'What color is a stop sign? It is red.',
            };

            const hardContent = {
                text: 'In complex intersection scenarios with multiple traffic control devices, sophisticated decision-making processes must be implemented to determine appropriate yielding protocols.',
            };

            const easyResult = await service.analyzeContent(easyContent);
            const hardResult = await service.analyzeContent(hardContent);

            expect(easyResult.difficultyEstimate).toBeLessThan(hardResult.difficultyEstimate);
        });
    });

    describe('autoTagItems', () => {
        it('should auto-tag items with high confidence suggestions', async () => {
            const mockItems = [
                {
                    id: '1',
                    content: { text: 'Stop sign regulations require complete stops' },
                    choices: [],
                    explanation: null,
                    tags: ['existing-tag'],
                },
                {
                    id: '2',
                    content: { text: 'Parking meter time limits in downtown areas' },
                    choices: [],
                    explanation: null,
                    tags: [],
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValue(mockItems);
            mockItemRepository.update.mockResolvedValue({} as any);

            const result = await service.autoTagItems(['1', '2']);

            expect(result.processed).toBe(2);
            expect(result.updated).toBeGreaterThanOrEqual(0);
            expect(mockItemRepository.update).toHaveBeenCalled();
        });

        it('should process all items when no itemIds provided', async () => {
            const mockItems = [
                {
                    id: '1',
                    content: { text: 'Traffic light signals' },
                    choices: [],
                    explanation: null,
                    tags: [],
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValue(mockItems);
            mockItemRepository.update.mockResolvedValue({} as any);

            const result = await service.autoTagItems();

            expect(result.processed).toBe(1);
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.isActive = :isActive', { isActive: true });
        });
    });

    describe('getTagSuggestions', () => {
        it('should return tag suggestions for content text', async () => {
            const contentText = 'Traffic signs and road markings provide important information to drivers';

            const result = await service.getTagSuggestions(contentText);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('tag');
            expect(result[0]).toHaveProperty('confidence');
            expect(result[0]).toHaveProperty('reason');
        });
    });

    describe('getPopularTags', () => {
        it('should return popular tags with counts', async () => {
            const mockRawResult = [
                { tag: 'traffic-signs', count: '25' },
                { tag: 'parking-rules', count: '18' },
                { tag: 'speed-limits', count: '12' },
            ];

            mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResult);

            const result = await service.getPopularTags(10);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ tag: 'traffic-signs', count: 25 });
            expect(result[1]).toEqual({ tag: 'parking-rules', count: 18 });
            expect(result[2]).toEqual({ tag: 'speed-limits', count: 12 });
        });

        it('should handle database errors gracefully', async () => {
            mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Database error'));

            const result = await service.getPopularTags(10);

            expect(result).toEqual([]);
        });
    });

    describe('getTagCooccurrence', () => {
        it('should return tags that frequently appear together', async () => {
            const mockRawResult = [
                { related_tag: 'road-signs', cooccurrence: '15' },
                { related_tag: 'intersections', cooccurrence: '8' },
            ];

            mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResult);

            const result = await service.getTagCooccurrence('traffic-signs', 20);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ tag: 'road-signs', cooccurrence: 15 });
            expect(result[1]).toEqual({ tag: 'intersections', cooccurrence: 8 });
        });

        it('should handle database errors gracefully', async () => {
            mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Database error'));

            const result = await service.getTagCooccurrence('traffic-signs', 20);

            expect(result).toEqual([]);
        });
    });

    describe('content analysis edge cases', () => {
        it('should handle empty content gracefully', async () => {
            const result = await service.analyzeContent({ text: '' });

            expect(result.suggestedTags).toEqual([]);
            expect(result.suggestedCategories).toEqual([]);
            expect(Object.keys(result.topicRelevance)).toHaveLength(0);
        });

        it('should handle content with no matching keywords', async () => {
            const content = {
                text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
            };

            const result = await service.analyzeContent(content);

            expect(result.suggestedTags).toEqual([]);
            expect(Object.keys(result.topicRelevance)).toHaveLength(0);
        });

        it('should suggest categories based on content patterns', async () => {
            const content = {
                text: 'Traffic signals control the flow of vehicles at intersections',
            };

            const result = await service.analyzeContent(content);

            const trafficControlCategory = result.suggestedCategories.find(
                cat => cat.category === 'Traffic Control'
            );
            expect(trafficControlCategory).toBeDefined();
        });
    });
});