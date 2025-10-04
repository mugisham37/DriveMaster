import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../content/entities/item.entity';

export interface TagSuggestion {
    tag: string;
    confidence: number;
    reason: string;
}

export interface CategorySuggestion {
    category: string;
    subcategory?: string;
    confidence: number;
    reason: string;
}

export interface ContentAnalysis {
    suggestedTags: TagSuggestion[];
    suggestedCategories: CategorySuggestion[];
    topicRelevance: Record<string, number>;
    difficultyEstimate: number;
    cognitiveLevel: string;
}

@Injectable()
export class ContentTaggingService {
    private readonly logger = new Logger(ContentTaggingService.name);

    // Predefined topic keywords for automatic tagging
    private readonly topicKeywords = {
        'traffic-signs': [
            'sign', 'signal', 'stop', 'yield', 'warning', 'regulatory', 'guide',
            'prohibition', 'mandatory', 'information', 'temporary', 'construction'
        ],
        'parking-rules': [
            'parking', 'park', 'meter', 'zone', 'permit', 'handicapped', 'disabled',
            'loading', 'unloading', 'time limit', 'restriction', 'curb'
        ],
        'right-of-way': [
            'right of way', 'priority', 'intersection', 'roundabout', 'merge',
            'lane change', 'pedestrian', 'cyclist', 'emergency vehicle'
        ],
        'speed-limits': [
            'speed', 'limit', 'maximum', 'minimum', 'school zone', 'residential',
            'highway', 'construction zone', 'weather conditions'
        ],
        'road-markings': [
            'line', 'marking', 'lane', 'center line', 'edge line', 'crosswalk',
            'arrow', 'symbol', 'pavement', 'striping'
        ],
        'vehicle-operation': [
            'steering', 'braking', 'acceleration', 'turning', 'backing',
            'parallel parking', 'three-point turn', 'hill parking'
        ],
        'safety-equipment': [
            'seatbelt', 'airbag', 'helmet', 'child seat', 'mirror',
            'lights', 'horn', 'emergency equipment'
        ],
        'weather-conditions': [
            'rain', 'snow', 'ice', 'fog', 'wind', 'visibility',
            'hydroplaning', 'skidding', 'traction'
        ],
        'impaired-driving': [
            'alcohol', 'drugs', 'impaired', 'intoxicated', 'blood alcohol',
            'DUI', 'DWI', 'medication', 'fatigue', 'distracted'
        ],
        'commercial-vehicles': [
            'truck', 'bus', 'commercial', 'CDL', 'hazmat', 'weight limit',
            'length restriction', 'endorsement'
        ]
    };

    // Difficulty indicators
    private readonly difficultyIndicators = {
        easy: [
            'basic', 'simple', 'fundamental', 'primary', 'elementary',
            'straightforward', 'obvious', 'clear'
        ],
        medium: [
            'moderate', 'intermediate', 'standard', 'typical', 'common',
            'regular', 'normal', 'average'
        ],
        hard: [
            'complex', 'advanced', 'complicated', 'challenging', 'difficult',
            'intricate', 'sophisticated', 'nuanced', 'exception', 'special case'
        ]
    };

    // Cognitive level indicators based on Bloom's taxonomy
    private readonly cognitiveIndicators = {
        knowledge: [
            'what is', 'define', 'identify', 'list', 'name', 'recall',
            'recognize', 'select', 'state', 'describe'
        ],
        comprehension: [
            'explain', 'interpret', 'summarize', 'classify', 'compare',
            'contrast', 'demonstrate', 'illustrate', 'translate'
        ],
        application: [
            'apply', 'use', 'implement', 'execute', 'solve', 'operate',
            'practice', 'employ', 'demonstrate', 'show'
        ],
        analysis: [
            'analyze', 'examine', 'investigate', 'categorize', 'differentiate',
            'distinguish', 'separate', 'organize', 'attribute'
        ],
        synthesis: [
            'create', 'design', 'develop', 'formulate', 'construct',
            'produce', 'plan', 'compose', 'generate'
        ],
        evaluation: [
            'evaluate', 'assess', 'judge', 'critique', 'justify',
            'recommend', 'validate', 'rate', 'prioritize'
        ]
    };

    constructor(
        @InjectRepository(Item)
        private readonly itemRepository: Repository<Item>,
    ) { }

    /**
     * Analyze content and suggest tags and categories
     */
    async analyzeContent(content: any, choices?: any[], explanation?: any): Promise<ContentAnalysis> {
        try {
            const fullText = this.extractTextContent(content, choices, explanation);
            const words = this.tokenizeText(fullText);

            const suggestedTags = this.suggestTags(words, fullText);
            const suggestedCategories = this.suggestCategories(words, fullText);
            const topicRelevance = this.calculateTopicRelevance(words, fullText);
            const difficultyEstimate = this.estimateDifficulty(words, fullText);
            const cognitiveLevel = this.determineCognitiveLevel(words, fullText);

            return {
                suggestedTags,
                suggestedCategories,
                topicRelevance,
                difficultyEstimate,
                cognitiveLevel,
            };
        } catch (error) {
            this.logger.error('Content analysis failed:', error);
            throw error;
        }
    }

    /**
     * Auto-tag existing content items
     */
    async autoTagItems(itemIds?: string[]): Promise<{ processed: number; updated: number }> {
        try {
            let query = this.itemRepository.createQueryBuilder('item')
                .where('item.isActive = :isActive', { isActive: true });

            if (itemIds && itemIds.length > 0) {
                query = query.andWhere('item.id IN (:...itemIds)', { itemIds });
            }

            const items = await query.getMany();
            let processed = 0;
            let updated = 0;

            for (const item of items) {
                try {
                    const analysis = await this.analyzeContent(
                        item.content,
                        item.choices,
                        item.explanation
                    );

                    // Update tags if confidence is high enough
                    const highConfidenceTags = analysis.suggestedTags
                        .filter(tag => tag.confidence > 0.7)
                        .map(tag => tag.tag);

                    if (highConfidenceTags.length > 0) {
                        const existingTags = item.tags || [];
                        const newTags = [...new Set([...existingTags, ...highConfidenceTags])];

                        if (newTags.length > existingTags.length) {
                            await this.itemRepository.update(item.id, {
                                tags: newTags,
                                updatedAt: new Date(),
                            });
                            updated++;
                        }
                    }

                    processed++;
                } catch (error) {
                    this.logger.error(`Failed to auto-tag item ${item.id}:`, error);
                }
            }

            this.logger.log(`Auto-tagging completed: ${processed} processed, ${updated} updated`);
            return { processed, updated };
        } catch (error) {
            this.logger.error('Auto-tagging failed:', error);
            throw error;
        }
    }

    /**
     * Get tag suggestions for content
     */
    async getTagSuggestions(contentText: string): Promise<TagSuggestion[]> {
        const words = this.tokenizeText(contentText);
        return this.suggestTags(words, contentText);
    }

    /**
     * Get popular tags across all content
     */
    async getPopularTags(limit: number = 50): Promise<Array<{ tag: string; count: number }>> {
        try {
            const result = await this.itemRepository
                .createQueryBuilder('item')
                .select('unnest(item.tags) as tag, COUNT(*) as count')
                .where('item.isActive = :isActive', { isActive: true })
                .andWhere('array_length(item.tags, 1) > 0')
                .groupBy('tag')
                .orderBy('count', 'DESC')
                .limit(limit)
                .getRawMany();

            return result.map(row => ({
                tag: row.tag,
                count: parseInt(row.count, 10),
            }));
        } catch (error) {
            this.logger.error('Failed to get popular tags:', error);
            return [];
        }
    }

    /**
     * Get tag co-occurrence patterns
     */
    async getTagCooccurrence(tag: string, limit: number = 20): Promise<Array<{ tag: string; cooccurrence: number }>> {
        try {
            const result = await this.itemRepository
                .createQueryBuilder('item')
                .select('unnest(item.tags) as related_tag, COUNT(*) as cooccurrence')
                .where('item.isActive = :isActive', { isActive: true })
                .andWhere(':tag = ANY(item.tags)', { tag })
                .andWhere('unnest(item.tags) != :tag', { tag })
                .groupBy('related_tag')
                .orderBy('cooccurrence', 'DESC')
                .limit(limit)
                .getRawMany();

            return result.map(row => ({
                tag: row.related_tag,
                cooccurrence: parseInt(row.cooccurrence, 10),
            }));
        } catch (error) {
            this.logger.error(`Failed to get tag co-occurrence for ${tag}:`, error);
            return [];
        }
    }

    // Private helper methods

    private extractTextContent(content: any, choices?: any[], explanation?: any): string {
        let text = '';

        // Extract from content
        if (content?.text) {
            text += content.text + ' ';
        }
        if (content?.instructions) {
            text += content.instructions + ' ';
        }

        // Extract from choices
        if (choices) {
            choices.forEach(choice => {
                if (choice.text) {
                    text += choice.text + ' ';
                }
                if (choice.explanation) {
                    text += choice.explanation + ' ';
                }
            });
        }

        // Extract from explanation
        if (explanation?.text) {
            text += explanation.text + ' ';
        }

        return text.toLowerCase().trim();
    }

    private tokenizeText(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    private suggestTags(words: string[], fullText: string): TagSuggestion[] {
        const suggestions: TagSuggestion[] = [];

        // Check for topic-based tags
        for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
            const matches = keywords.filter(keyword =>
                fullText.includes(keyword.toLowerCase())
            );

            if (matches.length > 0) {
                const confidence = Math.min(0.9, matches.length * 0.3);
                suggestions.push({
                    tag: topic,
                    confidence,
                    reason: `Matched keywords: ${matches.join(', ')}`,
                });
            }
        }

        // Add specific keyword-based tags
        const specificTags = this.extractSpecificTags(words, fullText);
        suggestions.push(...specificTags);

        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);
    }

    private suggestCategories(words: string[], fullText: string): CategorySuggestion[] {
        const suggestions: CategorySuggestion[] = [];

        // Basic categorization based on content patterns
        if (this.containsAny(fullText, ['sign', 'signal', 'marking'])) {
            suggestions.push({
                category: 'Traffic Control',
                subcategory: 'Signs and Signals',
                confidence: 0.8,
                reason: 'Contains traffic control terminology',
            });
        }

        if (this.containsAny(fullText, ['parking', 'park', 'meter'])) {
            suggestions.push({
                category: 'Vehicle Operation',
                subcategory: 'Parking',
                confidence: 0.8,
                reason: 'Contains parking-related terminology',
            });
        }

        if (this.containsAny(fullText, ['speed', 'limit', 'mph', 'km/h'])) {
            suggestions.push({
                category: 'Traffic Laws',
                subcategory: 'Speed Regulations',
                confidence: 0.8,
                reason: 'Contains speed-related terminology',
            });
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    private calculateTopicRelevance(words: string[], fullText: string): Record<string, number> {
        const relevance: Record<string, number> = {};

        for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
            let score = 0;
            let matchCount = 0;

            for (const keyword of keywords) {
                if (fullText.includes(keyword.toLowerCase())) {
                    score += 1;
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                relevance[topic] = Math.min(1.0, score / keywords.length);
            }
        }

        return relevance;
    }

    private estimateDifficulty(words: string[], fullText: string): number {
        let difficultyScore = 0; // Start at neutral (0)

        // Check for easy indicators
        const easyMatches = this.difficultyIndicators.easy.filter(indicator =>
            fullText.includes(indicator)
        ).length;

        // Check for hard indicators
        const hardMatches = this.difficultyIndicators.hard.filter(indicator =>
            fullText.includes(indicator)
        ).length;

        // Adjust based on text complexity
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        const sentenceComplexity = fullText.split('.').length;

        // Calculate difficulty
        difficultyScore -= easyMatches * 0.3;
        difficultyScore += hardMatches * 0.3;
        difficultyScore += (avgWordLength - 5) * 0.1;
        difficultyScore += (sentenceComplexity - 2) * 0.1;

        // Clamp to reasonable range
        return Math.max(-2, Math.min(2, difficultyScore));
    }

    private determineCognitiveLevel(words: string[], fullText: string): string {
        const levels = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'];
        const scores: Record<string, number> = {};

        for (const level of levels) {
            const indicators = this.cognitiveIndicators[level];
            const matches = indicators.filter(indicator =>
                fullText.includes(indicator)
            ).length;
            scores[level] = matches;
        }

        // Find the level with the highest score
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) {
            return 'knowledge'; // Default to knowledge level
        }

        return Object.keys(scores).find(level => scores[level] === maxScore) || 'knowledge';
    }

    private extractSpecificTags(words: string[], fullText: string): TagSuggestion[] {
        const suggestions: TagSuggestion[] = [];

        // Look for specific patterns
        if (fullText.includes('mph') || fullText.includes('km/h')) {
            suggestions.push({
                tag: 'speed-measurement',
                confidence: 0.9,
                reason: 'Contains speed measurement units',
            });
        }

        if (fullText.includes('intersection')) {
            suggestions.push({
                tag: 'intersection',
                confidence: 0.9,
                reason: 'Mentions intersection',
            });
        }

        if (fullText.includes('pedestrian')) {
            suggestions.push({
                tag: 'pedestrian-safety',
                confidence: 0.9,
                reason: 'Mentions pedestrians',
            });
        }

        return suggestions;
    }

    private containsAny(text: string, keywords: string[]): boolean {
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    }
}