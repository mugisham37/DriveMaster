import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BulkOperationsService } from './bulk-operations.service';
import { Item, ItemStatus, ItemType, CognitiveLevel } from '../content/entities/item.entity';
import { MediaAsset } from '../content/entities/media-asset.entity';
import { ContentService } from '../content/content.service';
import { ValidationService } from './validation.service';
import { S3Service } from './s3.service';
import {
    BulkImportRequestDto,
    BulkImportItemDto,
    ContentAnalyticsRequestDto,
} from '../content/dto/bulk-operations.dto';

describe('BulkOperationsService', () => {
    let service: BulkOperationsService;
    let itemRepository: Repository<Item>;
    let mediaRepository: Repository<MediaAsset>;
    let contentService: ContentService;
    let validationService: ValidationService;
    let s3Service: S3Service;

    const mockItemRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockMediaRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockDataSource = {
        transaction: jest.fn(),
    };

    const mockContentService = {
        createItem: jest.fn(),
        getItem: jest.fn(),
        reviewItem: jest.fn(),
        publishItem: jest.fn(),
        archiveItem: jest.fn(),
        deleteItem: jest.fn(),
        duplicateItem: jest.fn(),
    };

    const mockValidationService = {
        validateSlugFormat: jest.fn(),
        validateItemContent: jest.fn(),
        validateChoiceReferences: jest.fn(),
        validateDifficultyParameters: jest.fn(),
        validateTopicsAndJurisdictions: jest.fn(),
    };

    const mockS3Service = {
        uploadFile: jest.fn(),
        getSignedUrl: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BulkOperationsService,
                {
                    provide: getRepositoryToken(Item),
                    useValue: mockItemRepository,
                },
                {
                    provide: getRepositoryToken(MediaAsset),
                    useValue: mockMediaRepository,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: ContentService,
                    useValue: mockContentService,
                },
                {
                    provide: ValidationService,
                    useValue: mockValidationService,
                },
                {
                    provide: S3Service,
                    useValue: mockS3Service,
                },
            ],
        }).compile();

        service = module.get<BulkOperationsService>(BulkOperationsService);
        itemRepository = module.get<Repository<Item>>(getRepositoryToken(Item));
        mediaRepository = module.get<Repository<MediaAsset>>(getRepositoryToken(MediaAsset));
        contentService = module.get<ContentService>(ContentService);
        validationService = module.get<ValidationService>(ValidationService);
        s3Service = module.get<S3Service>(S3Service);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('bulkImport', () => {
        it('should successfully import valid items', async () => {
            const importItems: BulkImportItemDto[] = [
                {
                    slug: 'test-item-1',
                    questionText: 'What is the speed limit in residential areas?',
                    choiceA: '25 mph',
                    choiceB: '35 mph',
                    choiceC: '45 mph',
                    choiceD: '55 mph',
                    correctAnswer: 'A',
                    explanation: 'Residential areas typically have a 25 mph speed limit.',
                    difficulty: 0.5,
                    topics: 'speed-limits,residential',
                    jurisdictions: 'CA,NY',
                    itemType: ItemType.MULTIPLE_CHOICE,
                    cognitiveLevel: CognitiveLevel.KNOWLEDGE,
                },
            ];

            const importRequest: BulkImportRequestDto = {
                format: 'json',
                items: importItems,
                validationMode: 'strict',
            };

            const mockCreatedItem = {
                id: 'test-id-1',
                slug: 'test-item-1',
                status: ItemStatus.DRAFT,
                itemType: ItemType.MULTIPLE_CHOICE,
                jurisdictions: ['CA', 'NY'],
            };

            mockItemRepository.findOne.mockResolvedValue(null); // No duplicate
            mockContentService.createItem.mockResolvedValue(mockCreatedItem);

            const result = await service.bulkImport(importRequest, 'test-user');

            expect(result.totalProcessed).toBe(1);
            expect(result.successCount).toBe(1);
            expect(result.failureCount).toBe(0);
            expect(result.successful).toContain('test-id-1');
            expect(mockContentService.createItem).toHaveBeenCalledTimes(1);
        });

        it('should skip duplicate items when skipDuplicates is true', async () => {
            const importItems: BulkImportItemDto[] = [
                {
                    slug: 'existing-item',
                    questionText: 'Test question',
                    choiceA: 'A',
                    choiceB: 'B',
                    correctAnswer: 'A',
                    topics: 'test',
                    jurisdictions: 'CA',
                },
            ];

            const importRequest: BulkImportRequestDto = {
                format: 'json',
                items: importItems,
                skipDuplicates: true,
            };

            const existingItem = { id: 'existing-id', slug: 'existing-item' };
            mockItemRepository.findOne.mockResolvedValue(existingItem);

            const result = await service.bulkImport(importRequest, 'test-user');

            expect(result.totalProcessed).toBe(1);
            expect(result.successCount).toBe(0);
            expect(result.skippedCount).toBe(1);
            expect(result.skipped[0].reason).toBe('Duplicate slug exists');
            expect(mockContentService.createItem).not.toHaveBeenCalled();
        });

        it('should handle validation errors in strict mode', async () => {
            const importItems: BulkImportItemDto[] = [
                {
                    slug: 'invalid-item',
                    questionText: 'Test question',
                    choiceA: 'A',
                    choiceB: 'B',
                    correctAnswer: 'A',
                    topics: 'test',
                    jurisdictions: 'CA',
                },
            ];

            const importRequest: BulkImportRequestDto = {
                format: 'json',
                items: importItems,
                validationMode: 'strict',
            };

            mockItemRepository.findOne.mockResolvedValue(null);
            mockContentService.createItem.mockRejectedValue(new Error('Validation failed'));

            const result = await service.bulkImport(importRequest, 'test-user');

            expect(result.totalProcessed).toBe(1);
            expect(result.successCount).toBe(0);
            expect(result.failureCount).toBe(1);
            expect(result.failed[0].error).toBe('Validation failed');
        });
    });

    describe('parseCsvImport', () => {
        it('should parse CSV content correctly', async () => {
            const csvContent = `slug,questionText,choiceA,choiceB,correctAnswer,topics,jurisdictions
test-item,What is 2+2?,2,4,B,math,CA`;

            const result = await service.parseCsvImport(csvContent);

            expect(result).toHaveLength(1);
            expect(result[0].slug).toBe('test-item');
            expect(result[0].questionText).toBe('What is 2+2?');
            expect(result[0].choiceA).toBe('2');
            expect(result[0].choiceB).toBe('4');
            expect(result[0].correctAnswer).toBe('B');
        });
    });

    describe('getContentAnalytics', () => {
        it('should generate content analytics report', async () => {
            const mockItems = [
                {
                    id: '1',
                    status: ItemStatus.PUBLISHED,
                    itemType: ItemType.MULTIPLE_CHOICE,
                    jurisdictions: ['CA'],
                    topics: ['speed-limits'],
                    difficulty: 0.5,
                    createdAt: new Date('2024-01-01'),
                    publishedAt: new Date('2024-01-02'),
                },
                {
                    id: '2',
                    status: ItemStatus.DRAFT,
                    itemType: ItemType.TRUE_FALSE,
                    jurisdictions: ['NY'],
                    topics: ['traffic-signs'],
                    difficulty: 0.3,
                    createdAt: new Date('2024-01-03'),
                    publishedAt: null,
                },
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockItems),
            };

            mockItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const analyticsRequest: ContentAnalyticsRequestDto = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            };

            const result = await service.getContentAnalytics(analyticsRequest);

            expect(result.totalItems).toBe(2);
            expect(result.itemsByStatus[ItemStatus.PUBLISHED]).toBe(1);
            expect(result.itemsByStatus[ItemStatus.DRAFT]).toBe(1);
            expect(result.itemsByType[ItemType.MULTIPLE_CHOICE]).toBe(1);
            expect(result.itemsByType[ItemType.TRUE_FALSE]).toBe(1);
            expect(result.itemsByJurisdiction['CA']).toBe(1);
            expect(result.itemsByJurisdiction['NY']).toBe(1);
            expect(result.itemsByTopic['speed-limits']).toBe(1);
            expect(result.itemsByTopic['traffic-signs']).toBe(1);
        });
    });
});