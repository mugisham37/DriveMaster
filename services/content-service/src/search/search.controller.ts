import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { ContentRecommendationService } from './content-recommendation.service';
import { ContentTaggingService } from './content-tagging.service';
import {
    SearchRequestDto,
    SearchResponseDto,
    FacetedSearchDto,
    SearchSuggestionDto,
    ReindexRequestDto,
    IndexStatsDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Search & Discovery')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
    private readonly logger = new Logger(SearchController.name);

    constructor(
        private readonly searchService: SearchService,
        private readonly recommendationService: ContentRecommendationService,
        private readonly taggingService: ContentTaggingService,
    ) { }

    @Get()
    @ApiOperation({
        summary: 'Full-text search with relevance scoring',
        description: 'Perform full-text search across content items with advanced filtering and relevance scoring'
    })
    @ApiResponse({
        status: 200,
        description: 'Search results with facets and pagination',
        type: SearchResponseDto
    })
    @ApiResponse({ status: 400, description: 'Invalid search parameters' })
    async search(@Query() searchDto: SearchRequestDto): Promise<SearchResponseDto> {
        try {
            this.logger.debug(`Search request: ${JSON.stringify(searchDto)}`);
            return await this.searchService.search(searchDto);
        } catch (error) {
            this.logger.error('Search failed:', error);
            throw new BadRequestException(`Search failed: ${error.message}`);
        }
    }

    @Post('faceted')
    @ApiOperation({
        summary: 'Faceted search with filters',
        description: 'Perform search with selected facet filters for refined results'
    })
    @ApiResponse({
        status: 200,
        description: 'Filtered search results',
        type: SearchResponseDto
    })
    @ApiResponse({ status: 400, description: 'Invalid faceted search parameters' })
    @HttpCode(HttpStatus.OK)
    async facetedSearch(@Body() facetedDto: FacetedSearchDto): Promise<SearchResponseDto> {
        try {
            this.logger.debug(`Faceted search request: ${JSON.stringify(facetedDto)}`);
            return await this.searchService.facetedSearch(facetedDto);
        } catch (error) {
            this.logger.error('Faceted search failed:', error);
            throw new BadRequestException(`Faceted search failed: ${error.message}`);
        }
    }

    @Get('suggestions')
    @ApiOperation({
        summary: 'Get search suggestions for autocomplete',
        description: 'Get search suggestions based on partial query for autocomplete functionality'
    })
    @ApiResponse({
        status: 200,
        description: 'Search suggestions',
        type: [SearchSuggestionDto]
    })
    @ApiQuery({ name: 'q', description: 'Partial search query', required: true })
    @ApiQuery({ name: 'limit', description: 'Maximum number of suggestions', required: false, type: Number })
    async getSuggestions(
        @Query('q') query: string,
        @Query('limit') limit?: number,
    ): Promise<SearchSuggestionDto[]> {
        if (!query || query.trim().length < 2) {
            throw new BadRequestException('Query must be at least 2 characters long');
        }

        try {
            return await this.searchService.getSuggestions(query.trim(), limit || 10);
        } catch (error) {
            this.logger.error('Suggestions failed:', error);
            throw new BadRequestException(`Suggestions failed: ${error.message}`);
        }
    }

    @Get('recommendations/similar')
    @ApiOperation({
        summary: 'Get similar content recommendations',
        description: 'Get content recommendations similar to a specific item'
    })
    @ApiResponse({
        status: 200,
        description: 'Similar content recommendations'
    })
    @ApiQuery({ name: 'itemId', description: 'Item ID to find similar content for', required: true })
    @ApiQuery({ name: 'limit', description: 'Maximum number of recommendations', required: false, type: Number })
    async getSimilarContent(
        @Query('itemId') itemId: string,
        @Query('limit') limit?: number,
    ): Promise<any[]> {
        if (!itemId) {
            throw new BadRequestException('Item ID is required');
        }

        try {
            return await this.recommendationService.getSimilarContent(itemId, limit || 10);
        } catch (error) {
            this.logger.error('Similar content recommendations failed:', error);
            throw new BadRequestException(`Similar content recommendations failed: ${error.message}`);
        }
    }

    @Get('recommendations/personalized')
    @ApiOperation({
        summary: 'Get personalized content recommendations',
        description: 'Get personalized content recommendations based on user behavior and preferences'
    })
    @ApiResponse({
        status: 200,
        description: 'Personalized content recommendations'
    })
    @ApiQuery({ name: 'userId', description: 'User ID for personalized recommendations', required: true })
    @ApiQuery({ name: 'limit', description: 'Maximum number of recommendations', required: false, type: Number })
    async getPersonalizedRecommendations(
        @Query('userId') userId: string,
        @Query('limit') limit?: number,
    ): Promise<any[]> {
        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        try {
            return await this.recommendationService.getPersonalizedRecommendations(userId, limit || 10);
        } catch (error) {
            this.logger.error('Personalized recommendations failed:', error);
            throw new BadRequestException(`Personalized recommendations failed: ${error.message}`);
        }
    }

    @Get('recommendations/trending')
    @ApiOperation({
        summary: 'Get trending content',
        description: 'Get currently trending content based on usage patterns'
    })
    @ApiResponse({
        status: 200,
        description: 'Trending content recommendations'
    })
    @ApiQuery({ name: 'jurisdiction', description: 'Filter by jurisdiction', required: false })
    @ApiQuery({ name: 'timeframe', description: 'Timeframe for trending (1d, 7d, 30d)', required: false })
    @ApiQuery({ name: 'limit', description: 'Maximum number of recommendations', required: false, type: Number })
    async getTrendingContent(
        @Query('jurisdiction') jurisdiction?: string,
        @Query('timeframe') timeframe?: string,
        @Query('limit') limit?: number,
    ): Promise<any[]> {
        try {
            return await this.recommendationService.getTrendingContent({
                jurisdiction,
                timeframe: timeframe || '7d',
                limit: limit || 10,
            });
        } catch (error) {
            this.logger.error('Trending content failed:', error);
            throw new BadRequestException(`Trending content failed: ${error.message}`);
        }
    }

    @Get('recommendations/by-topic')
    @ApiOperation({
        summary: 'Get content recommendations by topic',
        description: 'Get content recommendations for specific topics'
    })
    @ApiResponse({
        status: 200,
        description: 'Topic-based content recommendations'
    })
    @ApiQuery({ name: 'topics', description: 'Comma-separated list of topics', required: true })
    @ApiQuery({ name: 'difficulty', description: 'Target difficulty level', required: false, type: Number })
    @ApiQuery({ name: 'limit', description: 'Maximum number of recommendations', required: false, type: Number })
    async getRecommendationsByTopic(
        @Query('topics') topics: string,
        @Query('difficulty') difficulty?: number,
        @Query('limit') limit?: number,
    ): Promise<any[]> {
        if (!topics) {
            throw new BadRequestException('Topics are required');
        }

        try {
            const topicList = topics.split(',').map(t => t.trim()).filter(Boolean);
            return await this.recommendationService.getRecommendationsByTopic(
                topicList,
                difficulty,
                limit || 10
            );
        } catch (error) {
            this.logger.error('Topic-based recommendations failed:', error);
            throw new BadRequestException(`Topic-based recommendations failed: ${error.message}`);
        }
    }

    @Post('reindex')
    @ApiOperation({
        summary: 'Reindex all content',
        description: 'Rebuild the search index from database (admin only)'
    })
    @ApiResponse({
        status: 200,
        description: 'Reindexing completed successfully'
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @UseGuards(RolesGuard)
    @Roles('admin', 'content_admin')
    @HttpCode(HttpStatus.OK)
    async reindexContent(@Body() reindexDto: ReindexRequestDto): Promise<{ message: string; timestamp: Date }> {
        try {
            this.logger.log('Starting content reindexing...');
            await this.searchService.reindexAll();

            return {
                message: 'Content reindexing completed successfully',
                timestamp: new Date(),
            };
        } catch (error) {
            this.logger.error('Reindexing failed:', error);
            throw new BadRequestException(`Reindexing failed: ${error.message}`);
        }
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Get search index statistics',
        description: 'Get statistics about the search index (admin only)'
    })
    @ApiResponse({
        status: 200,
        description: 'Search index statistics',
        type: IndexStatsDto
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @UseGuards(RolesGuard)
    @Roles('admin', 'content_admin')
    async getIndexStats(): Promise<IndexStatsDto | null> {
        try {
            return await this.searchService.getIndexStats();
        } catch (error) {
            this.logger.error('Failed to get index stats:', error);
            throw new BadRequestException(`Failed to get index stats: ${error.message}`);
        }
    }

    @Get('health')
    @ApiOperation({
        summary: 'Check search service health',
        description: 'Check the health status of the search service and Elasticsearch connection'
    })
    @ApiResponse({
        status: 200,
        description: 'Search service health status'
    })
    async getHealthStatus(): Promise<{ status: string; elasticsearch: boolean; timestamp: Date }> {
        try {
            // Test Elasticsearch connection
            const stats = await this.searchService.getIndexStats();
            const elasticsearchHealthy = stats !== null;

            return {
                status: elasticsearchHealthy ? 'healthy' : 'degraded',
                elasticsearch: elasticsearchHealthy,
                timestamp: new Date(),
            };
        } catch (error) {
            this.logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                elasticsearch: false,
                timestamp: new Date(),
            };
        }
    }

    @Post('tags/analyze')
    @ApiOperation({
        summary: 'Analyze content and suggest tags',
        description: 'Analyze content text and suggest appropriate tags and categories'
    })
    @ApiResponse({
        status: 200,
        description: 'Content analysis with tag suggestions'
    })
    @HttpCode(HttpStatus.OK)
    async analyzeContentForTags(
        @Body() body: { content: any; choices?: any[]; explanation?: any }
    ): Promise<any> {
        try {
            return await this.taggingService.analyzeContent(
                body.content,
                body.choices,
                body.explanation
            );
        } catch (error) {
            this.logger.error('Content analysis failed:', error);
            throw new BadRequestException(`Content analysis failed: ${error.message}`);
        }
    }

    @Post('tags/auto-tag')
    @ApiOperation({
        summary: 'Auto-tag content items',
        description: 'Automatically tag content items based on content analysis (admin only)'
    })
    @ApiResponse({
        status: 200,
        description: 'Auto-tagging results'
    })
    @UseGuards(RolesGuard)
    @Roles('admin', 'content_admin')
    @HttpCode(HttpStatus.OK)
    async autoTagItems(
        @Body() body: { itemIds?: string[] }
    ): Promise<{ processed: number; updated: number }> {
        try {
            return await this.taggingService.autoTagItems(body.itemIds);
        } catch (error) {
            this.logger.error('Auto-tagging failed:', error);
            throw new BadRequestException(`Auto-tagging failed: ${error.message}`);
        }
    }

    @Get('tags/popular')
    @ApiOperation({
        summary: 'Get popular tags',
        description: 'Get the most popular tags across all content'
    })
    @ApiResponse({
        status: 200,
        description: 'Popular tags with usage counts'
    })
    @ApiQuery({ name: 'limit', description: 'Maximum number of tags to return', required: false, type: Number })
    async getPopularTags(
        @Query('limit') limit?: number
    ): Promise<Array<{ tag: string; count: number }>> {
        try {
            return await this.taggingService.getPopularTags(limit || 50);
        } catch (error) {
            this.logger.error('Failed to get popular tags:', error);
            throw new BadRequestException(`Failed to get popular tags: ${error.message}`);
        }
    }

    @Get('tags/suggestions')
    @ApiOperation({
        summary: 'Get tag suggestions for content',
        description: 'Get tag suggestions based on content text'
    })
    @ApiResponse({
        status: 200,
        description: 'Tag suggestions'
    })
    @ApiQuery({ name: 'content', description: 'Content text to analyze', required: true })
    async getTagSuggestions(
        @Query('content') content: string
    ): Promise<any[]> {
        if (!content || content.trim().length < 10) {
            throw new BadRequestException('Content must be at least 10 characters long');
        }

        try {
            return await this.taggingService.getTagSuggestions(content);
        } catch (error) {
            this.logger.error('Tag suggestions failed:', error);
            throw new BadRequestException(`Tag suggestions failed: ${error.message}`);
        }
    }

    @Get('tags/cooccurrence')
    @ApiOperation({
        summary: 'Get tag co-occurrence patterns',
        description: 'Get tags that frequently appear together with a given tag'
    })
    @ApiResponse({
        status: 200,
        description: 'Tag co-occurrence data'
    })
    @ApiQuery({ name: 'tag', description: 'Tag to find co-occurrences for', required: true })
    @ApiQuery({ name: 'limit', description: 'Maximum number of related tags', required: false, type: Number })
    async getTagCooccurrence(
        @Query('tag') tag: string,
        @Query('limit') limit?: number
    ): Promise<Array<{ tag: string; cooccurrence: number }>> {
        if (!tag) {
            throw new BadRequestException('Tag parameter is required');
        }

        try {
            return await this.taggingService.getTagCooccurrence(tag, limit || 20);
        } catch (error) {
            this.logger.error('Tag co-occurrence failed:', error);
            throw new BadRequestException(`Tag co-occurrence failed: ${error.message}`);
        }
    }
}