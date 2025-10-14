import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item, ItemStatus } from '../content/entities/item.entity';

export interface RecommendationOptions {
    jurisdiction?: string;
    timeframe?: string;
    limit?: number;
}

export interface SimilarContentItem {
    id: string;
    slug: string;
    content: any;
    topics: string[];
    difficulty: number;
    itemType: string;
    cognitiveLevel: string;
    estimatedTime: number;
    points: number;
    similarity: number;
    publishedAt: Date;
}

export interface PersonalizedRecommendation {
    id: string;
    slug: string;
    content: any;
    topics: string[];
    difficulty: number;
    itemType: string;
    cognitiveLevel: string;
    estimatedTime: number;
    points: number;
    score: number;
    reason: string;
    publishedAt: Date;
}

export interface TrendingContent {
    id: string;
    slug: string;
    content: any;
    topics: string[];
    difficulty: number;
    itemType: string;
    cognitiveLevel: string;
    estimatedTime: number;
    points: number;
    trendingScore: number;
    usageCount: number;
    publishedAt: Date;
}

@Injectable()
export class ContentRecommendationService {
    private readonly logger = new Logger(ContentRecommendationService.name);
    private readonly indexName = 'content_items';

    constructor(
        private readonly elasticsearchService: ElasticsearchService,
        @InjectRepository(Item)
        private readonly itemRepository: Repository<Item>,
    ) { }

    /**
     * Get similar content based on content similarity using More Like This query
     */
    async getSimilarContent(itemId: string, limit: number = 10): Promise<SimilarContentItem[]> {
        try {
            // First, get the source item
            const sourceItem = await this.itemRepository.findOne({
                where: { id: itemId, status: ItemStatus.PUBLISHED, isActive: true },
            });

            if (!sourceItem) {
                throw new NotFoundException(`Item with ID '${itemId}' not found`);
            }

            // Use More Like This query to find similar content
            const response = await this.elasticsearchService.search({
                index: this.indexName,
                query: {
                    bool: {
                        must: [
                            {
                                more_like_this: {
                                    fields: ['content.text', 'topics', 'tags', 'cognitiveLevel'],
                                    like: [
                                        {
                                            _index: this.indexName,
                                            _id: itemId,
                                        },
                                    ],
                                    min_term_freq: 1,
                                    max_query_terms: 12,
                                    min_doc_freq: 1,
                                    minimum_should_match: '30%',
                                },
                            },
                        ],
                        filter: [
                            { term: { status: ItemStatus.PUBLISHED } },
                            { term: { isActive: true } },
                        ],
                        must_not: [
                            { term: { id: itemId } }, // Exclude the source item
                        ],
                    },
                },
                size: limit,
            });

            return response.hits.hits.map((hit: any) => ({
                ...hit._source,
                similarity: hit._score,
            }));
        } catch (error) {
            this.logger.error(`Failed to get similar content for item ${itemId}:`, error);
            throw error;
        }
    }

    /**
     * Get personalized recommendations based on user behavior patterns
     * This is a simplified implementation - in production, this would use ML models
     */
    async getPersonalizedRecommendations(
        userId: string,
        limit: number = 10
    ): Promise<PersonalizedRecommendation[]> {
        try {
            // In a real implementation, this would:
            // 1. Fetch user's attempt history and preferences
            // 2. Analyze performance patterns and weak areas
            // 3. Use collaborative filtering or content-based filtering
            // 4. Apply ML models for personalization

            // For now, we'll implement a basic version based on common patterns
            const recommendations: PersonalizedRecommendation[] = [];

            // Get items from topics the user hasn't mastered (simulated)
            const weakTopics = await this.getWeakTopicsForUser(userId);

            if (weakTopics.length > 0) {
                const topicBasedItems = await this.getItemsByTopics(weakTopics, Math.ceil(limit * 0.6));
                recommendations.push(...topicBasedItems.map(item => ({
                    ...item,
                    score: 0.8,
                    reason: 'Recommended based on topics you need to practice',
                })));
            }

            // Get items at appropriate difficulty level
            const userDifficultyLevel = await this.getUserDifficultyLevel(userId);
            const difficultyBasedItems = await this.getItemsByDifficulty(
                userDifficultyLevel - 0.5,
                userDifficultyLevel + 0.5,
                Math.ceil(limit * 0.4)
            );

            recommendations.push(...difficultyBasedItems.map(item => ({
                ...item,
                score: 0.7,
                reason: 'Matched to your current skill level',
            })));

            // Remove duplicates and sort by score
            const uniqueRecommendations = recommendations
                .filter((item, index, self) =>
                    index === self.findIndex(r => r.id === item.id)
                )
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return uniqueRecommendations;
        } catch (error) {
            this.logger.error(`Failed to get personalized recommendations for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get trending content based on usage patterns
     */
    async getTrendingContent(options: RecommendationOptions): Promise<TrendingContent[]> {
        try {
            // In a real implementation, this would analyze:
            // 1. Recent attempt counts per item
            // 2. User engagement metrics
            // 3. Success rates and completion rates
            // 4. Time-based trending algorithms

            // For now, we'll simulate trending based on recent items and difficulty distribution
            const query: any = {
                bool: {
                    filter: [
                        { term: { status: ItemStatus.PUBLISHED } },
                        { term: { isActive: true } },
                    ],
                },
            };

            // Add jurisdiction filter if specified
            if (options.jurisdiction) {
                query.bool.filter.push({
                    term: { jurisdictions: options.jurisdiction },
                });
            }

            // Add time-based filter
            const timeframe = options.timeframe || '7d';
            const timeFilter = this.getTimeFilter(timeframe);
            if (timeFilter) {
                query.bool.filter.push(timeFilter);
            }

            const response = await this.elasticsearchService.search({
                index: this.indexName,
                query,
                sort: [
                    { publishedAt: { order: 'desc' } },
                    { _score: { order: 'desc' } },
                ],
                size: options.limit || 10,
            });

            // Simulate trending scores based on recency and difficulty balance
            return response.hits.hits.map((hit: any, index: number) => {
                const recencyScore = Math.max(0, 1 - (index * 0.1));
                const difficultyScore = this.calculateDifficultyScore(hit._source.difficulty);
                const trendingScore = (recencyScore * 0.7) + (difficultyScore * 0.3);

                return {
                    ...hit._source,
                    trendingScore,
                    usageCount: Math.floor(Math.random() * 1000) + 100, // Simulated
                };
            });
        } catch (error) {
            this.logger.error('Failed to get trending content:', error);
            throw error;
        }
    }

    /**
     * Get recommendations by specific topics
     */
    async getRecommendationsByTopic(
        topics: string[],
        targetDifficulty?: number,
        limit: number = 10
    ): Promise<any[]> {
        try {
            const query: any = {
                bool: {
                    must: [
                        {
                            terms: { topics },
                        },
                    ],
                    filter: [
                        { term: { status: ItemStatus.PUBLISHED } },
                        { term: { isActive: true } },
                    ],
                },
            };

            // Add difficulty filter if specified
            if (targetDifficulty !== undefined) {
                query.bool.filter.push({
                    range: {
                        difficulty: {
                            gte: targetDifficulty - 0.5,
                            lte: targetDifficulty + 0.5,
                        },
                    },
                });
            }

            const response = await this.elasticsearchService.search({
                index: this.indexName,
                query,
                sort: [
                    { _score: { order: 'desc' } },
                    { difficulty: { order: 'asc' } },
                    { publishedAt: { order: 'desc' } },
                ],
                size: limit,
            });

            return response.hits.hits.map((hit: any) => ({
                ...hit._source,
                relevanceScore: hit._score,
            }));
        } catch (error) {
            this.logger.error(`Failed to get recommendations by topics ${topics.join(', ')}:`, error);
            throw error;
        }
    }

    /**
     * Get content recommendations for content gaps
     */
    async getContentGapRecommendations(jurisdiction: string): Promise<any[]> {
        try {
            // Analyze content distribution by topics and difficulty levels
            const response = await this.elasticsearchService.search({
                index: this.indexName,
                query: {
                    bool: {
                        filter: [
                            { term: { jurisdictions: jurisdiction } },
                            { term: { status: ItemStatus.PUBLISHED } },
                            { term: { isActive: true } },
                        ],
                    },
                },
                aggs: {
                    topics_distribution: {
                        terms: {
                            field: 'topics',
                            size: 50,
                        },
                        aggs: {
                            difficulty_stats: {
                                stats: {
                                    field: 'difficulty',
                                },
                            },
                        },
                    },
                    difficulty_distribution: {
                        histogram: {
                            field: 'difficulty',
                            interval: 0.5,
                        },
                    },
                },
                size: 0,
            });

            // Analyze gaps and return recommendations for content creation
            const topicsDistribution = (response.aggregations?.topics_distribution as any)?.buckets || [];
            const difficultyDistribution = (response.aggregations?.difficulty_distribution as any)?.buckets || [];

            // Identify topics with low content count
            const lowContentTopics = topicsDistribution
                .filter((bucket: any) => bucket.doc_count < 10)
                .map((bucket: any) => ({
                    topic: bucket.key,
                    currentCount: bucket.doc_count,
                    averageDifficulty: bucket.difficulty_stats?.avg || 0,
                    recommendation: 'Create more content for this topic',
                }));

            // Identify difficulty gaps
            const difficultyGaps = this.identifyDifficultyGaps(difficultyDistribution);

            return [
                ...lowContentTopics.map(topic => ({
                    type: 'topic_gap',
                    ...topic,
                })),
                ...difficultyGaps.map(gap => ({
                    type: 'difficulty_gap',
                    ...gap,
                })),
            ];
        } catch (error) {
            this.logger.error(`Failed to get content gap recommendations for ${jurisdiction}:`, error);
            throw error;
        }
    }

    /**
     * Update recommendation models based on user interactions
     * This would be called when users interact with content
     */
    async updateRecommendationModels(userId: string, itemId: string, interaction: string): Promise<void> {
        try {
            // In a real implementation, this would:
            // 1. Store interaction data
            // 2. Update user preference models
            // 3. Trigger model retraining if needed
            // 4. Update collaborative filtering matrices

            this.logger.debug(`Recording interaction: User ${userId} ${interaction} item ${itemId}`);

            // For now, we'll just log the interaction
            // In production, this would update ML models and user profiles
        } catch (error) {
            this.logger.error(`Failed to update recommendation models:`, error);
        }
    }

    // Helper methods

    private async getWeakTopicsForUser(_userId: string): Promise<string[]> {
        // In a real implementation, this would query user progress data
        // For now, return some common topics that users typically struggle with
        return ['traffic-signs', 'parking-rules', 'right-of-way', 'speed-limits'];
    }

    private async getUserDifficultyLevel(_userId: string): Promise<number> {
        // In a real implementation, this would calculate based on user performance
        // For now, return a moderate difficulty level
        return 0.0; // Neutral difficulty
    }

    private async getItemsByTopics(topics: string[], limit: number): Promise<any[]> {
        const response = await this.elasticsearchService.search({
            index: this.indexName,
            query: {
                bool: {
                    must: [
                        { terms: { topics } },
                    ],
                    filter: [
                        { term: { status: ItemStatus.PUBLISHED } },
                        { term: { isActive: true } },
                    ],
                },
            },
            sort: [
                { _score: { order: 'desc' } },
                { publishedAt: { order: 'desc' } },
            ],
            size: limit,
        });

        return response.hits.hits.map((hit: any) => hit._source);
    }

    private async getItemsByDifficulty(minDifficulty: number, maxDifficulty: number, limit: number): Promise<any[]> {
        const response = await this.elasticsearchService.search({
            index: this.indexName,
            query: {
                bool: {
                    filter: [
                        {
                            range: {
                                difficulty: {
                                    gte: minDifficulty,
                                    lte: maxDifficulty,
                                },
                            },
                        },
                        { term: { status: ItemStatus.PUBLISHED } },
                        { term: { isActive: true } },
                    ],
                },
            },
            sort: [
                { publishedAt: { order: 'desc' } },
            ],
            size: limit,
        });

        return response.hits.hits.map((hit: any) => hit._source);
    }

    private getTimeFilter(timeframe: string): any {
        const now = new Date();
        let fromDate: Date;

        switch (timeframe) {
            case '1d':
                fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return null;
        }

        return {
            range: {
                publishedAt: {
                    gte: fromDate.toISOString(),
                },
            },
        };
    }

    private calculateDifficultyScore(difficulty: number): number {
        // Prefer moderate difficulty items for trending
        const optimal = 0.0; // Neutral difficulty
        const distance = Math.abs(difficulty - optimal);
        return Math.max(0, 1 - (distance / 2));
    }

    private identifyDifficultyGaps(difficultyBuckets: any[]): any[] {
        const gaps = [];
        const expectedMinCount = 5; // Minimum items per difficulty range

        for (const bucket of difficultyBuckets) {
            if (bucket.doc_count < expectedMinCount) {
                gaps.push({
                    difficultyRange: `${bucket.key} to ${bucket.key + 0.5}`,
                    currentCount: bucket.doc_count,
                    recommendedCount: expectedMinCount,
                    recommendation: `Create ${expectedMinCount - bucket.doc_count} more items in this difficulty range`,
                });
            }
        }

        return gaps;
    }
}