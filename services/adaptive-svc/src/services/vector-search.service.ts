import { EventEmitter } from 'events'

import { Pinecone } from '@pinecone-database/pinecone'
import * as tf from '@tensorflow/tfjs'

import { logger } from '../utils/logger'

export interface VectorEmbedding {
  id: string
  values: number[]
  metadata: Record<string, unknown>
}

export interface SimilaritySearchRequest {
  vector?: number[]
  text?: string
  topK?: number
  filter?: Record<string, unknown>
  includeMetadata?: boolean
  includeValues?: boolean
}

export interface SimilaritySearchResult {
  id: string
  score: number
  values?: number[] | undefined
  metadata?: Record<string, unknown> | undefined
}

export interface PineconeQueryRequest {
  vector: number[]
  topK: number
  includeMetadata: boolean
  includeValues: boolean
  filter?: Record<string, unknown>
}

export interface PineconeQueryResponse {
  matches: Array<{
    id: string
    score: number
    values?: number[]
    metadata?: Record<string, unknown>
  }>
}

export interface PineconeIndex {
  upsert: (vectors: VectorEmbedding[]) => Promise<void>
  query: (request: PineconeQueryRequest) => Promise<PineconeQueryResponse>
  describeIndexStats: () => Promise<{
    totalVectorCount?: number
    dimension?: number
    indexFullness?: number
  }>
}

export interface PineconeIndexList {
  indexes?: Array<{ name: string }>
}

export interface ContentRecommendation {
  contentId: string
  title: string
  type: 'question' | 'explanation' | 'practice' | 'video'
  difficulty: number
  relevanceScore: number
  reasoning: string
  metadata: {
    topic: string
    subtopic?: string | undefined
    estimatedTime: number
    prerequisites: string[]
  }
}

export interface UserProfile {
  userId: string
  knowledgeVector: number[]
  learningPreferences: number[]
  performanceHistory: number[]
  lastUpdated: Date
}

export class VectorSearchService extends EventEmitter {
  private pinecone: Pinecone | null = null
  private index: PineconeIndex | null = null
  private textEncoder: tf.LayersModel | null = null
  private readonly indexName = 'drivemaster-content'
  private readonly dimension = 384 // Using sentence-transformers dimension

  constructor() {
    super()
    void this.initializePinecone().catch((error) => {
      logger.error('Failed to initialize Pinecone during construction:', error)
    })
  }

  /**
   * Initialize Pinecone client and index
   */
  private async initializePinecone(): Promise<void> {
    try {
      const apiKey = process.env.PINECONE_API_KEY
      if ((apiKey?.length ?? 0) === 0) {
        throw new Error('PINECONE_API_KEY environment variable is required')
      }

      this.pinecone = new Pinecone({
        apiKey: apiKey as string,
      })

      // Check if index exists, create if not
      const indexList = await this.pinecone.listIndexes()
      const indexExists = Boolean(indexList.indexes?.some((idx) => idx.name === this.indexName))

      if (!indexExists) {
        await this.createIndex()
      }

      this.index = this.pinecone.index(this.indexName) as PineconeIndex

      // Initialize text encoder model
      this.initializeTextEncoder()

      logger.info('Pinecone vector search service initialized successfully')
      this.emit('initialized')
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error)
      throw new Error(
        `Pinecone initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Create Pinecone index with optimal configuration
   */
  private async createIndex(): Promise<void> {
    try {
      if (!this.pinecone) {
        throw new Error('Pinecone client not initialized')
      }

      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: this.dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      })

      logger.info(`Created Pinecone index: ${this.indexName}`)
    } catch (error) {
      logger.error('Failed to create Pinecone index:', error)
      throw error
    }
  }

  /**
   * Initialize text encoder for generating embeddings
   */
  private initializeTextEncoder(): void {
    try {
      // Create a simple text encoder using TensorFlow.js
      // In production, you would load a pre-trained sentence transformer model
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [512], units: 256, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.1 }),
          tf.layers.dense({ units: this.dimension, activation: 'tanh' }),
        ],
      })

      this.textEncoder = model
      logger.info('Text encoder model initialized')
    } catch (error) {
      logger.error('Failed to initialize text encoder:', error)
      throw error
    }
  }

  /**
   * Generate vector embedding from text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.textEncoder) {
        throw new Error('Text encoder not initialized')
      }

      // Simple text preprocessing and tokenization
      const tokens = this.tokenizeText(text)
      const inputTensor = tf.tensor2d([tokens], [1, tokens.length])

      // Generate embedding
      const embedding = this.textEncoder.predict(inputTensor) as tf.Tensor
      const embeddingData = await embedding.data()

      // Cleanup tensors
      inputTensor.dispose()
      embedding.dispose()

      return Array.from(embeddingData)
    } catch (error) {
      logger.error('Failed to generate embedding:', error)
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Simple text tokenization (in production, use proper tokenizer)
   */
  private tokenizeText(text: string): number[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0)

    // Simple word to number mapping (in production, use proper vocabulary)
    const tokens = words.map((word) => {
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
      }
      return Math.abs(hash) % 10000 // Vocabulary size
    })

    // Pad or truncate to fixed length
    const maxLength = 512
    while (tokens.length < maxLength) {
      tokens.push(0)
    }

    return tokens.slice(0, maxLength)
  }

  /**
   * Index content with vector embeddings
   */
  async indexContent(
    content: {
      id: string
      text: string
      metadata: Record<string, unknown>
    }[],
  ): Promise<void> {
    try {
      const vectors: VectorEmbedding[] = []

      for (const item of content) {
        const embedding = await this.generateEmbedding(item.text)
        vectors.push({
          id: item.id,
          values: embedding,
          metadata: {
            ...item.metadata,
            text: item.text,
            indexed_at: new Date().toISOString(),
          },
        })
      }

      // Batch upsert to Pinecone
      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }
      await this.index.upsert(vectors)

      logger.info(`Indexed ${vectors.length} content items to Pinecone`)
      this.emit('contentIndexed', { count: vectors.length })
    } catch (error) {
      logger.error('Failed to index content:', error)
      throw new Error(
        `Content indexing failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(request: SimilaritySearchRequest): Promise<SimilaritySearchResult[]> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      let queryVector: number[]

      if (request.vector) {
        queryVector = request.vector
      } else if ((request.text?.length ?? 0) > 0) {
        queryVector = await this.generateEmbedding(request.text as string)
      } else {
        throw new Error('Either vector or text must be provided')
      }

      const queryRequest: PineconeQueryRequest = {
        vector: queryVector,
        topK: request.topK ?? 10,
        includeMetadata: request.includeMetadata !== false,
        includeValues: request.includeValues ?? false,
      }

      if (request.filter) {
        queryRequest.filter = request.filter
      }

      const response = await this.index.query(queryRequest)

      return response.matches.map((match) => ({
        id: match.id,
        score: match.score,
        values: match.values ?? undefined,
        metadata: match.metadata ?? undefined,
      }))
    } catch (error) {
      logger.error('Similarity search failed:', error)
      throw new Error(
        `Similarity search failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate personalized content recommendations
   */
  async getContentRecommendations(
    userId: string,
    userProfile: UserProfile,
    context: {
      currentTopic?: string
      difficulty?: number
      sessionGoals?: string[]
      timeAvailable?: number
    } = {},
  ): Promise<ContentRecommendation[]> {
    try {
      // Create query vector combining user profile and context
      const queryVector = this.createPersonalizedQueryVector(userProfile, context)

      // Build filter based on context
      const filter: Record<string, unknown> = {}
      if ((context.currentTopic?.length ?? 0) > 0) {
        filter.topic = context.currentTopic as string
      }
      if ((context.difficulty ?? 0) > 0) {
        filter.difficulty = {
          $gte: (context.difficulty as number) - 0.5,
          $lte: (context.difficulty as number) + 0.5,
        }
      }
      if ((context.timeAvailable ?? 0) > 0) {
        filter.estimated_time = { $lte: context.timeAvailable as number }
      }

      // Perform similarity search
      const searchResults = await this.similaritySearch({
        vector: queryVector,
        topK: 20,
        filter,
        includeMetadata: true,
      })

      // Convert to content recommendations with reasoning
      const recommendations: ContentRecommendation[] = searchResults.map((result) => {
        const metadata = result.metadata ?? {}

        const title =
          (this.getMetadataValue(metadata, 'title', 'string') as string) ?? 'Untitled Content'
        const type = (this.getMetadataValue(metadata, 'type', 'string') as string) ?? 'question'
        const difficulty = (this.getMetadataValue(metadata, 'difficulty', 'number') as number) ?? 1
        const topic = (this.getMetadataValue(metadata, 'topic', 'string') as string) ?? 'general'
        const subtopic = this.getMetadataValue(metadata, 'subtopic', 'string') as string | undefined
        const estimatedTime =
          (this.getMetadataValue(metadata, 'estimated_time', 'number') as number) ?? 5
        const prerequisites =
          (this.getMetadataValue(metadata, 'prerequisites', 'array') as string[]) ?? []

        return {
          contentId: result.id,
          title,
          type: type as 'question' | 'explanation' | 'practice' | 'video',
          difficulty,
          relevanceScore: result.score,
          reasoning: this.generateRecommendationReasoning(result, userProfile, context),
          metadata: {
            topic,
            subtopic,
            estimatedTime,
            prerequisites,
          },
        }
      })

      // Sort by relevance and apply business logic
      const sortedRecommendations = this.applyRecommendationLogic(
        recommendations,
        userProfile,
        context,
      )

      logger.info(`Generated ${sortedRecommendations.length} recommendations for user ${userId}`)

      return sortedRecommendations.slice(0, 10) // Return top 10
    } catch (error) {
      logger.error('Failed to generate content recommendations:', error)
      throw new Error(
        `Content recommendation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Safely extract metadata values with type checking
   */
  private getMetadataValue(
    metadata: Record<string, unknown>,
    key: string,
    expectedType: 'string' | 'number' | 'array',
  ): unknown {
    const value = metadata[key]

    switch (expectedType) {
      case 'string':
        return typeof value === 'string' ? value : undefined
      case 'number':
        return typeof value === 'number' ? value : undefined
      case 'array':
        return Array.isArray(value) ? value : undefined
      default:
        return value
    }
  }

  /**
   * Create personalized query vector
   */
  private createPersonalizedQueryVector(
    userProfile: UserProfile,
    _context: {
      currentTopic?: string
      difficulty?: number
      sessionGoals?: string[]
      timeAvailable?: number
    },
  ): number[] {
    // Combine user knowledge vector with learning preferences
    const queryVector = new Array(this.dimension).fill(0)

    // Weight knowledge vector (60%)
    const knowledgeVectorLength = userProfile.knowledgeVector?.length ?? 0
    const maxKnowledgeElements = Math.min(knowledgeVectorLength, Math.floor(this.dimension * 0.6))
    for (let i = 0; i < maxKnowledgeElements; i++) {
      const value = userProfile.knowledgeVector?.[i]
      if (value !== undefined) {
        queryVector[i] = value * 0.6
      }
    }

    // Weight learning preferences (25%)
    const prefOffset = Math.floor(this.dimension * 0.6)
    const learningPreferencesLength = userProfile.learningPreferences?.length ?? 0
    const maxPrefElements = Math.min(learningPreferencesLength, Math.floor(this.dimension * 0.25))
    for (let i = 0; i < maxPrefElements; i++) {
      const value = userProfile.learningPreferences?.[i]
      if (value !== undefined) {
        queryVector[prefOffset + i] = value * 0.25
      }
    }

    // Weight performance history (15%)
    const perfOffset = Math.floor(this.dimension * 0.85)
    const performanceHistoryLength = userProfile.performanceHistory?.length ?? 0
    const maxPerfElements = Math.min(performanceHistoryLength, Math.floor(this.dimension * 0.15))
    for (let i = 0; i < maxPerfElements; i++) {
      const value = userProfile.performanceHistory?.[i]
      if (value !== undefined) {
        queryVector[perfOffset + i] = value * 0.15
      }
    }

    return queryVector as number[]
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateRecommendationReasoning(
    result: SimilaritySearchResult,
    userProfile: UserProfile,
    context: {
      currentTopic?: string
      difficulty?: number
      sessionGoals?: string[]
      timeAvailable?: number
    },
  ): string {
    const reasons = []

    if (result.score > 0.8) {
      reasons.push('highly relevant to your learning profile')
    }

    const difficultyValue = this.getMetadataValue(result.metadata ?? {}, 'difficulty', 'number')
    if (typeof difficultyValue === 'number' && userProfile.knowledgeVector.length > 0) {
      const userLevel =
        userProfile.knowledgeVector.reduce((a, b) => a + b, 0) / userProfile.knowledgeVector.length
      if (Math.abs(difficultyValue - userLevel) < 0.3) {
        reasons.push('matches your current skill level')
      }
    }

    const topicValue = this.getMetadataValue(result.metadata ?? {}, 'topic', 'string')
    if (
      (context.currentTopic?.length ?? 0) > 0 &&
      typeof topicValue === 'string' &&
      topicValue === context.currentTopic
    ) {
      reasons.push('directly related to your current topic')
    }

    if (reasons.length === 0) {
      reasons.push('selected based on your learning patterns')
    }

    return reasons.join(', ')
  }

  /**
   * Apply business logic to recommendations
   */
  private applyRecommendationLogic(
    recommendations: ContentRecommendation[],
    userProfile: UserProfile,
    _context: unknown,
  ): ContentRecommendation[] {
    return recommendations
      .sort((a, b) => {
        // Primary sort by relevance score
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
          return b.relevanceScore - a.relevanceScore
        }

        // Secondary sort by difficulty appropriateness
        const userLevel =
          userProfile.knowledgeVector.reduce((sum, val) => sum + val, 0) /
          userProfile.knowledgeVector.length
        const aDiffScore = Math.abs(a.difficulty - userLevel)
        const bDiffScore = Math.abs(b.difficulty - userLevel)

        return aDiffScore - bDiffScore
      })
      .filter((rec) => {
        // Filter out content that's too easy or too hard
        const userLevel =
          userProfile.knowledgeVector.reduce((sum, val) => sum + val, 0) /
          userProfile.knowledgeVector.length
        return Math.abs(rec.difficulty - userLevel) <= 1.0
      })
  }

  /**
   * Update user profile vector based on interactions
   */
  updateUserProfile(
    userId: string,
    interactions: {
      contentId: string
      interactionType: 'view' | 'complete' | 'skip' | 'like'
      performance?: number
      timeSpent?: number
    }[],
  ): void {
    try {
      // This would typically update the user profile in your database
      // and potentially re-index user preferences

      logger.info(`Updated user profile for ${userId} with ${interactions.length} interactions`)
      this.emit('userProfileUpdated', { userId, interactions })
    } catch (error) {
      logger.error('Failed to update user profile:', error)
      throw error
    }
  }

  /**
   * Get vector database statistics
   */
  async getIndexStats(): Promise<{
    totalVectors: number
    dimension: number
    indexFullness: number
  }> {
    try {
      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      const stats = await this.index.describeIndexStats()

      return {
        totalVectors: stats.totalVectorCount ?? 0,
        dimension: stats.dimension ?? this.dimension,
        indexFullness: stats.indexFullness ?? 0,
      }
    } catch (error) {
      logger.error('Failed to get index stats:', error)
      throw error
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.textEncoder) {
      this.textEncoder.dispose()
      this.textEncoder = null
    }

    logger.info('Vector Search Service disposed')
  }
}

export const vectorSearchService = new VectorSearchService()
