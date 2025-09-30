import { Pinecone } from '@pinecone-database/pinecone'
import * as tf from '@tensorflow/tfjs-node'
import { EventEmitter } from 'events'
import { logger } from '@drivemaster/shared-config'

export interface VectorEmbedding {
  id: string
  values: number[]
  metadata: Record<string, any>
}

export interface SimilaritySearchRequest {
  vector?: number[]
  text?: string
  topK?: number
  filter?: Record<string, any>
  includeMetadata?: boolean
  includeValues?: boolean
}

export interface SimilaritySearchResult {
  id: string
  score: number
  values?: number[]
  metadata?: Record<string, any>
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
    subtopic?: string
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
  private pinecone: Pinecone
  private index: any
  private textEncoder: tf.LayersModel | null = null
  private readonly indexName = 'drivemaster-content'
  private readonly dimension = 384 // Using sentence-transformers dimension

  constructor() {
    super()
    this.initializePinecone()
  }

  /**
   * Initialize Pinecone client and index
   */
  private async initializePinecone(): Promise<void> {
    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || '',
      })

      // Check if index exists, create if not
      const indexList = await this.pinecone.listIndexes()
      const indexExists = indexList.indexes?.some((idx) => idx.name === this.indexName)

      if (!indexExists) {
        await this.createIndex()
      }

      this.index = this.pinecone.index(this.indexName)

      // Initialize text encoder model
      await this.initializeTextEncoder()

      logger.info('Pinecone vector search service initialized successfully')
      this.emit('initialized')
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error)
      throw new Error(`Pinecone initialization failed: ${error.message}`)
    }
  }

  /**
   * Create Pinecone index with optimal configuration
   */
  private async createIndex(): Promise<void> {
    try {
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
  private async initializeTextEncoder(): Promise<void> {
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
      throw new Error(`Embedding generation failed: ${error.message}`)
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
      metadata: Record<string, any>
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
      await this.index.upsert(vectors)

      logger.info(`Indexed ${vectors.length} content items to Pinecone`)
      this.emit('contentIndexed', { count: vectors.length })
    } catch (error) {
      logger.error('Failed to index content:', error)
      throw new Error(`Content indexing failed: ${error.message}`)
    }
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(request: SimilaritySearchRequest): Promise<SimilaritySearchResult[]> {
    try {
      let queryVector: number[]

      if (request.vector) {
        queryVector = request.vector
      } else if (request.text) {
        queryVector = await this.generateEmbedding(request.text)
      } else {
        throw new Error('Either vector or text must be provided')
      }

      const queryRequest: any = {
        vector: queryVector,
        topK: request.topK || 10,
        includeMetadata: request.includeMetadata !== false,
        includeValues: request.includeValues || false,
      }

      if (request.filter) {
        queryRequest.filter = request.filter
      }

      const response = await this.index.query(queryRequest)

      return response.matches.map((match: any) => ({
        id: match.id,
        score: match.score,
        values: match.values,
        metadata: match.metadata,
      }))
    } catch (error) {
      logger.error('Similarity search failed:', error)
      throw new Error(`Similarity search failed: ${error.message}`)
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
      const filter: Record<string, any> = {}
      if (context.currentTopic) {
        filter.topic = context.currentTopic
      }
      if (context.difficulty) {
        filter.difficulty = { $gte: context.difficulty - 0.5, $lte: context.difficulty + 0.5 }
      }
      if (context.timeAvailable) {
        filter.estimated_time = { $lte: context.timeAvailable }
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
        const metadata = result.metadata || {}

        return {
          contentId: result.id,
          title: metadata.title || 'Untitled Content',
          type: metadata.type || 'question',
          difficulty: metadata.difficulty || 1,
          relevanceScore: result.score,
          reasoning: this.generateRecommendationReasoning(result, userProfile, context),
          metadata: {
            topic: metadata.topic || 'general',
            subtopic: metadata.subtopic,
            estimatedTime: metadata.estimated_time || 5,
            prerequisites: metadata.prerequisites || [],
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
      throw new Error(`Content recommendation failed: ${error.message}`)
    }
  }

  /**
   * Create personalized query vector
   */
  private createPersonalizedQueryVector(userProfile: UserProfile, context: any): number[] {
    // Combine user knowledge vector with learning preferences
    const queryVector = new Array(this.dimension).fill(0)

    // Weight knowledge vector (60%)
    for (let i = 0; i < Math.min(userProfile.knowledgeVector.length, this.dimension * 0.6); i++) {
      queryVector[i] = userProfile.knowledgeVector[i] * 0.6
    }

    // Weight learning preferences (25%)
    const prefOffset = Math.floor(this.dimension * 0.6)
    for (
      let i = 0;
      i < Math.min(userProfile.learningPreferences.length, this.dimension * 0.25);
      i++
    ) {
      queryVector[prefOffset + i] = userProfile.learningPreferences[i] * 0.25
    }

    // Weight performance history (15%)
    const perfOffset = Math.floor(this.dimension * 0.85)
    for (
      let i = 0;
      i < Math.min(userProfile.performanceHistory.length, this.dimension * 0.15);
      i++
    ) {
      queryVector[perfOffset + i] = userProfile.performanceHistory[i] * 0.15
    }

    return queryVector
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateRecommendationReasoning(
    result: SimilaritySearchResult,
    userProfile: UserProfile,
    context: any,
  ): string {
    const reasons = []

    if (result.score > 0.8) {
      reasons.push('highly relevant to your learning profile')
    }

    if (result.metadata?.difficulty) {
      const userLevel =
        userProfile.knowledgeVector.reduce((a, b) => a + b, 0) / userProfile.knowledgeVector.length
      if (Math.abs(result.metadata.difficulty - userLevel) < 0.3) {
        reasons.push('matches your current skill level')
      }
    }

    if (context.currentTopic && result.metadata?.topic === context.currentTopic) {
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
    context: any,
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
  async updateUserProfile(
    userId: string,
    interactions: {
      contentId: string
      interactionType: 'view' | 'complete' | 'skip' | 'like'
      performance?: number
      timeSpent?: number
    }[],
  ): Promise<void> {
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
      const stats = await this.index.describeIndexStats()

      return {
        totalVectors: stats.totalVectorCount || 0,
        dimension: stats.dimension || this.dimension,
        indexFullness: stats.indexFullness || 0,
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
