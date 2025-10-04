import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item, ItemStatus } from '../content/entities/item.entity';
import { SearchRequestDto, SearchResponseDto, FacetedSearchDto, SearchSuggestionDto } from './dto/search.dto';

export interface SearchHit {
    id: string;
    slug: string;
    content: any;
    choices: any[];
    correct: any;
    explanation?: any;
    difficulty: number;
    topics: string[];
    jurisdictions: string[];
    itemType: string;
    cognitiveLevel: string;
    tags: string[];
    estimatedTime: number;
    points: number;
    status: ItemStatus;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    score: number;
    highlights?: any;
}

export interface SearchAggregations {
    topics: Array<{ key: string; doc_count: number }>;
    jurisdictions: Array<{ key: string; doc_count: number }>;
    itemTypes: Array<{ key: string; doc_count: number }>;
    cognitiveLevels: Array<{ key: string; doc_count: number }>;
    difficultyRanges: Array<{ key: string; doc_count: number; from?: number; to?: number }>;
    tags: Array<{ key: string; doc_count: number }>;
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);
    private readonly indexName = 'content_items';

    constructor(
        private readonly elasticsearchService: ElasticsearchService,
        @InjectRepository(Item)
        private readonly itemRepository: Repository<Item>,
    ) { }

    async onModuleInit() {
        await this.ensureIndexExists();
    }

    /**
     * Perform full-text search with relevance scoring
     */
    async search(searchDto: SearchRequestDto): Promise<SearchResponseDto> {
        try {
            const query = this.buildSearchQuery(searchDto);
            const aggregations = this.buildAggregations();

            const response = await this.elasticsearchService.search({
                index: this.indexName,
                query,
                aggs: aggregations,
                highlight: {
                    fields: {
                        'content.text': {
                            fragment_size: 150,
                            number_of_fragments: 3,
                        },
                        'explanation.text': {
                            fragment_size: 100,
                            number_of_fragments: 2,
                        },
                        'choices.text': {
                            fragment_size: 100,
                            number_of_fragments: 2,
                        },
                    },
                },
                sort: this.buildSortCriteria(searchDto),
                from: (searchDto.page - 1) * searchDto.limit,
                size: searchDto.limit,
            });

            const hits: SearchHit[] = response.hits.hits.map((hit: any) => ({
                ...hit._source,
                score: hit._score,
                highlights: hit.highlight,
            }));

            const facets = this.processFacets(response.aggregations);

            return {
                hits,
                total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
                page: searchDto.page,
                limit: searchDto.limit,
                totalPages: Math.ceil((typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0) / searchDto.limit),
                facets,
                took: response.took || 0,
            };
        } catch (error) {
            this.logger.error('Search failed:', error);
            throw new BadRequestException(`Search failed: ${error.message}`);
        }
    }

    /**
     * Perform faceted search with filters
     */
    async facetedSearch(facetedDto: FacetedSearchDto): Promise<SearchResponseDto> {
        const searchDto: SearchRequestDto = {
            query: facetedDto.query,
            topics: facetedDto.selectedFacets.topics,
            jurisdictions: facetedDto.selectedFacets.jurisdictions,
            itemTypes: facetedDto.selectedFacets.itemTypes,
            cognitiveLevels: facetedDto.selectedFacets.cognitiveLevels,
            tags: facetedDto.selectedFacets.tags,
            minDifficulty: facetedDto.selectedFacets.minDifficulty,
            maxDifficulty: facetedDto.selectedFacets.maxDifficulty,
            page: facetedDto.page,
            limit: facetedDto.limit,
            sortBy: facetedDto.sortBy,
            sortOrder: facetedDto.sortOrder,
        };

        return this.search(searchDto);
    }

    /**
     * Get search suggestions for autocomplete
     */
    async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestionDto[]> {
        try {
            const response = await this.elasticsearchService.search({
                index: this.indexName,
                suggest: {
                    content_suggest: {
                        prefix: query,
                        completion: {
                            field: 'suggest',
                            size: limit,
                        },
                    },
                    topic_suggest: {
                        prefix: query,
                        completion: {
                            field: 'topics_suggest',
                            size: limit,
                        },
                    },
                },
                _source: false,
            });

            const suggestions: SearchSuggestionDto[] = [];

            // Process content suggestions
            const contentSuggestions = response.suggest?.content_suggest?.[0]?.options;
            if (Array.isArray(contentSuggestions)) {
                contentSuggestions.forEach((option: any) => {
                    suggestions.push({
                        text: option.text,
                        type: 'content',
                        score: option._score || 1,
                    });
                });
            }

            // Process topic suggestions
            const topicSuggestions = response.suggest?.topic_suggest?.[0]?.options;
            if (Array.isArray(topicSuggestions)) {
                topicSuggestions.forEach((option: any) => {
                    suggestions.push({
                        text: option.text,
                        type: 'topic',
                        score: option._score || 1,
                    });
                });
            }

            // Sort by score and remove duplicates
            return suggestions
                .sort((a, b) => b.score - a.score)
                .filter((suggestion, index, self) =>
                    index === self.findIndex(s => s.text === suggestion.text)
                )
                .slice(0, limit);
        } catch (error) {
            this.logger.error('Suggestions failed:', error);
            return [];
        }
    }

    /**
     * Index a single item
     */
    async indexItem(item: Item): Promise<void> {
        try {
            const document = this.transformItemToDocument(item);

            await this.elasticsearchService.index({
                index: this.indexName,
                id: item.id,
                document: document,
            });

            this.logger.debug(`Item indexed: ${item.id}`);
        } catch (error) {
            this.logger.error(`Failed to index item ${item.id}:`, error);
            throw error;
        }
    }

    /**
     * Remove item from index
     */
    async removeItem(itemId: string): Promise<void> {
        try {
            await this.elasticsearchService.delete({
                index: this.indexName,
                id: itemId,
            });

            this.logger.debug(`Item removed from index: ${itemId}`);
        } catch (error) {
            if (error.meta?.statusCode !== 404) {
                this.logger.error(`Failed to remove item ${itemId} from index:`, error);
                throw error;
            }
        }
    }

    /**
     * Bulk index items
     */
    async bulkIndexItems(items: Item[]): Promise<void> {
        if (items.length === 0) return;

        try {
            const body = items.flatMap(item => [
                { index: { _index: this.indexName, _id: item.id } },
                this.transformItemToDocument(item),
            ]);

            const response = await this.elasticsearchService.bulk({
                body: body
            });

            if (response.errors) {
                const errorItems = response.items?.filter((item: any) => item.index?.error);
                this.logger.error(`Bulk indexing errors:`, errorItems);
            }

            this.logger.log(`Bulk indexed ${items.length} items`);
        } catch (error) {
            this.logger.error('Bulk indexing failed:', error);
            throw error;
        }
    }

    /**
     * Reindex all items from database
     */
    async reindexAll(): Promise<void> {
        this.logger.log('Starting full reindex...');

        try {
            // Delete existing index
            await this.deleteIndex();

            // Create new index
            await this.ensureIndexExists();

            // Get all published items
            const items = await this.itemRepository.find({
                where: {
                    status: ItemStatus.PUBLISHED,
                    isActive: true
                },
                relations: ['mediaAssets'],
            });

            // Bulk index in batches
            const batchSize = 100;
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                await this.bulkIndexItems(batch);
            }

            this.logger.log(`Reindexing completed. Indexed ${items.length} items.`);
        } catch (error) {
            this.logger.error('Reindexing failed:', error);
            throw error;
        }
    }

    /**
     * Get index statistics
     */
    async getIndexStats(): Promise<any> {
        try {
            const response = await this.elasticsearchService.indices.stats({
                index: this.indexName,
            });

            const indexStats = response.indices?.[this.indexName];
            return {
                indexName: this.indexName,
                documentCount: indexStats?.total?.docs?.count || 0,
                indexSize: indexStats?.total?.store?.size_in_bytes || 0,
                lastUpdated: new Date(),
            };
        } catch (error) {
            this.logger.error('Failed to get index stats:', error);
            return null;
        }
    }

    private buildSearchQuery(searchDto: SearchRequestDto): any {
        const mustClauses: any[] = [];
        const filterClauses: any[] = [];

        // Only search published items
        filterClauses.push({ term: { status: ItemStatus.PUBLISHED } });
        filterClauses.push({ term: { isActive: true } });

        // Full-text search
        if (searchDto.query) {
            mustClauses.push({
                multi_match: {
                    query: searchDto.query,
                    fields: [
                        'content.text^3',
                        'explanation.text^2',
                        'choices.text^1.5',
                        'topics^2',
                        'tags^1.5',
                    ],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                    operator: 'or',
                },
            });
        }

        // Filters
        if (searchDto.topics?.length) {
            filterClauses.push({ terms: { topics: searchDto.topics } });
        }

        if (searchDto.jurisdictions?.length) {
            filterClauses.push({ terms: { jurisdictions: searchDto.jurisdictions } });
        }

        if (searchDto.itemTypes?.length) {
            filterClauses.push({ terms: { itemType: searchDto.itemTypes } });
        }

        if (searchDto.cognitiveLevels?.length) {
            filterClauses.push({ terms: { cognitiveLevel: searchDto.cognitiveLevels } });
        }

        if (searchDto.tags?.length) {
            filterClauses.push({ terms: { tags: searchDto.tags } });
        }

        if (searchDto.minDifficulty !== undefined || searchDto.maxDifficulty !== undefined) {
            const rangeQuery: any = {};
            if (searchDto.minDifficulty !== undefined) {
                rangeQuery.gte = searchDto.minDifficulty;
            }
            if (searchDto.maxDifficulty !== undefined) {
                rangeQuery.lte = searchDto.maxDifficulty;
            }
            filterClauses.push({ range: { difficulty: rangeQuery } });
        }

        // Build final query
        if (mustClauses.length === 0 && filterClauses.length === 0) {
            return { match_all: {} };
        }

        return {
            bool: {
                must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
                filter: filterClauses,
            },
        };
    }

    private buildAggregations(): any {
        return {
            topics: {
                terms: {
                    field: 'topics',
                    size: 50,
                },
            },
            jurisdictions: {
                terms: {
                    field: 'jurisdictions',
                    size: 20,
                },
            },
            itemTypes: {
                terms: {
                    field: 'itemType',
                    size: 10,
                },
            },
            cognitiveLevels: {
                terms: {
                    field: 'cognitiveLevel',
                    size: 10,
                },
            },
            difficultyRanges: {
                range: {
                    field: 'difficulty',
                    ranges: [
                        { key: 'very_easy', to: -1.5 },
                        { key: 'easy', from: -1.5, to: -0.5 },
                        { key: 'medium', from: -0.5, to: 0.5 },
                        { key: 'hard', from: 0.5, to: 1.5 },
                        { key: 'very_hard', from: 1.5 },
                    ],
                },
            },
            tags: {
                terms: {
                    field: 'tags',
                    size: 30,
                },
            },
        };
    }

    private buildSortCriteria(searchDto: SearchRequestDto): any[] {
        const sortCriteria: any[] = [];

        if (searchDto.query) {
            // If there's a search query, sort by relevance first
            sortCriteria.push({ _score: { order: 'desc' } });
        }

        // Add custom sort
        if (searchDto.sortBy) {
            const sortField = this.mapSortField(searchDto.sortBy);
            sortCriteria.push({
                [sortField]: {
                    order: searchDto.sortOrder?.toLowerCase() || 'desc',
                },
            });
        }

        // Default fallback sort
        if (sortCriteria.length === 0) {
            sortCriteria.push({ publishedAt: { order: 'desc' } });
        }

        return sortCriteria;
    }

    private mapSortField(sortBy: string): string {
        const fieldMapping: Record<string, string> = {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
            publishedAt: 'publishedAt',
            difficulty: 'difficulty',
            estimatedTime: 'estimatedTime',
            points: 'points',
            relevance: '_score',
        };

        return fieldMapping[sortBy] || 'publishedAt';
    }

    private processFacets(aggregations: any): SearchAggregations {
        return {
            topics: aggregations.topics?.buckets || [],
            jurisdictions: aggregations.jurisdictions?.buckets || [],
            itemTypes: aggregations.itemTypes?.buckets || [],
            cognitiveLevels: aggregations.cognitiveLevels?.buckets || [],
            difficultyRanges: aggregations.difficultyRanges?.buckets || [],
            tags: aggregations.tags?.buckets || [],
        };
    }

    private transformItemToDocument(item: Item): any {
        return {
            id: item.id,
            slug: item.slug,
            content: item.content,
            choices: item.choices,
            correct: item.correct,
            explanation: item.explanation,
            difficulty: item.difficulty,
            discrimination: item.discrimination,
            guessing: item.guessing,
            topics: item.topics,
            jurisdictions: item.jurisdictions,
            itemType: item.itemType,
            cognitiveLevel: item.cognitiveLevel,
            tags: item.tags,
            estimatedTime: item.estimatedTime,
            points: item.points,
            status: item.status,
            publishedAt: item.publishedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            isActive: item.isActive,
            // Suggestion fields for autocomplete
            suggest: [
                item.content.text,
                ...item.topics,
                ...item.tags,
            ].filter(Boolean),
            topics_suggest: item.topics,
        };
    }

    private async ensureIndexExists(): Promise<void> {
        try {
            const exists = await this.elasticsearchService.indices.exists({
                index: this.indexName,
            });

            if (!exists) {
                await this.createIndex();
            }
        } catch (error) {
            this.logger.error('Failed to check/create index:', error);
            throw error;
        }
    }

    private async createIndex(): Promise<void> {
        const indexMapping: any = {
            mappings: {
                properties: {
                    id: { type: 'keyword' },
                    slug: { type: 'keyword' },
                    content: {
                        properties: {
                            text: {
                                type: 'text',
                                analyzer: 'standard',
                                search_analyzer: 'standard',
                            },
                            richFormatting: { type: 'object', enabled: false },
                            instructions: { type: 'text' },
                        },
                    },
                    choices: {
                        type: 'nested',
                        properties: {
                            id: { type: 'keyword' },
                            text: { type: 'text' },
                            explanation: { type: 'text' },
                        },
                    },
                    correct: {
                        properties: {
                            choiceIds: { type: 'keyword' },
                            explanation: { type: 'text' },
                        },
                    },
                    explanation: {
                        properties: {
                            text: { type: 'text' },
                            richFormatting: { type: 'object', enabled: false },
                        },
                    },
                    difficulty: { type: 'float' },
                    discrimination: { type: 'float' },
                    guessing: { type: 'float' },
                    topics: { type: 'keyword' },
                    jurisdictions: { type: 'keyword' },
                    itemType: { type: 'keyword' },
                    cognitiveLevel: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    estimatedTime: { type: 'integer' },
                    points: { type: 'integer' },
                    status: { type: 'keyword' },
                    publishedAt: { type: 'date' },
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' },
                    isActive: { type: 'boolean' },
                    suggest: {
                        type: 'completion',
                        analyzer: 'simple',
                        preserve_separators: true,
                        preserve_position_increments: true,
                        max_input_length: 50,
                    },
                    topics_suggest: {
                        type: 'completion',
                        analyzer: 'simple',
                    },
                },
            },
            settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
                analysis: {
                    analyzer: {
                        content_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'stop', 'snowball'],
                        },
                    },
                },
            },
        };

        await this.elasticsearchService.indices.create({
            index: this.indexName,
            ...indexMapping,
        });

        this.logger.log(`Created Elasticsearch index: ${this.indexName}`);
    }

    private async deleteIndex(): Promise<void> {
        try {
            const exists = await this.elasticsearchService.indices.exists({
                index: this.indexName,
            });

            if (exists) {
                await this.elasticsearchService.indices.delete({
                    index: this.indexName,
                });
                this.logger.log(`Deleted Elasticsearch index: ${this.indexName}`);
            }
        } catch (error) {
            this.logger.error('Failed to delete index:', error);
            throw error;
        }
    }
}