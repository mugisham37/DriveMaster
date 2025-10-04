import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, DataSource } from 'typeorm';
import { Item, ItemStatus } from './entities/item.entity';
import { MediaAsset, MediaType } from './entities/media-asset.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { S3Service } from '../services/s3.service';
import { ValidationService } from '../services/validation.service';

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
        private readonly dataSource: DataSource,
        private readonly s3Service: S3Service,
        private readonly validationService: ValidationService,
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
        updatedBy: string,
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
        const item = await this.getItem(id);

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
    ): Promise<MediaAsset> {
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

        // Generate S3 key
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const s3Key = `items/${itemId}/media/${timestamp}-${uploadDto.mediaType}.${fileExtension}`;

        try {
            // Upload to S3
            const uploadResult = await this.s3Service.uploadFile(
                s3Key,
                file.buffer,
                file.mimetype,
            );

            // Create media asset record
            const mediaAsset = this.mediaRepository.create({
                itemId,
                filename: file.filename,
                originalName: file.originalname,
                mediaType: uploadDto.mediaType,
                mimeType: file.mimetype,
                size: file.size,
                s3Key: uploadResult.key,
                s3Bucket: uploadResult.bucket,
                cdnUrl: uploadResult.url,
                metadata: {
                    alt: uploadDto.alt,
                    caption: uploadDto.caption,
                    width: uploadDto.width,
                    height: uploadDto.height,
                    duration: uploadDto.duration,
                },
            });

            const savedAsset = await this.mediaRepository.save(mediaAsset);
            this.logger.log(`Media asset uploaded successfully: ${savedAsset.id} for item ${itemId}`);

            return savedAsset;
        } catch (error) {
            this.logger.error(`Failed to upload media for item ${itemId}:`, error);
            throw new BadRequestException(`Failed to upload media: ${error.message}`);
        }
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
        const media = await this.getMediaAsset(id);

        const options = {
            expiresIn,
            responseContentType: media.mimeType,
        };

        if (download) {
            options['responseContentDisposition'] = `attachment; filename="${media.originalName}"`;
        }

        return await this.s3Service.getSignedUrl(media.s3Key, options, media.s3Bucket);
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

    async revertToVersion(id: string, version: number): Promise<Item> {
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
}