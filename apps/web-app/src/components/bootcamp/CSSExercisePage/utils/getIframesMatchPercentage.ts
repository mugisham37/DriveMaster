import { getIframePixels } from './getIframePixels'
import { getPixelsMatchPercentage } from './getPixelsMatchPercentage'

export async function getIframesMatchPercentage(
  actualIFrameRef: React.RefObject<HTMLIFrameElement | null>,
  expectedIFrameRef: React.RefObject<HTMLIFrameElement | null>
): Promise<number> {
  const actualPixels = await getIframePixels(actualIFrameRef)
  const expectedPixels = await getIframePixels(expectedIFrameRef)

  return getPixelsMatchPercentage(actualPixels, expectedPixels)
}
