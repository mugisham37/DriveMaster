import { createHash } from 'crypto'

import { Pinecone } from '@pinecone-database/pinecone'
import * as tf from '@tensorflow/tfjs'

export interface VectorEmbedding {
  id: string
  values: number[]
  metadata: Record<string, unknown>
}

export interface SimilarityResult {
  id: string
  score: number
  metadata: Record<string, any>
}

export interface ContentEmbedding extends VectorEmbedding {
  metadata: {
    contentId: string
    conceptKey: string
    difficulty: number
    contentType: 'question' | 'explanation' | 'example' | 'practice'
    tags: string[]
    createdAt: string
    updatedAt: string
  }
}

export interface UserProfileEmbedding extends VectorEmbedding {
  metadata: {
    userId: string
    learningStyle: string
    preferredDifficulty: number
    strongConcepts: string[]
    weakConcepts: string[]
    lastUpdated: string
  }
}

export interface RecommendationQuery {
  userId: string
  conceptKey?: string
  contentType?: string
  targetDifficulty?: number
  excludeIds?: string[]
  topK?: number
}

export class VectorSearchEngine {
  private pinecone: Pinecone
  private contentIndex: any
  private userIndex: any
  private embeddingModel: tf.LayersModel | null = null
  private readonly embeddingDimension = 384 // Sentence transformer dimension
  private readonly contentIndexName = 'drivemaster-content'
  private readonly userIndexName = 'drivemaster-users'
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map()
  private readonly cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(apiKey: string, _environment: string = 'us-west1-gcp') {
    this.pinecone = new Pinecone({
      apiKey,
    })
  }

  /**
   * Initialize Pinecone indexes with optimization
   */
  async initialize(): Promise<void> {
    try {
      // Check if indexes exist, create if not
      await this.ensureIndexesExist()

      // Initialize content index
      this.contentIndex = this.pinecone.Index(this.contentIndexName)

      // Initialize user profile index
      this.userIndex = this.pinecone.Index(this.userIndexName)

      // Load embedding model
      await this.loadEmbeddingModel()

      // Warm up the indexes
      await this.warmupIndexes()

      console.log('Vector Search Engine initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Vector Search Engine:', error)
      throw error
    }
  }

  /**
   * Ensure Pinecone indexes exist
   */
  private async ensureIndexesExist(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes()
      const existingIndexes = indexList.indexes?.map((idx) => idx.name) || []

      // Create content index if it doesn't exist
      if (!existingIndexes.includes(this.contentIndexName)) {
        await this.pinecone.createIndex({
          name: this.contentIndexName,
          dimension: this.embeddingDimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2',
            },
          },
        })
        console.log(`Created content index: ${this.contentIndexName}`)
      }

      // Create user index if it doesn't exist
      if (!existingIndexes.includes(this.userIndexName)) {
        await this.pinecone.createIndex({
          name: this.userIndexName,
          dimension: this.embeddingDimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2',
            },
          },
        })
        console.log(`Created user index: ${this.userIndexName}`)
      }
    } catch (error) {
      console.error('Failed to ensure indexes exist:', error)
      throw error
    }
  }

  /**
   * Warm up indexes with sample queries
   */
  private async warmupIndexes(): Promise<void> {
    try {
      // Create dummy vectors for warmup
      const dummyVector = new Array(this.embeddingDimension).fill(0.1)

      // Warmup content index
      await this.contentIndex.query({
        vector: dummyVector,
        topK: 1,
        includeMetadata: false,
      })

      // Warmup user index
      await this.userIndex.query({
        vector: dummyVector,
        topK: 1,
        includeMetadata: false,
      })

      console.log('Indexes warmed up successfully')
    } catch (error) {
      console.warn(
        'Index warmup failed (this is normal for empty indexes):',
        (error as Error).message,
      )
    }
  }

  /**
   * Load embedding model for text vectorization
   */
  private async loadEmbeddingModel(): Promise<void> {
    try {
      // In production, this would load a sentence transformer model
      // For now, we'll create a simple embedding model
      this.embeddingModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [512], units: 256, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: this.embeddingDimension, activation: 'tanh' }),
        ],
      })

      console.log('Embedding model loaded')
    } catch (error) {
      console.error('Failed to load embedding model:', error)
      throw error
    }
  }

  /**
   * Generate text embedding
   */
  async generateTextEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model not loaded')
    }

    try {
      // Simple text preprocessing and tokenization
      const tokens = this.tokenizeText(text)
      const inputTensor = tf.tensor2d([tokens], [1, tokens.length])

      // Generate embedding
      const embedding = this.embeddingModel.predict(inputTensor) as tf.Tensor
      const embeddingData = await embedding.data()

      // Clean up tensors
      inputTensor.dispose()
      embedding.dispose()

      return Array.from(embeddingData)
    } catch (error) {
      console.error('Failed to generate text embedding:', error)
      throw error
    }
  }

  /**
   * Simple text tokenization (would use proper tokenizer in production)
   */
  private tokenizeText(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/).slice(0, 512) // Limit to 512 tokens
    const tokens = new Array(512).fill(0)

    for (let i = 0; i < words.length; i++) {
      // Simple hash-based tokenization
      const hash = createHash('md5')
        .update(words[i] || '')
        .digest('hex')
      tokens[i] = (parseInt(hash.substring(0, 8), 16) % 50000) / 50000 // Normalize to [0,1]
    }

    return tokens
  }

  /**
   * Generate content embedding from content metadata
   */
  async generateContentEmbedding(content: {
    id: string
    title: string
    description: string
    conceptKey: string
    difficulty: number
    contentType: string
    tags: string[]
  }): Promise<ContentEmbedding> {
    // Combine text fields for embedding
    const textContent = [
      content.title,
      content.description,
      content.conceptKey,
      ...content.tags,
    ].join(' ')

    const embedding = await this.generateTextEmbedding(textContent)

    return {
      id: content.id,
      values: embedding,
      metadata: {
        contentId: content.id,
        conceptKey: content.conceptKey,
        difficulty: content.difficulty,
        contentType: content.contentType as any,
        tags: content.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Generate user profile embedding
   */
  async generateUserProfileEmbedding(userProfile: {
    userId: string
    learningHistory: any[]
    preferences: Record<string, any>
    knowledgeStates: Record<string, number>
  }): Promise<UserProfileEmbedding> {
    // Create user profile text representation
    const strongConcepts = Object.entries(userProfile.knowledgeStates)
      .filter(([_, mastery]) => mastery > 0.7)
      .map(([concept, _]) => concept)

    const weakConcepts = Object.entries(userProfile.knowledgeStates)
      .filter(([_, mastery]) => mastery < 0.3)
      .map(([concept, _]) => concept)

    const profileText = [
      `Learning style: ${userProfile.preferences.learningStyle || 'visual'}`,
      `Strong concepts: ${strongConcepts.join(', ')}`,
      `Weak concepts: ${weakConcepts.join(', ')}`,
      `Preferred difficulty: ${userProfile.preferences.preferredDifficulty || 0.5}`,
    ].join(' ')

    const embedding = await this.generateTextEmbedding(profileText)

    return {
      id: userProfile.userId,
      values: embedding,
      metadata: {
        userId: userProfile.userId,
        learningStyle: userProfile.preferences.learningStyle || 'visual',
        preferredDifficulty: userProfile.preferences.preferredDifficulty || 0.5,
        strongConcepts,
        weakConcepts,
        lastUpdated: new Date().toISOString(),
      },
    }
  }

  /**
   * Index content embedding in Pinecone
   */
  async indexContent(contentEmbedding: ContentEmbedding): Promise<void> {
    try {
      await this.contentIndex.upsert([
        {
          id: contentEmbedding.id,
          values: contentEmbedding.values,
          metadata: contentEmbedding.metadata,
        },
      ])

      console.log(`Content ${contentEmbedding.id} indexed successfully`)
    } catch (error) {
      console.error(`Failed to index content ${contentEmbedding.id}:`, error)
      throw error
    }
  }

  /**
   * Index user profile embedding in Pinecone
   */
  async indexUserProfile(userEmbedding: UserProfileEmbedding): Promise<void> {
    try {
      await this.userIndex.upsert([
        {
          id: userEmbedding.id,
          values: userEmbedding.values,
          metadata: userEmbedding.metadata,
        },
      ])

      console.log(`User profile ${userEmbedding.id} indexed successfully`)
    } catch (error) {
      console.error(`Failed to index user profile ${userEmbedding.id}:`, error)
      throw error
    }
  }

  /**
   * Batch index multiple content items
   */
  async batchIndexContent(contentEmbeddings: ContentEmbedding[]): Promise<void> {
    try {
      const batchSize = 100
      for (let i = 0; i < contentEmbeddings.length; i += batchSize) {
        const batch = contentEmbeddings.slice(i, i + batchSize)
        const vectors = batch.map((embedding) => ({
          id: embedding.id,
          values: embedding.values,
          metadata: embedding.metadata,
        }))

        await this.contentIndex.upsert(vectors)
        console.log(`Batch ${Math.floor(i / batchSize) + 1} indexed (${vectors.length} items)`)
      }
    } catch (error) {
      console.error('Failed to batch index content:', error)
      throw error
    }
  }

  /**
   * Find similar content with caching and optimization
   */
  async findSimilarContent(query: RecommendationQuery): Promise<SimilarityResult[]> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('content', query)
      const cached = this.queryCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result
      }

      // Get user profile embedding
      const userEmbedding = await this.getUserEmbedding(query.userId)
      if (!userEmbedding) {
        throw new Error(`User profile embedding not found for user ${query.userId}`)
      }

      // Build optimized filter for metadata
      const filter: Record<string, any> = {}
      if (query.conceptKey) {
        filter.conceptKey = { $eq: query.conceptKey }
      }
      if (query.contentType) {
        filter.contentType = { $eq: query.contentType }
      }
      if (query.targetDifficulty !== undefined) {
        // Optimized difficulty range filtering
        const difficultyRange = 0.15 // Tighter range for better precision
        filter.difficulty = {
          $gte: Math.max(0, query.targetDifficulty - difficultyRange),
          $lte: Math.min(1, query.targetDifficulty + difficultyRange),
        }
      }

      // Perform optimized similarity search
      const searchResult = await this.contentIndex.query({
        vector: userEmbedding.values,
        topK: Math.min(query.topK || 10, 50), // Limit to prevent excessive results
        filter,
        includeMetadata: true,
        includeValues: false, // Don't return vectors to save bandwidth
      })

      // Process and filter results
      let results =
        searchResult.matches
          ?.filter((match: any) => {
            // Filter out excluded IDs
            if (query.excludeIds?.includes(match.id)) return false

            // Additional quality filters
            if (match.score < 0.3) return false // Minimum similarity threshold

            return true
          })
          .map((match: any) => ({
            id: match.id,
            score: match.score || 0,
            metadata: match.metadata || {},
          })) || []

      // Apply diversity filtering to avoid too similar results
      results = this.diversifyResults(results, 0.8) // 80% similarity threshold

      // Cache the results
      this.queryCache.set(cacheKey, {
        result: results,
        timestamp: Date.now(),
      })

      // Clean up old cache entries
      this.cleanupCache()

      return results
    } catch (error) {
      console.error('Failed to find similar content:', error)
      throw error
    }
  }

  /**
   * Diversify results to avoid too similar content
   */
  private diversifyResults(results: SimilarityResult[], threshold: number): SimilarityResult[] {
    if (results.length <= 1) return results

    const firstResult = results[0]
    if (!firstResult) return results

    const diversified: SimilarityResult[] = [firstResult] // Always include the top result

    for (let i = 1; i < results.length; i++) {
      const candidate = results[i]
      if (!candidate) continue

      let isDiverse = true

      // Check if candidate is too similar to already selected results
      for (const selected of diversified) {
        const similarity = this.calculateContentSimilarity(candidate, selected)
        if (similarity > threshold) {
          isDiverse = false
          break
        }
      }

      if (isDiverse) {
        diversified.push(candidate)
      }

      // Limit diversified results
      if (diversified.length >= 10) break
    }

    return diversified
  }

  /**
   * Calculate content similarity based on metadata
   */
  private calculateContentSimilarity(
    content1: SimilarityResult,
    content2: SimilarityResult,
  ): number {
    let similarity = 0
    let factors = 0

    // Concept similarity
    if (content1.metadata.conceptKey === content2.metadata.conceptKey) {
      similarity += 0.4
    }
    factors++

    // Content type similarity
    if (content1.metadata.contentType === content2.metadata.contentType) {
      similarity += 0.3
    }
    factors++

    // Difficulty similarity
    const difficultyDiff = Math.abs(
      (content1.metadata.difficulty || 0.5) - (content2.metadata.difficulty || 0.5),
    )
    similarity += (1 - difficultyDiff) * 0.3
    factors++

    return similarity / factors
  }

  /**
   * Generate cache key for queries
   */
  private generateCacheKey(type: string, query: any): string {
    const keyData = {
      type,
      ...query,
      // Sort arrays for consistent keys
      excludeIds: query.excludeIds?.sort(),
    }
    return createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.queryCache.delete(key)
      }
    }

    // Limit cache size
    if (this.queryCache.size > 1000) {
      const entries = Array.from(this.queryCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2)
      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i]
        if (entry) {
          this.queryCache.delete(entry[0])
        }
      }
    }
  }

  /**
   * Find similar users for collaborative filtering
   */
  async findSimilarUsers(userId: string, topK: number = 10): Promise<SimilarityResult[]> {
    try {
      const userEmbedding = await this.getUserEmbedding(userId)
      if (!userEmbedding) {
        throw new Error(`User profile embedding not found for user ${userId}`)
      }

      const searchResult = await this.userIndex.query({
        vector: userEmbedding.values,
        topK: topK + 1, // +1 to exclude self
        includeMetadata: true,
      })

      // Filter out the querying user
      const results =
        searchResult.matches
          ?.filter((match: any) => match.id !== userId)
          .map((match: any) => ({
            id: match.id,
            score: match.score || 0,
            metadata: match.metadata || {},
          })) || []

      return results.slice(0, topK)
    } catch (error) {
      console.error('Failed to find similar users:', error)
      throw error
    }
  }

  /**
   * Get content recommendations using hybrid approach
   */
  async getContentRecommendations(query: RecommendationQuery): Promise<{
    contentBased: SimilarityResult[]
    collaborative: SimilarityResult[]
    hybrid: SimilarityResult[]
  }> {
    try {
      // Content-based recommendations
      const contentBased = await this.findSimilarContent(query)

      // Collaborative filtering recommendations
      const similarUsers = await this.findSimilarUsers(query.userId, 5)
      const collaborative: SimilarityResult[] = []

      // Get content liked by similar users (simplified)
      for (const similarUser of similarUsers) {
        const userContent = await this.findSimilarContent({
          ...query,
          userId: similarUser.id,
          topK: 3,
        })
        collaborative.push(
          ...userContent.map((item) => ({
            ...item,
            score: item.score * similarUser.score, // Weight by user similarity
          })),
        )
      }

      // Hybrid recommendations (combine and re-rank)
      const hybrid = this.combineRecommendations(contentBased, collaborative, query.topK || 10)

      return {
        contentBased,
        collaborative,
        hybrid,
      }
    } catch (error) {
      console.error('Failed to get content recommendations:', error)
      throw error
    }
  }

  /**
   * Combine content-based and collaborative recommendations
   */
  private combineRecommendations(
    contentBased: SimilarityResult[],
    collaborative: SimilarityResult[],
    topK: number,
  ): SimilarityResult[] {
    const combined = new Map<string, SimilarityResult>()

    // Add content-based recommendations with weight 0.7
    for (const item of contentBased) {
      combined.set(item.id, {
        ...item,
        score: item.score * 0.7,
      })
    }

    // Add collaborative recommendations with weight 0.3
    for (const item of collaborative) {
      const existing = combined.get(item.id)
      if (existing) {
        // Combine scores
        existing.score = existing.score + item.score * 0.3
      } else {
        combined.set(item.id, {
          ...item,
          score: item.score * 0.3,
        })
      }
    }

    // Sort by combined score and return top K
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  /**
   * Get user embedding from index
   */
  private async getUserEmbedding(userId: string): Promise<UserProfileEmbedding | null> {
    try {
      const result = await this.userIndex.fetch([userId])
      const vector = result.vectors?.[userId]

      if (!vector) return null

      return {
        id: userId,
        values: vector.values || [],
        metadata: vector.metadata as UserProfileEmbedding['metadata'],
      }
    } catch (error) {
      console.error(`Failed to get user embedding for ${userId}:`, error)
      return null
    }
  }

  /**
   * Update user profile embedding
   */
  async updateUserProfile(userProfile: {
    userId: string
    learningHistory: any[]
    preferences: Record<string, any>
    knowledgeStates: Record<string, number>
  }): Promise<void> {
    const embedding = await this.generateUserProfileEmbedding(userProfile)
    await this.indexUserProfile(embedding)
  }

  /**
   * Delete content from index
   */
  async deleteContent(contentId: string): Promise<void> {
    try {
      await this.contentIndex.deleteOne(contentId)
      console.log(`Content ${contentId} deleted from index`)
    } catch (error) {
      console.error(`Failed to delete content ${contentId}:`, error)
      throw error
    }
  }

  /**
   * Delete user profile from index
   */
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      await this.userIndex.deleteOne(userId)
      console.log(`User profile ${userId} deleted from index`)
    } catch (error) {
      console.error(`Failed to delete user profile ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    contentIndex: any
    userIndex: unknown
  }> {
    try {
      const [contentStats, userStats] = await Promise.all([
        this.contentIndex.describeIndexStats(),
        this.userIndex.describeIndexStats(),
      ])

      return {
        contentIndex: contentStats,
        userIndex: userStats,
      }
    } catch (error) {
      console.error('Failed to get index statistics:', error)
      throw error
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.embeddingModel) {
      this.embeddingModel.dispose()
      this.embeddingModel = null
    }
    console.log('Vector Search Engine disposed')
  }
}
