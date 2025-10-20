import { SHARE_PLATFORMS, type SharePlatform } from '@/lib/config/share-platforms'

export function getShareUrl(platform: SharePlatform, title: string, url: string): string {
  return platform.url
    .replace('{title}', encodeURIComponent(title))
    .replace('{url}', encodeURIComponent(url))
}

export function shareNatively(title: string, url: string): Promise<void> {
  if (navigator.share) {
    return navigator.share({ title, url })
  }
  
  return Promise.reject(new Error('Native sharing not supported'))
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  
  // Fallback for older browsers
  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return Promise.resolve()
  } catch (err) {
    document.body.removeChild(textArea)
    return Promise.reject(err)
  }
}

export { SHARE_PLATFORMS }