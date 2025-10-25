import { rgb2hex } from '../../utils'

export function formatColorInputDefaultValue(input: string): string {
  if (input.startsWith('#')) return input

  const match = input.match(/rgb\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)/)
  if (match) {
    const [, r, g, b] = match
    if (r && g && b) {
      const rNum = parseInt(r, 10)
      const gNum = parseInt(g, 10)
      const bNum = parseInt(b, 10)
      return rgb2hex(rNum, gNum, bNum)
    }
  }

  return '#000000'
}
