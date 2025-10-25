import { numTagsUsed } from './html/numTagsUsed'
import { tagOccursNoMoreThan } from './html/tagOccursNoMoreThan'
import { Check, ChecksResult, runChecks } from './runChecks'

// Type-safe wrapper functions to match the expected signature
const htmlCheckFunctions: Record<string, (...args: unknown[]) => unknown> = {
  tagOccursNoMoreThan: (html: unknown, ...args: unknown[]) => {
    if (typeof html !== 'string') throw new Error('HTML must be a string')
    const [tagLimits] = args as [Record<string, number>]
    return tagOccursNoMoreThan(html, tagLimits)
  },
  numTagsUsed: (html: unknown, ...args: unknown[]) => {
    if (typeof html !== 'string') throw new Error('HTML must be a string')
    const [maxAllowedTags] = args as [number]
    return numTagsUsed(html, maxAllowedTags)
  },
}

export async function runHtmlChecks(
  checks: Check[],
  htmlValue: string
): Promise<ChecksResult> {
  return await runChecks(checks, htmlValue, htmlCheckFunctions)
}
