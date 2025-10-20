// Asset utility for Next.js - preserving exact behavior from Rails implementation
import { assetUrl as libAssetUrl } from '../lib/assets'

export function assetUrl(baseUrl: string): string {
  return libAssetUrl(baseUrl)
}