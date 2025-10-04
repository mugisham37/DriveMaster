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

@ApiTags('Content Management')
@Controller('content')
@ApiBearerAuth()
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
}