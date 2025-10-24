import { emojis } from '../setupHelpers/emoji'
import { honorifics } from '../setupHelpers/honorifics'

export function randomEmoji() {
  return randomItem(emojis)
}
const randomItem = (list: unknown[]) => list[Math.floor(Math.random() * list.length)]

export const genericSetupFunctions = {
  concatenate: (...args: unknown[]) => args.join(''),
  randomEmoji: randomEmoji,
  randomHonorific: () => randomItem(honorifics),
}
