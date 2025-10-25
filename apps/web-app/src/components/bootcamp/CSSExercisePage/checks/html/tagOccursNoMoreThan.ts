// tagLimits is {div: 2}, etc
export function tagOccursNoMoreThan(
  html: string,
  tagLimits: Record<string, number>
): boolean {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const tagCounts: Record<string, number> = {}

  for (const tag in tagLimits) {
    const elements = doc.getElementsByTagName(tag)
    const count = elements.length
    tagCounts[tag] = count
    const limit = tagLimits[tag]
    if (limit !== undefined && count > limit) {
      return false
    }
  }

  return true
}
