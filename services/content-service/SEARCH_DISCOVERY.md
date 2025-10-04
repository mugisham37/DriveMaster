# Content Search and Discovery Implementation

This document describes the implementation of the content search and discovery system for the adaptive learning platform.

## Overview

The search and discovery system provides:

- Full-text search with relevance scoring
- Faceted search with filters
- Content recommendations based on usage patterns
- Automatic content tagging and categorization
- Search suggestions and autocomplete

## Architecture

### Core Components

1. **SearchService** - Main search functionality using Elasticsearch
2. **ContentRecommendationService** - ML-based content recommendations
3. **ContentTaggingService** - Automatic content analysis and tagging
4. **SearchIntegrationService** - Integration with content lifecycle events

### Elasticsearch Integration

The system uses Elasticsearch for:

- Full-text search across content items
- Faceted search with aggregations
- Search suggestions and autocomplete
- Content similarity analysis

#### Index Structure

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "slug": { "type": "keyword" },
      "content": {
        "properties": {
          "text": { "type": "text", "analyzer": "standard" },
          "instructions": { "type": "text" }
        }
      },
      "choices": {
        "type": "nested",
        "properties": {
          "text": { "type": "text" }
        }
      },
      "topics": { "type": "keyword" },
      "jurisdictions": { "type": "keyword" },
      "difficulty": { "type": "float" },
      "tags": { "type": "keyword" },
      "suggest": { "type": "completion" }
    }
  }
}
```

## Features

### 1. Full-Text Search

**Endpoint:** `GET /search`

Supports:

- Multi-field search across content, choices, and explanations
- Relevance scoring with field boosting
- Fuzzy matching for typos
- Filtering by topics, jurisdictions, difficulty, etc.
- Pagination and sorting

**Example:**

```typescript
const results = await searchService.search({
  query: "traffic signs",
  topics: ["road-signs"],
  minDifficulty: 0,
  maxDifficulty: 2,
  page: 1,
  limit: 20,
});
```

### 2. Faceted Search

**Endpoint:** `POST /search/faceted`

Provides:

- Dynamic facet counts for filtering
- Multi-select facet filtering
- Facet-based navigation
- Real-time facet updates

**Facets Available:**

- Topics
- Jurisdictions
- Item Types
- Cognitive Levels
- Difficulty Ranges
- Tags

### 3. Search Suggestions

**Endpoint:** `GET /search/suggestions`

Features:

- Autocomplete for search queries
- Topic-based suggestions
- Content-based suggestions
- Configurable suggestion limits

### 4. Content Recommendations

#### Similar Content

**Endpoint:** `GET /search/recommendations/similar`

Uses Elasticsearch "More Like This" query to find similar content based on:

- Content text similarity
- Topic overlap
- Cognitive level matching

#### Personalized Recommendations

**Endpoint:** `GET /search/recommendations/personalized`

Provides personalized content based on:

- User performance history
- Weak topic identification
- Difficulty level matching
- Learning patterns

#### Trending Content

**Endpoint:** `GET /search/recommendations/trending`

Shows trending content based on:

- Recent usage patterns
- Engagement metrics
- Time-based popularity
- Jurisdiction filtering

#### Topic-Based Recommendations

**Endpoint:** `GET /search/recommendations/by-topic`

Recommends content for specific topics with:

- Topic relevance scoring
- Difficulty targeting
- Content quality metrics

### 5. Content Tagging and Categorization

#### Automatic Content Analysis

**Endpoint:** `POST /search/tags/analyze`

Analyzes content to suggest:

- Relevant tags based on content
- Categories and subcategories
- Topic relevance scores
- Difficulty estimates
- Cognitive level classification

**Analysis Features:**

- Keyword-based topic detection
- Difficulty estimation using text complexity
- Cognitive level determination (Bloom's taxonomy)
- Automatic tag suggestions with confidence scores

#### Auto-Tagging

**Endpoint:** `POST /search/tags/auto-tag`

Automatically tags content items based on:

- Content analysis results
- High-confidence tag suggestions
- Existing tag patterns
- Topic keyword matching

#### Tag Management

- **Popular Tags:** `GET /search/tags/popular`
- **Tag Suggestions:** `GET /search/tags/suggestions`
- **Tag Co-occurrence:** `GET /search/tags/cooccurrence`

## Configuration

### Environment Variables

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password
NODE_ENV=development
```

### Index Settings

The Elasticsearch index is configured with:

- Standard analyzer for content
- Completion suggester for autocomplete
- Nested mapping for choices
- Keyword fields for exact matching
- Text fields for full-text search

## Integration with Content Lifecycle

The search system automatically:

1. Indexes items when published
2. Updates index when content changes
3. Removes items when archived or deleted
4. Maintains search relevance through lifecycle events

### Automatic Indexing

```typescript
// When item is published
await searchIntegrationService.handleItemPublished(item);

// When item is updated
await searchIntegrationService.handleItemUpdated(item, previousStatus);

// When item is deleted
await searchIntegrationService.handleItemDeleted(itemId);
```

## Performance Considerations

1. **Caching:** Search results and suggestions are cached in Redis
2. **Batch Operations:** Bulk indexing for large content updates
3. **Async Processing:** Non-blocking search index updates
4. **Connection Pooling:** Elasticsearch connection management
5. **Error Handling:** Graceful degradation when search is unavailable

## Monitoring and Health Checks

### Health Check Endpoint

**Endpoint:** `GET /search/health`

Monitors:

- Elasticsearch connectivity
- Index availability
- Service status

### Index Statistics

**Endpoint:** `GET /search/stats`

Provides:

- Document count
- Index size
- Last update timestamp
- Performance metrics

## Usage Examples

### Basic Search

```typescript
// Search for traffic sign content
const results = await fetch("/search?query=traffic signs&topics=road-signs");
```

### Faceted Search

```typescript
// Search with multiple filters
const results = await fetch("/search/faceted", {
  method: "POST",
  body: JSON.stringify({
    query: "parking",
    selectedFacets: {
      topics: ["parking-rules"],
      jurisdictions: ["CA"],
      difficultyRange: { min: 0, max: 1 },
    },
  }),
});
```

### Get Recommendations

```typescript
// Get similar content
const similar = await fetch("/search/recommendations/similar?itemId=123");

// Get personalized recommendations
const personalized = await fetch(
  "/search/recommendations/personalized?userId=456"
);
```

### Content Analysis

```typescript
// Analyze content for tags
const analysis = await fetch("/search/tags/analyze", {
  method: "POST",
  body: JSON.stringify({
    content: { text: "What does a stop sign mean?" },
    choices: [
      { text: "Come to a complete stop" },
      { text: "Slow down and proceed" },
    ],
  }),
});
```

## Future Enhancements

1. **Machine Learning Integration:**
   - Advanced recommendation algorithms
   - User behavior analysis
   - Content quality scoring

2. **Advanced Search Features:**
   - Semantic search
   - Image-based search
   - Voice search support

3. **Analytics and Insights:**
   - Search analytics dashboard
   - Content gap analysis
   - User engagement metrics

4. **Performance Optimizations:**
   - Search result caching
   - Predictive content loading
   - Real-time index updates
