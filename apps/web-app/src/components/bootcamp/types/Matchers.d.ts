declare type AvailableMatchers =
  | 'toBe'
  | 'toBeTrue'
  | 'toBeFalse'
  | 'toBeDefined'
  | 'toBeUndefined'
  | 'toEqual'
  | 'toBeGreaterThanOrEqual'
  | 'toBeLessThanOrEqual'
  | 'toIncludeSameMembers'

interface MatcherResult {
  actual: unknown
  pass: boolean
  codeRun?: string
  errorHtml?: string
  expected?: unknown
  matcher: AvailableMatchers
}
