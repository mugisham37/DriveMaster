// Utility function to assemble class names, preserving exact behavior from Rails implementation
export function assembleClassNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}