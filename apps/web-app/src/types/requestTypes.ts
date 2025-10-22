// Types for request parameters
export interface QueryParams {
  criteria?: string
  order?: string
  page?: number
  trackSlug?: string
}

export interface RequestQuery<T = unknown> {
  endpoint: {
    request: (params?: Record<string, unknown>) => Promise<T>
  }
  query?: Record<string, unknown>
}

export type DiscussionStatus = 'awaiting' | 'finished' | 'all'

export interface DiscussionQueryParams extends QueryParams {
  status: DiscussionStatus
}

// Types for responses
export interface PaginationMeta {
  current_page: number
  total_count: number
  total_pages: number
}

export interface Discussion {
  id: string
  status: DiscussionStatus
  track: {
    slug: string
    title: string
    iconUrl: string
  }
  exercise: {
    slug: string
    title: string
  }
  student: {
    handle: string
    avatarUrl: string
  }
  mentor: {
    handle: string
    avatarUrl: string
  }
  updatedAt: string
  linksToAllIterations: string[]
  posts: Array<{
    id: string
    content: string
    author: {
      handle: string
      avatarUrl: string
    }
    createdAt: string
    updatedAt: string
  }>
}

export interface Track {
  slug: string
  title: string
  iconUrl: string
  numSolutions: number
  numMentors: number
  links: {
    exercises: string
    mentoring: string
  }
}