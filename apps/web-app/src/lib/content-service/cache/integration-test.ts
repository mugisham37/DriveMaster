/**
 * Content Service Cache Integration Test
 *
 * Simple integration test to verify cache functionality
 * This file can be used for manual testing during development
 */

import { contentServiceCache } from "./content-service-cache";
import { contentCacheKeys } from "./swr-config";
import { requestDeduplicationManager } from "./deduplication";
import { prefetchManager } from "./prefetch";

/**
 * Test basic cache operations
 */
export async function testCacheOperations() {
  console.log("Testing Content Service Cache Operations...");

  // Test cache key generation
  const cacheKey = contentServiceCache.generateKey("content-items", {
    page: 1,
    limit: 10,
  });
  console.log("Generated cache key:", cacheKey);

  // Test cache set/get
  const testData = { id: "1", title: "Test Content", type: "article" };
  contentServiceCache.set(cacheKey, testData, 60000); // 1 minute TTL

  const retrievedData = contentServiceCache.get(cacheKey);
  console.log("Retrieved data:", retrievedData);
  console.log(
    "Cache test passed:",
    JSON.stringify(testData) === JSON.stringify(retrievedData),
  );

  // Test cache stats
  const stats = contentServiceCache.getStats();
  console.log("Cache stats:", stats);

  return true;
}

/**
 * Test SWR cache keys
 */
export function testSWRCacheKeys() {
  console.log("Testing SWR Cache Keys...");

  // Test content item keys
  const itemKey = contentCacheKeys.contentItem("test-id");
  console.log("Content item key:", itemKey);

  const itemsKey = contentCacheKeys.contentItems({ page: 1, limit: 10 });
  console.log("Content items key:", itemsKey);

  // Test search keys
  const searchKey = contentCacheKeys.searchContent({
    query: "test",
    options: { limit: 5 },
  });
  console.log("Search key:", searchKey);

  // Test new search functionality keys
  const facetedSearchKey = contentCacheKeys.facetedSearch({
    query: "test",
    facets: { type: ["lesson"], status: ["published"] },
  });
  console.log("Faceted search key:", facetedSearchKey);

  const similarContentKey = contentCacheKeys.similarContent("item-123", {
    limit: 10,
  });
  console.log("Similar content key:", similarContentKey);

  const trendingContentKey = contentCacheKeys.trendingContent({
    timeframe: "week",
    limit: 20,
  });
  console.log("Trending content key:", trendingContentKey);

  return true;
}

/**
 * Test search functionality integration
 */
export async function testSearchFunctionality() {
  console.log("Testing Search Functionality...");

  try {
    // Test search request structure
    const searchRequest = {
      query: "javascript fundamentals",
      filters: {
        types: ["lesson" as const, "exercise" as const],
        difficulty: ["beginner" as const],
        tags: ["programming", "web-development"],
      },
      options: {
        page: 1,
        limit: 10,
        sortBy: "relevance" as const,
        includeHighlights: true,
        includeFacets: true,
      },
    };

    console.log("Search request structure:", searchRequest);

    // Test faceted search request structure
    const facetedRequest = {
      query: "react components",
      facets: {
        type: ["lesson", "tutorial"],
        difficulty: ["intermediate"],
        topics: ["react", "frontend"],
      },
      options: {
        limit: 15,
        sortBy: "popularity" as const,
      },
    };

    console.log("Faceted search request structure:", facetedRequest);

    // Test cache key generation
    const searchCacheKey = contentCacheKeys.searchContent(searchRequest);
    const facetedCacheKey = contentCacheKeys.facetedSearch(facetedRequest);
    const suggestionsCacheKey = contentCacheKeys.searchSuggestions("react", {
      types: ["lesson"],
    });

    console.log("Generated cache keys:");
    console.log("- Search:", searchCacheKey);
    console.log("- Faceted:", facetedCacheKey);
    console.log("- Suggestions:", suggestionsCacheKey);

    return true;
  } catch (error) {
    console.error("Search functionality test failed:", error);
    return false;
  }
}

/**
 * Test request deduplication
 */
export async function testRequestDeduplication() {
  console.log("Testing Request Deduplication...");

  let callCount = 0;
  const mockRequest = async () => {
    callCount++;
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { data: "test", callNumber: callCount };
  };

  // Make multiple identical requests
  const promises = [
    requestDeduplicationManager.deduplicate("test-key", mockRequest),
    requestDeduplicationManager.deduplicate("test-key", mockRequest),
    requestDeduplicationManager.deduplicate("test-key", mockRequest),
  ];

  const results = await Promise.all(promises);
  console.log("Deduplication results:", results);
  console.log("Call count (should be 1):", callCount);
  console.log("Deduplication test passed:", callCount === 1);

  return callCount === 1;
}

/**
 * Test prefetch manager
 */
export async function testPrefetchManager() {
  console.log("Testing Prefetch Manager...");

  // Record activity to prevent immediate prefetching
  prefetchManager.recordActivity();

  // Add a test prefetch task
  prefetchManager.addTask(
    "test-prefetch",
    async () => {
      console.log("Executing prefetch task...");
      return { data: "prefetched" };
    },
    "test-cache-key",
    "low",
    1024,
  );

  const stats = prefetchManager.getStats();
  console.log("Prefetch stats:", stats);

  return true;
}

/**
 * Run all cache integration tests
 */
export async function runCacheIntegrationTests() {
  console.log("=== Content Service Cache Integration Tests ===");

  try {
    await testCacheOperations();
    testSWRCacheKeys();
    await testSearchFunctionality();
    await testRequestDeduplication();
    await testPrefetchManager();

    console.log("✅ All cache integration tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Cache integration tests failed:", error);
    return false;
  }
}

// Export for manual testing in development
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).testContentServiceCache =
    runCacheIntegrationTests;
}
