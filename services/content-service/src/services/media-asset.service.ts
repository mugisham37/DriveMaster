import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaAsset, MediaType } from '../content/entities/media-asset.entity';
import { S3Service } from './s3.service';
import { MediaProcessingService, ProcessedMedia } from './media-processing.service';
import { CDNService } from './cdn.service';
import { ConfigService } from '@nestjs/config';

export interface MediaUploadOptions {
    generateThumbnail?: boolean;
    generateResponsiveVersions?: boolean;
    processVideo?: boolean;
    processAudio?: boolean;
    quality?: 'low' | 'medium' | 'high';
}

export interface MediaAssetWithUrls extends MediaAsset {
    urls: {
        original: string;
        large?: string;
        medium?: string;
        small?: string;
        thumbnail?: string;
        webp_large?: string;
        webp_medium?: string;
    };
    signedUrl?: string;
}

export interface MediaCleanupResult {
    deletedAssets: number;
    deletedFiles: number;
    errors: string[];
    totalSizeFreed: number;
}

@Injectable()
export class MediaAssetService {
    private readonly logger = new Logger(MediaAssetService.name);
    private readonly retentionDays: number;
    private readonly enableAutoCleanup: boolean;

    constructor(
        @InjectRepository(MediaAsset)
        private readonly mediaRepository: Repository<MediaAsset>,
        private readonly dataSource: DataSource,
        private readonly s3Service: S3Service,
        private readonly mediaProcessingService: MediaProcessingService,
        private readonly cdnService: CDNService,
        private readonly configService: ConfigService,
    ) {
        this.retentionDays = this.configService.get('MEDIA_RETENTION_DAYS', 365);
        this.enableAutoCleanup = this.configService.get('ENABLE_AUTO_CLEANUP', true);
    }

    async uploadMediaAsset(
        itemId: string,
        file: Express.Multer.File,
        mediaType: MediaType,
        metadata: any = {},
        options: MediaUploadOptions = {}
    ): Promise<MediaAssetWithUrls> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Process the media file
            const processedMedia = await this.mediaProcessingService.processMedia(
                file.buffer,
                file.mimetype,
                mediaType,
                {
                    generateThumbnail: options.generateThumbnail,
                    quality: options.quality,
                    ...metadata,
                }
            );

            // Generate S3 keys
            const timestamp = Date.now();
            const fileExtension = file.originalname.split('.').pop();
            const baseKey = `items/${itemId}/media/${timestamp}`;
            const mainKey = `${baseKey}.${fileExtension}`;

            // Upload main file
            const mainUpload = await this.s3Service.uploadFile(
                mainKey,
                processedMedia.processed || processedMedia.original,
                processedMedia.metadata.mimeType
            );

            // Create media asset record
            const mediaAsset = queryRunner.manager.create(MediaAsset, {
                itemId,
                filename: file.filename || `${timestamp}.${fileExtension}`,
                originalName: file.originalname,
                mediaType,
                mimeType: processedMedia.metadata.mimeType,
                size: processedMedia.metadata.size,
                s3Key: mainUpload.key,
                s3Bucket: mainUpload.bucket,
                cdnUrl: this.cdnService.generateCDNUrl(mainUpload.key),
                metadata: {
                    ...processedMedia.metadata,
                    ...metadata,
                },
                version: 1,
            });

            const savedAsset = await queryRunner.manager.save(MediaAsset, mediaAsset);

            // Upload additional versions if requested
            const uploadPromises: Promise<any>[] = [];

            if (options.generateResponsiveVersions && mediaType === MediaType.IMAGE) {
                const versions = await this.mediaProcessingService.generateOptimizedVersions(
                    file.buffer,
                    file.mimetype,
                    mediaType
                );

                for (const [versionName, versionBuffer] of Object.entries(versions)) {
                    const versionKey = `${baseKey}_${versionName}.${versionName.includes('webp') ? 'webp' : fileExtension}`;
                    uploadPromises.push(
                        this.s3Service.uploadFile(
                            versionKey,
                            versionBuffer,
                            versionName.includes('webp') ? 'image/webp' : processedMedia.metadata.mimeType
                        )
                    );
                }
            }

            // Upload thumbnail if generated
            if (processedMedia.thumbnail) {
                const thumbnailKey = `${baseKey}_thumbnail.jpg`;
                uploadPromises.push(
                    this.s3Service.uploadFile(thumbnailKey, processedMedia.thumbnail, 'image/jpeg')
                );
            }

            // Wait for all uploads to complete
            await Promise.all(uploadPromises);

            await queryRunner.commitTransaction();

            this.logger.log(`Media asset uploaded successfully: ${savedAsset.id} for item ${itemId}`);

            // Return asset with URLs
            return this.enrichWithUrls(savedAsset);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to upload media asset for item ${itemId}:`, error);
            throw new BadRequestException(`Failed to upload media asset: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }

    async getMediaAsset(id: string, includeInactive = false): Promise<MediaAssetWithUrls> {
        const whereCondition: any = { id };
        if (!includeInactive) {
            whereCondition.isActive = true;
        }

        const asset = await this.mediaRepository.findOne({
            where: whereCondition,
            relations: ['item'],
        });

        if (!asset) {
            throw new NotFoundException(`Media asset with ID '${id}' not found`);
        }

        return this.enrichWithUrls(asset);
    }

    async updateMediaAsset(
        id: string,
        updates: Partial<MediaAsset>
    ): Promise<MediaAssetWithUrls> {
        const asset = await this.getMediaAsset(id);

        // Create new version if content is being updated
        const shouldVersion = updates.metadata || updates.s3Key;
        const newVersion = shouldVersion ? asset.version + 1 : asset.version;

        const updatedAsset = await this.mediaRepository.save({
            ...asset,
            ...updates,
            version: newVersion,
            updatedAt: new Date(),
        });

        // Invalidate CDN cache if URL changed
        if (updates.s3Key || updates.cdnUrl) {
            await this.cdnService.invalidateCache([asset.s3Key]);
        }

        this.logger.log(`Media asset updated: ${id}, version: ${newVersion}`);

        return this.enrichWithUrls(updatedAsset);
    }

    async deleteMediaAsset(id: string, permanent = false): Promise<void> {
        const asset = await this.getMediaAsset(id, true);

        if (permanent) {
            // Permanently delete from S3 and database
            await this.deleteFromS3(asset);
            await this.mediaRepository.delete(id);
            this.logger.log(`Media asset permanently deleted: ${id}`);
        } else {
            // Soft delete
            await this.mediaRepository.update(id, {
                isActive: false,
                updatedAt: new Date(),
            });
            this.logger.log(`Media asset soft deleted: ${id}`);
        }

        // Invalidate CDN cache
        await this.cdnService.invalidateCache([asset.s3Key]);
    }

    async getSignedUrl(
        id: string,
        expiresIn: number = 3600,
        download = false
    ): Promise<string> {
        const asset = await this.getMediaAsset(id);

        const options = {
            expiresIn,
            responseContentType: asset.mimeType,
        };

        if (download) {
            options['responseContentDisposition'] = `attachment; filename="${asset.originalName}"`;
        }

        return await this.s3Service.getSignedUrl(asset.s3Key, options, asset.s3Bucket);
    }

    async duplicateMediaAsset(id: string, newItemId: string): Promise<MediaAssetWithUrls> {
        const originalAsset = await this.getMediaAsset(id);

        // Generate new S3 key for the duplicate
        const timestamp = Date.now();
        const fileExtension = originalAsset.originalName.split('.').pop();
        const newKey = `items/${newItemId}/media/${timestamp}.${fileExtension}`;

        // Copy file in S3 (this would need to be implemented in S3Service)
        // For now, we'll assume the file is copied

        const duplicateAsset = this.mediaRepository.create({
            ...originalAsset,
            id: undefined, // Let TypeORM generate new ID
            itemId: newItemId,
            s3Key: newKey,
            cdnUrl: this.cdnService.generateCDNUrl(newKey),
            version: 1,
            createdAt: undefined,
            updatedAt: undefined,
        });

        const savedAsset = await this.mediaRepository.save(duplicateAsset);
        this.logger.log(`Media asset duplicated: ${id} -> ${savedAsset.id}`);

        return this.enrichWithUrls(savedAsset);
    }

    async getMediaAssetsByItem(itemId: string): Promise<MediaAssetWithUrls[]> {
        const assets = await this.mediaRepository.find({
            where: { itemId, isActive: true },
            order: { createdAt: 'ASC' },
        });

        return Promise.all(assets.map(asset => this.enrichWithUrls(asset)));
    }

    async getMediaAssetVersions(id: string): Promise<MediaAsset[]> {
        const asset = await this.getMediaAsset(id);

        // In a full implementation, this would query a versions table
        // For now, return just the current version
        return [asset];
    }

    async revertToVersion(id: string, version: number): Promise<MediaAssetWithUrls> {
        // In a full implementation, this would restore from a versions table
        throw new BadRequestException('Version revert functionality requires version history table');
    }

    // Cleanup and maintenance methods

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async performScheduledCleanup(): Promise<void> {
        if (!this.enableAutoCleanup) {
            return;
        }

        this.logger.log('Starting scheduled media cleanup');

        try {
            const result = await this.cleanupInactiveAssets();
            this.logger.log(`Scheduled cleanup completed: ${JSON.stringify(result)}`);
        } catch (error) {
            this.logger.error('Scheduled cleanup failed:', error);
        }
    }

    async cleanupInactiveAssets(): Promise<MediaCleanupResult> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

        const inactiveAssets = await this.mediaRepository.find({
            where: {
                isActive: false,
                updatedAt: LessThan(cutoffDate),
            },
        });

        const result: MediaCleanupResult = {
            deletedAssets: 0,
            deletedFiles: 0,
            errors: [],
            totalSizeFreed: 0,
        };

        for (const asset of inactiveAssets) {
            try {
                // Delete from S3
                await this.deleteFromS3(asset);
                result.deletedFiles++;
                result.totalSizeFreed += asset.size;

                // Delete from database
                await this.mediaRepository.delete(asset.id);
                result.deletedAssets++;

                this.logger.debug(`Cleaned up media asset: ${asset.id}`);
            } catch (error) {
                result.errors.push(`Failed to cleanup ${asset.id}: ${error.message}`);
                this.logger.error(`Failed to cleanup media asset ${asset.id}:`, error);
            }
        }

        this.logger.log(`Cleanup completed: ${result.deletedAssets} assets, ${result.deletedFiles} files, ${result.totalSizeFreed} bytes freed`);

        return result;
    }

    async cleanupOrphanedFiles(): Promise<MediaCleanupResult> {
        // This would require listing S3 files and comparing with database records
        // Implementation depends on specific requirements and S3 bucket structure
        this.logger.log('Orphaned file cleanup not yet implemented');

        return {
            deletedAssets: 0,
            deletedFiles: 0,
            errors: ['Orphaned file cleanup not implemented'],
            totalSizeFreed: 0,
        };
    }

    private async enrichWithUrls(asset: MediaAsset): Promise<MediaAssetWithUrls> {
        const urls = this.cdnService.generateResponsiveUrls(asset.s3Key, asset.version.toString());

        return {
            ...asset,
            urls,
        };
    }

    private async deleteFromS3(asset: MediaAsset): Promise<void> {
        try {
            // Delete main file
            await this.s3Service.deleteFile(asset.s3Key, asset.s3Bucket);

            // Delete related files (thumbnails, versions)
            const baseKey = asset.s3Key.replace(/\.[^/.]+$/, '');
            const relatedKeys = [
                `${baseKey}_thumbnail.jpg`,
                `${baseKey}_large.jpg`,
                `${baseKey}_medium.jpg`,
                `${baseKey}_small.jpg`,
                `${baseKey}_webp_large.webp`,
                `${baseKey}_webp_medium.webp`,
            ];

            // Delete related files (ignore errors for non-existent files)
            await Promise.allSettled(
                relatedKeys.map(key => this.s3Service.deleteFile(key, asset.s3Bucket))
            );

            // Invalidate CDN cache
            await this.cdnService.invalidateCache([asset.s3Key, ...relatedKeys]);

        } catch (error) {
            this.logger.error(`Failed to delete S3 files for asset ${asset.id}:`, error);
            throw error;
        }
    }

    async getStorageStatistics(): Promise<{
        totalAssets: number;
        totalSize: number;
        activeAssets: number;
        inactiveAssets: number;
        byMediaType: { [key: string]: { count: number; size: number } };
    }> {
        const stats = await this.mediaRepository
            .createQueryBuilder('asset')
            .select([
                'COUNT(*) as total_assets',
                'SUM(asset.size) as total_size',
                'COUNT(CASE WHEN asset.isActive = true THEN 1 END) as active_assets',
                'COUNT(CASE WHEN asset.isActive = false THEN 1 END) as inactive_assets',
            ])
            .getRawOne();

        const typeStats = await this.mediaRepository
            .createQueryBuilder('asset')
            .select([
                'asset.mediaType as media_type',
                'COUNT(*) as count',
                'SUM(asset.size) as size',
            ])
            .where('asset.isActive = :active', { active: true })
            .groupBy('asset.mediaType')
            .getRawMany();

        const byMediaType: { [key: string]: { count: number; size: number } } = {};
        typeStats.forEach(stat => {
            byMediaType[stat.media_type] = {
                count: parseInt(stat.count),
                size: parseInt(stat.size) || 0,
            };
        });

        return {
            totalAssets: parseInt(stats.total_assets) || 0,
            totalSize: parseInt(stats.total_size) || 0,
            activeAssets: parseInt(stats.active_assets) || 0,
            inactiveAssets: parseInt(stats.inactive_assets) || 0,
            byMediaType,
        };
    }
}