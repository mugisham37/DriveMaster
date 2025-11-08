// Search utilities and API integration
export interface SearchFilters {
  category?: string;
  difficulty?: string;
  status?: string;
  tags?: string[];
}

export interface PaginatedSearchResult<T> {
  results: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  filters?: SearchFilters;
}

// Generic search function for API endpoints
export async function searchAPI<T>(
  endpoint: string,
  params: SearchParams,
): Promise<PaginatedSearchResult<T>> {
  const searchParams = new URLSearchParams();

  searchParams.append("q", params.query);

  if (params.page) {
    searchParams.append("page", params.page.toString());
  }

  if (params.limit) {
    searchParams.append("limit", params.limit.toString());
  }

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(`${key}[]`, v));
      } else if (value) {
        searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(`${endpoint}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

// Search tracks
export async function searchTracks(params: SearchParams) {
  return searchAPI("/api/tracks/search", params);
}

// Search exercises
export async function searchExercises(params: SearchParams) {
  return searchAPI("/api/exercises/search", params);
}

// Search users
export async function searchUsers(params: SearchParams) {
  return searchAPI("/api/users/search", params);
}

// Search solutions
export async function searchSolutions(params: SearchParams) {
  return searchAPI("/api/solutions/search", params);
}

// Client-side search utilities
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Fuzzy search scoring
export function fuzzyScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  if (textLower.includes(queryLower)) {
    // Exact substring match gets high score
    const index = textLower.indexOf(queryLower);
    return 100 - index; // Earlier matches score higher
  }

  // Character-by-character fuzzy matching
  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1;
      queryIndex++;
    }
  }

  // Return percentage of query characters found
  return (score / queryLower.length) * 50; // Max 50 for fuzzy matches
}

// Sort search results by relevance
export function sortByRelevance<T>(
  results: T[],
  query: string,
  getSearchableText: (item: T) => string,
): T[] {
  return results
    .map((item) => ({
      item,
      score: fuzzyScore(getSearchableText(item), query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
