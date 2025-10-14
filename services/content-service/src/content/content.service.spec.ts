import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';
import { Item, ItemStatus, ItemType, CognitiveLevel } from './entities/item.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';

describe('ContentService', () => {
    let service: ContentService;
    let itemRepository: Repository<Item>;
    let validationService: ValidationService;

    const mockItem: Item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'test-item',
        content: { text: 'Test question?' },
        choices: [
            { id: 'a', text: 'Choice A' },
            { id: 'b', text: 'Choice B' },
        ],
        correct: { choiceIds: ['a'] },
        difficulty: 0.5,
        discrimination: 1.0,
        guessing: 0.25,
        topics: ['traffic-signs'],
        jurisdictions: ['US'],
        itemType: ItemType.MULTIPLE_CHOICE,
        cognitiveLevel: CognitiveLevel.KNOWLEDGE,
        mediaAssets: [],
        externalRefs: [],
        estimatedTime: 60,
        points: 1,
        tags: [],
        version: 1,
        status: ItemStatus.DRAFT,
        createdBy: 'user-123',
        reviewedBy: null,
        approvedBy: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        searchVector: null,
    };

    const mockCreateItemDto: CreateItemDto = {
        slug: 'test-item',
        content: { text: 'Test question?' },
        choices: [
            { id: 'a', text: 'Choice A' },
            { id: 'b', text: 'Choice B' },
        ],
        correct: { choiceIds: ['a'] },
        topics: ['traffic-signs'],
        jurisdictions: ['US'],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContentService,
                {
                    provide: getRepositoryToken(Item),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(MediaAsset),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn(),
                    },
                },
                {
                    provide: S3Service,
                    useValue: {
                        uploadFile: jest.fn(),
                        getSignedUrl: jest.fn(),
                        deleteFile: jest.fn(),
                    },
                },
                {
                    provide: ValidationService,
                    useValue: {
                        validateSlugFormat: jest.fn(),
                        validateItemContent: jest.fn(),
                        validateChoiceReferences: jest.fn(),
                        validateDifficultyParameters: jest.fn(),
                        validateTopicsAndJurisdictions: jest.fn(),
                        validateMediaMetadata: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ContentService>(ContentService);
        itemRepository = module.get<Repository<Item>>(getRepositoryToken(Item));
        // _mediaRepository = module.get<Repository<MediaAsset>>(getRepositoryToken(MediaAsset));
        // _s3Service = module.get<S3Service>(S3Service);
        validationService = module.get<ValidationService>(ValidationService);
        // _dataSource = module.get<DataSource>(DataSource);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createItem', () => {
        it('should create a new item successfully', async () => {
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(null);
            jest.spyOn(itemRepository, 'create').mockReturnValue(mockItem);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(mockItem);

            const result = await service.createItem(mockCreateItemDto, 'user-123');

            expect(validationService.validateSlugFormat).toHaveBeenCalledWith('test-item');
            expect(validationService.validateItemContent).toHaveBeenCalledWith(mockCreateItemDto);
            expect(result).toEqual(mockItem);
        });

        it('should throw ConflictException if slug already exists', async () => {
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem);

            await expect(
                service.createItem(mockCreateItemDto, 'user-123')
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getItem', () => {
        it('should return item by ID', async () => {
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem);

            const result = await service.getItem('123e4567-e89b-12d3-a456-426614174000');

            expect(result).toEqual(mockItem);
            expect(itemRepository.findOne).toHaveBeenCalledWith({
                where: { id: '123e4567-e89b-12d3-a456-426614174000', isActive: true },
                relations: ['mediaAssets'],
            });
        });

        it('should throw NotFoundException if item not found', async () => {
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(null);

            await expect(
                service.getItem('non-existent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateItem', () => {
        const updateDto: UpdateItemDto = {
            content: { text: 'Updated question?' },
        };

        it('should update item successfully', async () => {
            const updatedItem = { ...mockItem, ...updateDto, version: 2 };
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(updatedItem);

            const result = await service.updateItem('123e4567-e89b-12d3-a456-426614174000', updateDto, 'user-123');

            expect(result.id).toEqual(updatedItem.id);
            expect(result.version).toEqual(2);
            expect(result.content).toEqual(updateDto.content);
            expect(result.previousVersion).toEqual(mockItem);
        });

        it('should throw NotFoundException if item not found', async () => {
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(null);

            await expect(
                service.updateItem('non-existent-id', updateDto, 'user-123')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('queryItems', () => {
        const queryDto: QueryItemsDto = {
            page: 1,
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
        };

        it('should return paginated items', async () => {
            const mockQueryBuilder = {
                getCount: jest.fn().mockResolvedValue(1),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockItem]),
            };

            jest.spyOn(service as any, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

            const result = await service.queryItems(queryDto);

            expect(result).toEqual({
                items: [mockItem],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });
    });

    describe('deleteItem', () => {
        it('should soft delete item', async () => {
            jest.spyOn(service, 'getItem').mockResolvedValue(mockItem);
            jest.spyOn(itemRepository, 'update').mockResolvedValue(undefined);

            await service.deleteItem('123e4567-e89b-12d3-a456-426614174000');

            expect(itemRepository.update).toHaveBeenCalledWith(
                '123e4567-e89b-12d3-a456-426614174000',
                {
                    isActive: false,
                    updatedAt: expect.any(Date),
                }
            );
        });
    });

    describe('duplicateItem', () => {
        it('should duplicate item with new slug', async () => {
            const duplicatedItem = { ...mockItem, id: 'new-id', slug: 'new-slug' };
            jest.spyOn(service, 'getItem').mockResolvedValue(mockItem);
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(null);
            jest.spyOn(itemRepository, 'create').mockReturnValue(duplicatedItem);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(duplicatedItem);

            const result = await service.duplicateItem('123e4567-e89b-12d3-a456-426614174000', 'new-slug', 'user-123');

            expect(result.slug).toBe('new-slug');
            expect(result.status).toBe(ItemStatus.DRAFT);
        });

        it('should throw ConflictException if new slug already exists', async () => {
            jest.spyOn(service, 'getItem').mockResolvedValue(mockItem);
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(mockItem);

            await expect(
                service.duplicateItem('123e4567-e89b-12d3-a456-426614174000', 'existing-slug', 'user-123')
            ).rejects.toThrow(ConflictException);
        });
    });
});