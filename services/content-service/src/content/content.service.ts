import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { Item, ItemStatus } from './entities/item.entity';
import { MediaAsset, MediaType } from './entities/media-asset.entity';
import { WorkflowHistory, WorkflowAction } from './entities/workflow-history.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import {
    SubmitForReviewDto,
    ReviewItemDto,
    AssignReviewerDto,
    PublishItemDto,
    WorkflowHistoryEntry,
    BulkWorkflowDto,
    BulkWorkflowResult,
} from './dto/workflow.dto';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';
import { NotificationService } from '../services/notification.service';
import { MediaAssetService, MediaUploadOptions, MediaAssetWithUrls } from '../services/media-asset.service';

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ItemWithVersion extends Item {
    previousVersion?: Item;
}

@Injectable()
export class ContentService {
    private readonly logger = new Logger(ContentService.name);

    constructor(
        @InjectRepository(Item)
        private readonly itemRepository: Repository<Item>,
        @InjectRepository(MediaAsset)
        private readonly mediaRepository: Repository<MediaAsset>,
        @InjectRepository(WorkflowHistory)
        private readonly workflowHistoryRepository: Repository<WorkflowHistory>,
        private readonly dataSource: DataSource,
        private readonly s3Service: S3Service,
        private readonly validationService: ValidationService,
        private readonly notificationService: NotificationService,
        private readonly mediaAssetService: MediaAssetService,
    ) { }

    async createItem(createItemDto: CreateItemDto, createdBy: string): Promise<Item> {
        // Comprehensive validation
        this.validationService.validateSlugFormat(createItemDto.slug);
        this.validationService.validateItemContent(createItemDto);
        this.validationService.validateChoiceReferences(createItemDto.choices, createItemDto.correct);
        this.validationService.validateDifficultyParameters(
            createItemDto.difficulty,
            createItemDto.discrimination,
            createItemDto.guessing
        );
        this.validationService.validateTopicsAndJurisdictions(
            createItemDto.topics,
            createItemDto.jurisdictions
        );

        // Check if slug already exists
        const existingItem = await this.itemRepository.findOne({
            where: { slug: createItemDto.slug, isActive: true },
        });

        if (existingItem) {
            throw new ConflictException(`Item with slug '${createItemDto.slug}' already exists`);
        }

        const item = this.itemRepository.create({
            ...createItemDto,
            createdBy,
            version: 1,
            status: ItemStatus.DRAFT,
        });

        const savedItem = await this.itemRepository.save(item);
        this.logger.log(`Item created successfully: ${savedItem.id} with slug ${savedItem.slug}`);

        return savedItem;
    }

    async updateItem(
        id: string,
        updateItemDto: UpdateItemDto,
        _updatedBy: string,
    ): Promise<ItemWithVersion> {
        const existingItem = await this.itemRepository.findOne({
            where: { id, isActive: true },
            relations: ['mediaAssets'],
        });

        if (!existingItem) {
            throw new NotFoundException(`Item with ID '${id}' not found`);
        }

        // Validate updates
        const updateDto = updateItemDto as any;
        if (updateDto.choices || updateDto.correct) {
            const choices = updateDto.choices || existingItem.choices;
            const correct = updateDto.correct || existingItem.correct;
            this.validationService.validateChoiceReferences(choices, correct);
        }

        if (updateDto.difficulty !== undefined || updateDto.discrimination !== undefined || updateDto.guessing !== undefined) {
            this.validationService.validateDifficultyParameters(
                updateDto.difficulty,
                updateDto.discrimination,
                updateDto.guessing
            );
        }

        if (updateDto.topics || updateDto.jurisdictions) {
            const topics = updateDto.topics || existingItem.topics;
            const jurisdictions = updateDto.jurisdictions || existingItem.jurisdictions;
            this.validationService.validateTopicsAndJurisdictions(topics, jurisdictions);
        }

        // Create a copy of the previous version for audit trail
        const previousVersion = { ...existingItem };
        delete previousVersion.id;

        // Update the item with versioning
        const updatedItem = await this.itemRepository.save({
            ...existingItem,
            ...updateItemDto,
            version: existingItem.version + 1,
            updatedAt: new Date(),
            // Reset workflow status if content changes
            status: this.shouldResetStatus(updateItemDto) ? ItemStatus.DRAFT : existingItem.status,
            reviewedBy: this.shouldResetStatus(updateItemDto) ? null : existingItem.reviewedBy,
            approvedBy: this.shouldResetStatus(updateItemDto) ? null : existingItem.approvedBy,
        });

        return {
            ...updatedItem,
            previousVersion: existingItem,
        };
    }

    async getItem(id: string, includeInactive = false): Promise<Item> {
        const whereCondition: any = { id };
        if (!includeInactive) {
            whereCondition.isActive = true;
        }

        const item = await this.itemRepository.findOne({
            where: whereCondition,
            relations: ['mediaAssets'],
        });

        if (!item) {
            throw new NotFoundException(`Item with ID '${id}' not found`);
        }

        return item;
    }

    async getItemBySlug(slug: string, includeInactive = false): Promise<Item> {
        const whereCondition: any = { slug };
        if (!includeInactive) {
            whereCondition.isActive = true;
        }

        const item = await this.itemRepository.findOne({
            where: whereCondition,
            relations: ['mediaAssets'],
        });

        if (!item) {
            throw new NotFoundException(`Item with slug '${slug}' not found`);
        }

        return item;
    }

    async queryItems(queryDto: QueryItemsDto): Promise<PaginatedResult<Item>> {
        const queryBuilder = this.createQueryBuilder(queryDto);

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const offset = (queryDto.page - 1) * queryDto.limit;
        queryBuilder.skip(offset).take(queryDto.limit);

        // Apply sorting
        const sortField = this.validateSortField(queryDto.sortBy);
        queryBuilder.orderBy(`item.${sortField}`, queryDto.sortOrder);

        const items = await queryBuilder.getMany();

        return {
            items,
            total,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(total / queryDto.limit),
        };
    }

    async searchItems(searchQuery: string, filters?: Partial<QueryItemsDto>): Promise<Item[]> {
        const queryBuilder = this.itemRepository
            .createQueryBuilder('item')
            .where('item.isActive = :isActive', { isActive: true });

        // Full-text search
        if (searchQuery) {
            queryBuilder.andWhere(
                'item.searchVector @@ plainto_tsquery(:search)',
                { search: searchQuery }
            );
        }

        // Apply additional filters
        if (filters) {
            this.applyFilters(queryBuilder, filters);
        }

        // Order by relevance for search
        if (searchQuery) {
            queryBuilder.orderBy(
                'ts_rank(item.searchVector, plainto_tsquery(:search))',
                'DESC'
            );
        }

        return await queryBuilder.limit(50).getMany();
    }

    async deleteItem(id: string): Promise<void> {
        await this.getItem(id); // Verify item exists

        // Soft delete
        await this.itemRepository.update(id, {
            isActive: false,
            updatedAt: new Date(),
        });
    }

    async uploadMedia(
        itemId: string,
        file: Express.Multer.File,
        uploadDto: UploadMediaDto,
        options: MediaUploadOptions = {}
    ): Promise<MediaAssetWithUrls> {
        // Verify item exists
        await this.getItem(itemId);

        // Validate media metadata
        this.validationService.validateMediaMetadata(uploadDto.mediaType, {
            width: uploadDto.width,
            height: uploadDto.height,
            duration: uploadDto.duration,
            alt: uploadDto.alt,
            caption: uploadDto.caption,
        });

        // Prepare metadata
        const metadata = {
            alt: uploadDto.alt,
            caption: uploadDto.caption,
            width: uploadDto.width,
            height: uploadDto.height,
            duration: uploadDto.duration,
        };

        // Use the enhanced media asset service
        return await this.mediaAssetService.uploadMediaAsset(
            itemId,
            file,
            uploadDto.mediaType,
            metadata,
            {
                generateThumbnail: true,
                generateResponsiveVersions: uploadDto.mediaType === MediaType.IMAGE,
                processVideo: uploadDto.mediaType === MediaType.VIDEO,
                processAudio: uploadDto.mediaType === MediaType.AUDIO,
                quality: 'high',
                ...options,
            }
        );
    }

    async getMediaAsset(id: string): Promise<MediaAsset> {
        const media = await this.mediaRepository.findOne({
            where: { id, isActive: true },
            relations: ['item'],
        });

        if (!media) {
            throw new NotFoundException(`Media asset with ID '${id}' not found`);
        }

        return media;
    }

    async deleteMediaAsset(id: string): Promise<void> {
        const media = await this.getMediaAsset(id);

        try {
            // Delete from S3
            await this.s3Service.deleteFile(media.s3Key, media.s3Bucket);

            // Soft delete from database
            await this.mediaRepository.update(id, {
                isActive: false,
                updatedAt: new Date(),
            });

            this.logger.log(`Media asset deleted successfully: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to delete media asset ${id}:`, error);
            throw new BadRequestException(`Failed to delete media asset: ${error.message}`);
        }
    }

    async getMediaSignedUrl(
        id: string,
        expiresIn: number = 3600,
        download: boolean = false,
    ): Promise<string> {
        return await this.mediaAssetService.getSignedUrl(id, expiresIn, download);
    }

    async getMediaAssetWithUrls(id: string): Promise<MediaAssetWithUrls> {
        return await this.mediaAssetService.getMediaAsset(id);
    }

    async updateMediaAsset(
        id: string,
        updates: Partial<MediaAsset>
    ): Promise<MediaAssetWithUrls> {
        return await this.mediaAssetService.updateMediaAsset(id, updates);
    }

    async duplicateMediaAsset(id: string, newItemId: string): Promise<MediaAssetWithUrls> {
        return await this.mediaAssetService.duplicateMediaAsset(id, newItemId);
    }

    async getMediaAssetsByItem(itemId: string): Promise<MediaAssetWithUrls[]> {
        return await this.mediaAssetService.getMediaAssetsByItem(itemId);
    }

    async getMediaStorageStatistics(): Promise<any> {
        return await this.mediaAssetService.getStorageStatistics();
    }

    async cleanupInactiveMedia(): Promise<any> {
        return await this.mediaAssetService.cleanupInactiveAssets();
    }

    private createQueryBuilder(queryDto: QueryItemsDto): SelectQueryBuilder<Item> {
        const queryBuilder = this.itemRepository
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.mediaAssets', 'media', 'media.isActive = :mediaActive', { mediaActive: true });

        // Base filter for active items
        if (!queryDto.includeInactive) {
            queryBuilder.where('item.isActive = :isActive', { isActive: true });
        }

        this.applyFilters(queryBuilder, queryDto);

        return queryBuilder;
    }

    private applyFilters(queryBuilder: SelectQueryBuilder<Item>, filters: Partial<QueryItemsDto>): void {
        if (filters.status) {
            queryBuilder.andWhere('item.status = :status', { status: filters.status });
        }

        if (filters.itemType) {
            queryBuilder.andWhere('item.itemType = :itemType', { itemType: filters.itemType });
        }

        if (filters.cognitiveLevel) {
            queryBuilder.andWhere('item.cognitiveLevel = :cognitiveLevel', {
                cognitiveLevel: filters.cognitiveLevel
            });
        }

        if (filters.topics && filters.topics.length > 0) {
            queryBuilder.andWhere('item.topics && :topics', { topics: filters.topics });
        }

        if (filters.jurisdictions && filters.jurisdictions.length > 0) {
            queryBuilder.andWhere('item.jurisdictions && :jurisdictions', {
                jurisdictions: filters.jurisdictions
            });
        }

        if (filters.tags && filters.tags.length > 0) {
            queryBuilder.andWhere('item.tags && :tags', { tags: filters.tags });
        }

        if (filters.minDifficulty !== undefined) {
            queryBuilder.andWhere('item.difficulty >= :minDifficulty', {
                minDifficulty: filters.minDifficulty
            });
        }

        if (filters.maxDifficulty !== undefined) {
            queryBuilder.andWhere('item.difficulty <= :maxDifficulty', {
                maxDifficulty: filters.maxDifficulty
            });
        }

        if (filters.createdBy) {
            queryBuilder.andWhere('item.createdBy = :createdBy', { createdBy: filters.createdBy });
        }

        if (filters.search) {
            queryBuilder.andWhere(
                'item.searchVector @@ plainto_tsquery(:search)',
                { search: filters.search }
            );
        }
    }

    private validateSortField(sortBy: string): string {
        const allowedFields = [
            'createdAt',
            'updatedAt',
            'publishedAt',
            'difficulty',
            'estimatedTime',
            'points',
            'version',
            'status',
        ];

        return allowedFields.includes(sortBy) ? sortBy : 'createdAt';
    }

    async getItemVersionHistory(id: string): Promise<Item[]> {
        // This would require a separate versions table in a full implementation
        // For now, we'll return the current item only
        const item = await this.getItem(id);
        return [item];
    }

    async revertToVersion(_id: string, _version: number): Promise<Item> {
        // In a full implementation, this would restore from a versions table
        // For now, we'll throw an error indicating this needs implementation
        throw new BadRequestException('Version revert functionality requires version history table');
    }

    async duplicateItem(id: string, newSlug: string, createdBy: string): Promise<Item> {
        const originalItem = await this.getItem(id);

        // Check if new slug already exists
        const existingItem = await this.itemRepository.findOne({
            where: { slug: newSlug, isActive: true },
        });

        if (existingItem) {
            throw new ConflictException(`Item with slug '${newSlug}' already exists`);
        }

        // Create duplicate
        const duplicateItem = this.itemRepository.create({
            ...originalItem,
            id: undefined, // Let TypeORM generate new ID
            slug: newSlug,
            version: 1,
            status: ItemStatus.DRAFT,
            createdBy,
            reviewedBy: null,
            approvedBy: null,
            publishedAt: null,
            createdAt: undefined,
            updatedAt: undefined,
        });

        const savedItem = await this.itemRepository.save(duplicateItem);
        this.logger.log(`Item duplicated successfully: ${originalItem.id} -> ${savedItem.id}`);

        return savedItem;
    }

    private shouldResetStatus(updateDto: UpdateItemDto): boolean {
        // Reset status to draft if content-related fields are updated
        const contentFields = [
            'content',
            'choices',
            'correct',
            'explanation',
            'difficulty',
            'discrimination',
            'guessing',
        ];

        return contentFields.some(field => updateDto[field] !== undefined);
    }

    // Workflow Management Methods

    async submitForReview(
        itemId: string,
        submitDto: SubmitForReviewDto,
        submittedBy: string,
    ): Promise<Item> {
        const item = await this.getItem(itemId);

        // Validate current status
        if (item.status !== ItemStatus.DRAFT) {
            throw new BadRequestException(
                `Item must be in draft status to submit for review. Current status: ${item.status}`
            );
        }

        // Validate item is complete enough for review
        this.validateItemForReview(item);

        const previousStatus = item.status;

        // Update item status
        const updatedItem = await this.itemRepository.save({
            ...item,
            status: ItemStatus.UNDER_REVIEW,
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.SUBMITTED_FOR_REVIEW,
            submittedBy,
            previousStatus,
            ItemStatus.UNDER_REVIEW,
            submitDto.message,
        );

        // Send notifications
        await this.notificationService.notifyStatusChange(
            updatedItem,
            WorkflowAction.SUBMITTED_FOR_REVIEW,
            previousStatus,
            submittedBy,
            submitDto.message,
        );

        this.logger.log(`Item ${itemId} submitted for review by ${submittedBy}`);
        return updatedItem;
    }

    async assignReviewer(
        itemId: string,
        assignDto: AssignReviewerDto,
        assignedBy: string,
    ): Promise<Item> {
        const item = await this.getItem(itemId);

        // Validate current status
        if (item.status !== ItemStatus.UNDER_REVIEW) {
            throw new BadRequestException(
                `Item must be under review to assign reviewer. Current status: ${item.status}`
            );
        }

        // Update reviewer assignment
        const updatedItem = await this.itemRepository.save({
            ...item,
            reviewedBy: assignDto.reviewerId,
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.ASSIGNED_REVIEWER,
            assignedBy,
            item.status,
            item.status,
            assignDto.message,
            { reviewerId: assignDto.reviewerId },
        );

        // Send notification to assigned reviewer
        await this.notificationService.notifyReviewAssignment(
            updatedItem,
            assignDto.reviewerId,
            assignedBy,
            assignDto.message,
        );

        this.logger.log(`Reviewer ${assignDto.reviewerId} assigned to item ${itemId} by ${assignedBy}`);
        return updatedItem;
    }

    async reviewItem(
        itemId: string,
        reviewDto: ReviewItemDto,
        reviewedBy: string,
    ): Promise<Item> {
        const item = await this.getItem(itemId);

        // Validate current status
        if (item.status !== ItemStatus.UNDER_REVIEW) {
            throw new BadRequestException(
                `Item must be under review to complete review. Current status: ${item.status}`
            );
        }

        // Validate reviewer authorization (if assigned)
        if (item.reviewedBy && item.reviewedBy !== reviewedBy) {
            throw new ForbiddenException(
                `Only the assigned reviewer can review this item. Assigned to: ${item.reviewedBy}`
            );
        }

        const previousStatus = item.status;
        const newStatus = reviewDto.decision;

        // Update item based on review decision
        const updateData: Partial<Item> = {
            status: newStatus,
            reviewedBy: reviewedBy,
            updatedAt: new Date(),
        };

        if (newStatus === ItemStatus.APPROVED) {
            updateData.approvedBy = reviewedBy;
        } else {
            // If rejected, reset approval
            updateData.approvedBy = null;
        }

        const updatedItem = await this.itemRepository.save({
            ...item,
            ...updateData,
        });

        // Record workflow history
        const action = newStatus === ItemStatus.APPROVED ? WorkflowAction.APPROVED : WorkflowAction.REJECTED;
        await this.recordWorkflowAction(
            itemId,
            action,
            reviewedBy,
            previousStatus,
            newStatus,
            reviewDto.comments,
            { suggestedChanges: reviewDto.suggestedChanges },
        );

        // Send notifications
        await this.notificationService.notifyStatusChange(
            updatedItem,
            action,
            previousStatus,
            reviewedBy,
            reviewDto.comments,
        );

        this.logger.log(`Item ${itemId} ${action} by ${reviewedBy}`);
        return updatedItem;
    }

    async publishItem(
        itemId: string,
        publishDto: PublishItemDto,
        publishedBy: string,
    ): Promise<Item> {
        const item = await this.getItem(itemId);

        // Validate current status
        if (item.status !== ItemStatus.APPROVED) {
            throw new BadRequestException(
                `Item must be approved to publish. Current status: ${item.status}`
            );
        }

        const previousStatus = item.status;
        const publishedAt = publishDto.scheduledAt ? new Date(publishDto.scheduledAt) : new Date();

        // Update item status
        const updatedItem = await this.itemRepository.save({
            ...item,
            status: ItemStatus.PUBLISHED,
            publishedAt,
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.PUBLISHED,
            publishedBy,
            previousStatus,
            ItemStatus.PUBLISHED,
            publishDto.notes,
            { scheduledAt: publishedAt.toISOString() },
        );

        // Send notifications
        await this.notificationService.notifyStatusChange(
            updatedItem,
            WorkflowAction.PUBLISHED,
            previousStatus,
            publishedBy,
            publishDto.notes,
        );

        this.logger.log(`Item ${itemId} published by ${publishedBy} at ${publishedAt}`);
        return updatedItem;
    }

    async archiveItem(itemId: string, archivedBy: string, reason?: string): Promise<Item> {
        const item = await this.getItem(itemId);

        const previousStatus = item.status;

        // Update item status
        const updatedItem = await this.itemRepository.save({
            ...item,
            status: ItemStatus.ARCHIVED,
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.ARCHIVED,
            archivedBy,
            previousStatus,
            ItemStatus.ARCHIVED,
            reason,
        );

        // Send notifications
        await this.notificationService.notifyStatusChange(
            updatedItem,
            WorkflowAction.ARCHIVED,
            previousStatus,
            archivedBy,
            reason,
        );

        this.logger.log(`Item ${itemId} archived by ${archivedBy}`);
        return updatedItem;
    }

    async restoreItem(itemId: string, restoredBy: string, reason?: string): Promise<Item> {
        const item = await this.getItem(itemId, true); // Include inactive items

        if (item.status !== ItemStatus.ARCHIVED) {
            throw new BadRequestException(
                `Only archived items can be restored. Current status: ${item.status}`
            );
        }

        const previousStatus = item.status;

        // Restore to draft status for re-review
        const updatedItem = await this.itemRepository.save({
            ...item,
            status: ItemStatus.DRAFT,
            reviewedBy: null,
            approvedBy: null,
            publishedAt: null,
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.RESTORED,
            restoredBy,
            previousStatus,
            ItemStatus.DRAFT,
            reason,
        );

        // Send notifications
        await this.notificationService.notifyStatusChange(
            updatedItem,
            WorkflowAction.RESTORED,
            previousStatus,
            restoredBy,
            reason,
        );

        this.logger.log(`Item ${itemId} restored by ${restoredBy}`);
        return updatedItem;
    }

    async getWorkflowHistory(itemId: string): Promise<WorkflowHistoryEntry[]> {
        const history = await this.workflowHistoryRepository.find({
            where: { itemId },
            order: { createdAt: 'DESC' },
        });

        return history.map(entry => ({
            action: entry.action,
            performedBy: entry.performedBy,
            timestamp: entry.createdAt,
            previousStatus: entry.previousStatus,
            newStatus: entry.newStatus,
            comments: entry.comments,
            metadata: entry.metadata,
        }));
    }

    async bulkWorkflowOperation(
        bulkDto: BulkWorkflowDto,
        performedBy: string,
    ): Promise<BulkWorkflowResult> {
        const result: BulkWorkflowResult = {
            successful: [],
            failed: [],
            totalProcessed: bulkDto.itemIds.length,
            successCount: 0,
            failureCount: 0,
        };

        for (const itemId of bulkDto.itemIds) {
            try {
                switch (bulkDto.action) {
                    case 'submit_for_review':
                        await this.submitForReview(itemId, { message: bulkDto.comments }, performedBy);
                        break;
                    case 'approve':
                        await this.reviewItem(
                            itemId,
                            {
                                decision: ItemStatus.APPROVED,
                                comments: bulkDto.comments || 'Bulk approval',
                            },
                            performedBy,
                        );
                        break;
                    case 'reject':
                        await this.reviewItem(
                            itemId,
                            {
                                decision: ItemStatus.DRAFT,
                                comments: bulkDto.comments || 'Bulk rejection',
                            },
                            performedBy,
                        );
                        break;
                    case 'publish':
                        await this.publishItem(itemId, { notes: bulkDto.comments }, performedBy);
                        break;
                    case 'archive':
                        await this.archiveItem(itemId, performedBy, bulkDto.comments);
                        break;
                    default:
                        throw new BadRequestException(`Unsupported bulk action: ${bulkDto.action}`);
                }

                result.successful.push(itemId);
                result.successCount++;
            } catch (error) {
                result.failed.push({
                    itemId,
                    error: error.message,
                });
                result.failureCount++;
                this.logger.error(`Bulk operation failed for item ${itemId}: ${error.message}`);
            }
        }

        this.logger.log(
            `Bulk ${bulkDto.action} completed: ${result.successCount} successful, ${result.failureCount} failed`
        );

        return result;
    }

    async rollbackToVersion(itemId: string, targetVersion: number, performedBy: string): Promise<Item> {
        // In a full implementation, this would restore from a versions table
        // For now, we'll implement a basic rollback that resets to draft
        const item = await this.getItem(itemId);

        if (targetVersion >= item.version) {
            throw new BadRequestException(
                `Target version ${targetVersion} must be less than current version ${item.version}`
            );
        }

        const previousStatus = item.status;

        // Reset to draft for re-review after rollback
        const updatedItem = await this.itemRepository.save({
            ...item,
            status: ItemStatus.DRAFT,
            reviewedBy: null,
            approvedBy: null,
            publishedAt: null,
            version: item.version + 1, // Increment version for the rollback
            updatedAt: new Date(),
        });

        // Record workflow history
        await this.recordWorkflowAction(
            itemId,
            WorkflowAction.UPDATED,
            performedBy,
            previousStatus,
            ItemStatus.DRAFT,
            `Rolled back to version ${targetVersion}`,
            { targetVersion, rollback: true },
        );

        this.logger.log(`Item ${itemId} rolled back to version ${targetVersion} by ${performedBy}`);
        return updatedItem;
    }

    private async recordWorkflowAction(
        itemId: string,
        action: WorkflowAction,
        performedBy: string,
        previousStatus: ItemStatus,
        newStatus: ItemStatus,
        comments?: string,
        metadata?: Record<string, any>,
    ): Promise<void> {
        const workflowEntry = this.workflowHistoryRepository.create({
            itemId,
            action,
            performedBy,
            previousStatus,
            newStatus,
            comments,
            metadata,
        });

        await this.workflowHistoryRepository.save(workflowEntry);
    }

    private validateItemForReview(item: Item): void {
        const errors: string[] = [];

        // Check required content
        if (!item.content?.text?.trim()) {
            errors.push('Item must have question text');
        }

        if (!item.choices || item.choices.length < 2) {
            errors.push('Item must have at least 2 choices');
        }

        if (!item.correct?.choiceIds?.length) {
            errors.push('Item must have correct answer(s) specified');
        }

        if (!item.topics || item.topics.length === 0) {
            errors.push('Item must have at least one topic assigned');
        }

        if (!item.jurisdictions || item.jurisdictions.length === 0) {
            errors.push('Item must have at least one jurisdiction assigned');
        }

        // Validate choice references
        if (item.choices && item.correct?.choiceIds) {
            const choiceIds = item.choices.map(c => c.id);
            const invalidRefs = item.correct.choiceIds.filter(id => !choiceIds.includes(id));
            if (invalidRefs.length > 0) {
                errors.push(`Invalid choice references: ${invalidRefs.join(', ')}`);
            }
        }

        if (errors.length > 0) {
            throw new BadRequestException(
                `Item is not ready for review: ${errors.join('; ')}`
            );
        }
    }
}