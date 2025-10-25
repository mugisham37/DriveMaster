import { toPng } from 'html-to-image'

export async function captureIframeContent(
  iframeRef: React.RefObject<HTMLIFrameElement | null>
): Promise<Uint8ClampedArray | null> {
  if (!iframeRef.current) return null

  const iframe = iframeRef.current
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc || !iframeDoc.body) return null

  try {
    const dataUrl = await toPng(iframeDoc.body)
    // Convert data URL to canvas and extract pixel data
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    const img = new Image()
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        resolve(imageData.data)
      }
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch (error) {
    console.error('Error capturing iframe content:', error)
    return null
  }
}
