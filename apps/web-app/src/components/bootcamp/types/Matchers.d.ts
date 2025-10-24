declare type AvailableMatchers =
  | 'toBe'
  | 'toBeTrue'
  | 'toBeFalse'
  | 'toBeDefined'
  | 'toBeUndefined'
  | 'toEqual'
  | 'toBeGreaterThan'
  | 'toBeLessThan'
  | 'toBeGreaterThanOrEqual'
  | 'toBeLessThanOrEqual'
  | 'toContain'
  | 'toMatch'
  | 'toIncludeSameMembers'

interface MatcherResult {
  actual: unknown
  pass: boolean
  codeRun?: string
  errorHtml?: string
  expected?: unknown
  matcher: AvailableMatchers
}
