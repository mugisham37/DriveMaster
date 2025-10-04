import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContentService } from './content.service';
import { Item, ItemStatus } from './entities/item.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { WorkflowHistory, WorkflowAction } from './entities/workflow-history.entity';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';
import { NotificationService } from '../services/notification.service';

describe('ContentService - Workflow Management', () => {
    let service: ContentService;
    let itemRepository: Repository<Item>;
    let workflowHistoryRepository: Repository<WorkflowHistory>;
    let notificationService: NotificationService;

    const mockItem: Partial<Item> = {
        id: 'test-item-id',
        slug: 'test-item',
        status: ItemStatus.DRAFT,
        content: { text: 'Test question' },
        choices: [
            { id: 'a', text: 'Choice A' },
            { id: 'b', text: 'Choice B' },
        ],
        correct: { choiceIds: ['a'] },
        topics: ['traffic-rules'],
        jurisdictions: ['CA'],
        version: 1,
        createdBy: 'author-id',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContentService,
                {
                    provide: getRepositoryToken(Item),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(MediaAsset),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(WorkflowHistory),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {},
                },
                {
                    provide: S3Service,
                    useValue: {},
                },
                {
                    provide: ValidationService,
                    useValue: {},
                },
                {
                    provide: NotificationService,
                    useValue: {
                        notifyStatusChange: jest.fn(),
                        notifyReviewAssignment: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ContentService>(ContentService);
        itemRepository = module.get<Repository<Item>>(getRepositoryToken(Item));
        workflowHistoryRepository = module.get<Repository<WorkflowHistory>>(
            getRepositoryToken(WorkflowHistory)
        );
        notificationService = module.get<NotificationService>(NotificationService);
    });

    describe('submitForReview', () => {
        it('should submit item for review successfully', async () => {
            const item = { ...mockItem, status: ItemStatus.DRAFT } as Item;
            const updatedItem = { ...item, status: ItemStatus.UNDER_REVIEW } as Item;

            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(updatedItem);
            jest.spyOn(workflowHistoryRepository, 'create').mockReturnValue({} as WorkflowHistory);
            jest.spyOn(workflowHistoryRepository, 'save').mockResolvedValue({} as WorkflowHistory);

            const result = await service.submitForReview(
                'test-item-id',
                { message: 'Ready for review' },
                'author-id'
            );

            expect(result.status).toBe(ItemStatus.UNDER_REVIEW);
            expect(itemRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: ItemStatus.UNDER_REVIEW,
                })
            );
            expect(notificationService.notifyStatusChange).toHaveBeenCalled();
        });

        it('should throw error if item is not in draft status', async () => {
            const item = { ...mockItem, status: ItemStatus.PUBLISHED } as Item;
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);

            await expect(
                service.submitForReview('test-item-id', {}, 'author-id')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('reviewItem', () => {
        it('should approve item successfully', async () => {
            const item = { ...mockItem, status: ItemStatus.UNDER_REVIEW } as Item;
            const updatedItem = { ...item, status: ItemStatus.APPROVED, approvedBy: 'reviewer-id' } as Item;

            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(updatedItem);
            jest.spyOn(workflowHistoryRepository, 'create').mockReturnValue({} as WorkflowHistory);
            jest.spyOn(workflowHistoryRepository, 'save').mockResolvedValue({} as WorkflowHistory);

            const result = await service.reviewItem(
                'test-item-id',
                {
                    decision: ItemStatus.APPROVED,
                    comments: 'Looks good!',
                },
                'reviewer-id'
            );

            expect(result.status).toBe(ItemStatus.APPROVED);
            expect(result.approvedBy).toBe('reviewer-id');
            expect(notificationService.notifyStatusChange).toHaveBeenCalled();
        });

        it('should reject item and reset to draft', async () => {
            const item = { ...mockItem, status: ItemStatus.UNDER_REVIEW } as Item;
            const updatedItem = { ...item, status: ItemStatus.DRAFT, approvedBy: null } as Item;

            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(updatedItem);
            jest.spyOn(workflowHistoryRepository, 'create').mockReturnValue({} as WorkflowHistory);
            jest.spyOn(workflowHistoryRepository, 'save').mockResolvedValue({} as WorkflowHistory);

            const result = await service.reviewItem(
                'test-item-id',
                {
                    decision: ItemStatus.DRAFT,
                    comments: 'Needs improvement',
                    suggestedChanges: 'Fix grammar',
                },
                'reviewer-id'
            );

            expect(result.status).toBe(ItemStatus.DRAFT);
            expect(result.approvedBy).toBeNull();
        });

        it('should throw error if reviewer is not authorized', async () => {
            const item = {
                ...mockItem,
                status: ItemStatus.UNDER_REVIEW,
                reviewedBy: 'assigned-reviewer-id',
            } as Item;

            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);

            await expect(
                service.reviewItem(
                    'test-item-id',
                    {
                        decision: ItemStatus.APPROVED,
                        comments: 'Approved',
                    },
                    'different-reviewer-id'
                )
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('publishItem', () => {
        it('should publish approved item successfully', async () => {
            const item = { ...mockItem, status: ItemStatus.APPROVED } as Item;
            const publishedItem = {
                ...item,
                status: ItemStatus.PUBLISHED,
                publishedAt: expect.any(Date),
            } as Item;

            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);
            jest.spyOn(itemRepository, 'save').mockResolvedValue(publishedItem);
            jest.spyOn(workflowHistoryRepository, 'create').mockReturnValue({} as WorkflowHistory);
            jest.spyOn(workflowHistoryRepository, 'save').mockResolvedValue({} as WorkflowHistory);

            const result = await service.publishItem(
                'test-item-id',
                { notes: 'Publishing to production' },
                'publisher-id'
            );

            expect(result.status).toBe(ItemStatus.PUBLISHED);
            expect(result.publishedAt).toBeDefined();
            expect(notificationService.notifyStatusChange).toHaveBeenCalled();
        });

        it('should throw error if item is not approved', async () => {
            const item = { ...mockItem, status: ItemStatus.DRAFT } as Item;
            jest.spyOn(itemRepository, 'findOne').mockResolvedValue(item);

            await expect(
                service.publishItem('test-item-id', {}, 'publisher-id')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getWorkflowHistory', () => {
        it('should return workflow history for item', async () => {
            const historyEntries = [
                {
                    action: WorkflowAction.CREATED,
                    performedBy: 'author-id',
                    createdAt: new Date(),
                    previousStatus: ItemStatus.DRAFT,
                    newStatus: ItemStatus.DRAFT,
                    comments: 'Initial creation',
                },
                {
                    action: WorkflowAction.SUBMITTED_FOR_REVIEW,
                    performedBy: 'author-id',
                    createdAt: new Date(),
                    previousStatus: ItemStatus.DRAFT,
                    newStatus: ItemStatus.UNDER_REVIEW,
                    comments: 'Ready for review',
                },
            ];

            jest.spyOn(workflowHistoryRepository, 'find').mockResolvedValue(historyEntries as WorkflowHistory[]);

            const result = await service.getWorkflowHistory('test-item-id');

            expect(result).toHaveLength(2);
            expect(result[0].action).toBe(WorkflowAction.CREATED);
            expect(result[1].action).toBe(WorkflowAction.SUBMITTED_FOR_REVIEW);
        });
    });
});