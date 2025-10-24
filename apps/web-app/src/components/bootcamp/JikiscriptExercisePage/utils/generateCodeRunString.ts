import { formatJikiObject } from '@/lib/interpreter/helpers'

export function generateCodeRunString(fn: string | undefined, args: unknown[]) {
  if (!fn) return ''
  if (!args) return `${fn}()`
  args = args.map((p) => formatJikiObject(p))
  return `${fn}(${args.join(', ')})`
}
