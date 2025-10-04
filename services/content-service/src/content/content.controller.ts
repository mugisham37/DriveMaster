import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseInterceptors,
    UploadedFile,
    ParseUUIDPipe,
    HttpStatus,
    HttpCode,
    UseGuards,
    Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiConsumes,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { ContentService, PaginatedResult } from './content.service';
import { Item } from './entities/item.entity';
import { MediaAsset } from './entities/media-asset.entity';
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
import { RolesGuard, UserRole } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Content Management')
@Controller('content')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class ContentController {
    constructor(private readonly contentService: ContentService) { }

    @Post('items')
    @ApiOperation({ summary: 'Create a new content item' })
    @ApiResponse({ status: 201, description: 'Item created successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 409, description: 'Item with slug already exists' })
    async createItem(
        @Body() createItemDto: CreateItemDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        // Temporary: use hardcoded user ID until auth is integrated
        const createdBy = 'temp-user-id';
        return await this.contentService.createItem(createItemDto, createdBy);
    }

    @Get('items')
    @ApiOperation({ summary: 'Query content items with filtering and pagination' })
    @ApiResponse({
        status: 200,
        description: 'Items retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
            },
        },
    })
    async queryItems(@Query() queryDto: QueryItemsDto): Promise<PaginatedResult<Item>> {
        return await this.contentService.queryItems(queryDto);
    }

    @Get('items/search')
    @ApiOperation({ summary: 'Full-text search for content items' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    @ApiResponse({ status: 200, description: 'Search results', type: [Item] })
    async searchItems(
        @Query('q') searchQuery: string,
        @Query() filters: QueryItemsDto,
    ): Promise<Item[]> {
        return await this.contentService.searchItems(searchQuery, filters);
    }

    @Get('items/:id')
    @ApiOperation({ summary: 'Get content item by ID' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item retrieved successfully', type: Item })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async getItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('includeInactive') includeInactive?: boolean,
    ): Promise<Item> {
        return await this.contentService.getItem(id, includeInactive);
    }

    @Get('items/slug/:slug')
    @ApiOperation({ summary: 'Get content item by slug' })
    @ApiParam({ name: 'slug', description: 'Item slug' })
    @ApiResponse({ status: 200, description: 'Item retrieved successfully', type: Item })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async getItemBySlug(
        @Param('slug') slug: string,
        @Query('includeInactive') includeInactive?: boolean,
    ): Promise<Item> {
        return await this.contentService.getItemBySlug(slug, includeInactive);
    }

    @Put('items/:id')
    @ApiOperation({ summary: 'Update content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item updated successfully', type: Item })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    async updateItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateItemDto: UpdateItemDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        // Temporary: use hardcoded user ID until auth is integrated
        const updatedBy = 'temp-user-id';
        const result = await this.contentService.updateItem(id, updateItemDto, updatedBy);
        return result;
    }

    @Delete('items/:id')
    @ApiOperation({ summary: 'Soft delete content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 204, description: 'Item deleted successfully' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteItem(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.contentService.deleteItem(id);
    }

    @Post('items/:id/media')
    @ApiOperation({ summary: 'Upload media asset for content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Media uploaded successfully', type: MediaAsset })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadMedia(
        @Param('id', ParseUUIDPipe) itemId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadDto: UploadMediaDto,
    ): Promise<MediaAsset> {
        return await this.contentService.uploadMedia(itemId, file, uploadDto);
    }

    @Get('media/:id')
    @ApiOperation({ summary: 'Get media asset by ID' })
    @ApiParam({ name: 'id', description: 'Media asset UUID' })
    @ApiResponse({ status: 200, description: 'Media asset retrieved successfully', type: MediaAsset })
    @ApiResponse({ status: 404, description: 'Media asset not found' })
    async getMediaAsset(@Param('id', ParseUUIDPipe) id: string): Promise<MediaAsset> {
        return await this.contentService.getMediaAsset(id);
    }

    @Delete('media/:id')
    @ApiOperation({ summary: 'Delete media asset' })
    @ApiParam({ name: 'id', description: 'Media asset UUID' })
    @ApiResponse({ status: 204, description: 'Media asset deleted successfully' })
    @ApiResponse({ status: 404, description: 'Media asset not found' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMediaAsset(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.contentService.deleteMediaAsset(id);
    }

    @Get('media/:id/signed-url')
    @ApiOperation({ summary: 'Get signed URL for media asset' })
    @ApiParam({ name: 'id', description: 'Media asset UUID' })
    @ApiQuery({ name: 'expiresIn', description: 'URL expiration in seconds', required: false })
    @ApiQuery({ name: 'download', description: 'Force download', required: false })
    @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
    @ApiResponse({ status: 404, description: 'Media asset not found' })
    async getMediaSignedUrl(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('expiresIn') expiresIn?: number,
        @Query('download') download?: boolean,
    ): Promise<{ signedUrl: string }> {
        const signedUrl = await this.contentService.getMediaSignedUrl(
            id,
            expiresIn || 3600,
            download || false,
        );
        return { signedUrl };
    }

    @Post('items/:id/duplicate')
    @ApiOperation({ summary: 'Duplicate content item with new slug' })
    @ApiParam({ name: 'id', description: 'Item UUID to duplicate' })
    @ApiResponse({ status: 201, description: 'Item duplicated successfully', type: Item })
    @ApiResponse({ status: 404, description: 'Original item not found' })
    @ApiResponse({ status: 409, description: 'New slug already exists' })
    async duplicateItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('newSlug') newSlug: string,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        // Temporary: use hardcoded user ID until auth is integrated
        const createdBy = 'temp-user-id';
        return await this.contentService.duplicateItem(id, newSlug, createdBy);
    }

    @Get('items/:id/versions')
    @ApiOperation({ summary: 'Get version history for content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Version history retrieved successfully', type: [Item] })
    @ApiResponse({ status: 404, description: 'Item not found' })
    async getItemVersionHistory(@Param('id', ParseUUIDPipe) id: string): Promise<Item[]> {
        return await this.contentService.getItemVersionHistory(id);
    }

    // Workflow Management Endpoints

    @Post('items/:id/submit-for-review')
    @ApiOperation({ summary: 'Submit content item for review' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item submitted for review successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Item not in valid state for review' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_AUTHOR, UserRole.ADMIN)
    async submitForReview(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() submitDto: SubmitForReviewDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const submittedBy = 'temp-user-id';
        return await this.contentService.submitForReview(id, submitDto, submittedBy);
    }

    @Post('items/:id/assign-reviewer')
    @ApiOperation({ summary: 'Assign reviewer to content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Reviewer assigned successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Item not in valid state for reviewer assignment' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async assignReviewer(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() assignDto: AssignReviewerDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const assignedBy = 'temp-user-id';
        return await this.contentService.assignReviewer(id, assignDto, assignedBy);
    }

    @Post('items/:id/review')
    @ApiOperation({ summary: 'Complete review of content item (approve or reject)' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Review completed successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Item not in valid state for review' })
    @ApiResponse({ status: 403, description: 'Not authorized to review this item' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async reviewItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() reviewDto: ReviewItemDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const reviewedBy = 'temp-user-id';
        return await this.contentService.reviewItem(id, reviewDto, reviewedBy);
    }

    @Post('items/:id/publish')
    @ApiOperation({ summary: 'Publish approved content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item published successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Item not approved for publication' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async publishItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() publishDto: PublishItemDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const publishedBy = 'temp-user-id';
        return await this.contentService.publishItem(id, publishDto, publishedBy);
    }

    @Post('items/:id/archive')
    @ApiOperation({ summary: 'Archive content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item archived successfully', type: Item })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async archiveItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason?: string,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const archivedBy = 'temp-user-id';
        return await this.contentService.archiveItem(id, archivedBy, reason);
    }

    @Post('items/:id/restore')
    @ApiOperation({ summary: 'Restore archived content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item restored successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Item not archived' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.ADMIN)
    async restoreItem(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason?: string,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const restoredBy = 'temp-user-id';
        return await this.contentService.restoreItem(id, restoredBy, reason);
    }

    @Get('items/:id/workflow-history')
    @ApiOperation({ summary: 'Get workflow history for content item' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Workflow history retrieved successfully', type: [WorkflowHistoryEntry] })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.CONTENT_AUTHOR, UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async getWorkflowHistory(@Param('id', ParseUUIDPipe) id: string): Promise<WorkflowHistoryEntry[]> {
        return await this.contentService.getWorkflowHistory(id);
    }

    @Post('items/bulk-workflow')
    @ApiOperation({ summary: 'Perform bulk workflow operations on multiple items' })
    @ApiResponse({ status: 200, description: 'Bulk operation completed', type: BulkWorkflowResult })
    @ApiResponse({ status: 400, description: 'Invalid bulk operation request' })
    @Roles(UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async bulkWorkflowOperation(
        @Body() bulkDto: BulkWorkflowDto,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<BulkWorkflowResult> {
        const performedBy = 'temp-user-id';
        return await this.contentService.bulkWorkflowOperation(bulkDto, performedBy);
    }

    @Post('items/:id/rollback')
    @ApiOperation({ summary: 'Rollback content item to previous version' })
    @ApiParam({ name: 'id', description: 'Item UUID' })
    @ApiResponse({ status: 200, description: 'Item rolled back successfully', type: Item })
    @ApiResponse({ status: 400, description: 'Invalid rollback request' })
    @ApiResponse({ status: 404, description: 'Item not found' })
    @Roles(UserRole.ADMIN)
    async rollbackToVersion(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('targetVersion') targetVersion: number,
        // TODO: Extract from JWT token
        // @CurrentUser() user: User,
    ): Promise<Item> {
        const performedBy = 'temp-user-id';
        return await this.contentService.rollbackToVersion(id, targetVersion, performedBy);
    }
    // Enhanced Media Management Endpoints

    @Get('media/:id/urls')
    @ApiOperation({ summary: 'Get media asset with CDN URLs' })
    @ApiResponse({ status: 200, description: 'Media asset with URLs retrieved successfully' })
    @Roles(UserRole.LEARNER, UserRole.CONTENT_AUTHOR, UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async getMediaAssetWithUrls(@Param('id', ParseUUIDPipe) id: string) {
        return await this.contentService.getMediaAssetWithUrls(id);
    }

    @Put('media/:id')
    @ApiOperation({ summary: 'Update media asset metadata' })
    @ApiResponse({ status: 200, description: 'Media asset updated successfully' })
    @Roles(UserRole.CONTENT_AUTHOR, UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async updateMediaAsset(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updates: Partial<MediaAsset>
    ) {
        return await this.contentService.updateMediaAsset(id, updates);
    }

    @Post('media/:id/duplicate')
    @ApiOperation({ summary: 'Duplicate media asset to another item' })
    @ApiResponse({ status: 201, description: 'Media asset duplicated successfully' })
    @Roles(UserRole.CONTENT_AUTHOR, UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async duplicateMediaAsset(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('newItemId') newItemId: string
    ) {
        return await this.contentService.duplicateMediaAsset(id, newItemId);
    }

    @Get('items/:itemId/media')
    @ApiOperation({ summary: 'Get all media assets for an item' })
    @ApiResponse({ status: 200, description: 'Media assets retrieved successfully' })
    @Roles(UserRole.LEARNER, UserRole.CONTENT_AUTHOR, UserRole.CONTENT_REVIEWER, UserRole.ADMIN)
    async getMediaAssetsByItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
        return await this.contentService.getMediaAssetsByItem(itemId);
    }

    @Get('media/statistics')
    @ApiOperation({ summary: 'Get media storage statistics' })
    @ApiResponse({ status: 200, description: 'Storage statistics retrieved successfully' })
    @Roles(UserRole.ADMIN)
    async getMediaStorageStatistics() {
        return await this.contentService.getMediaStorageStatistics();
    }

    @Post('media/cleanup')
    @ApiOperation({ summary: 'Cleanup inactive media assets' })
    @ApiResponse({ status: 200, description: 'Media cleanup completed' })
    @Roles(UserRole.ADMIN)
    async cleanupInactiveMedia() {
        return await this.contentService.cleanupInactiveMedia();
    }
}