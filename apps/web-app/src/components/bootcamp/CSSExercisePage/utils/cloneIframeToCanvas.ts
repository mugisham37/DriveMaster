import { toCanvas } from 'html-to-image'

// this is a good debugging util to see output of the pixel-data gained from the iframe
export async function cloneIframeToCanvas(
  iframeRef: React.RefObject<HTMLIFrameElement | null>
): Promise<HTMLCanvasElement | null> {
  const iframe = iframeRef.current
  if (!iframe) {
    return null
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc || !iframeDoc.body) {
    return null
  }

  try {
    const canvas = await toCanvas(iframeDoc.body)

    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    document.body.appendChild(canvas)

    return canvas
  } catch (err) {
    console.error('Failed to render iframe to canvas:', err)
    return null
  }
}
