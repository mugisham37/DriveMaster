import { useCallback, useEffect, useRef } from 'react'
import { getIframesMatchPercentage } from '../utils/getIframesMatchPercentage'
import { updateIFrame } from '../utils/updateIFrame'

// set up expected output and reference output
export function useSetupIFrames(
  config: CSSExercisePageConfig,
  code: CSSExercisePageCode
) {
  const actualIFrameRef = useRef<HTMLIFrameElement | null>(null)
  const expectedIFrameRef = useRef<HTMLIFrameElement | null>(null)
  const expectedReferenceIFrameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const { html, css } = config.expected
    updateIFrame(expectedIFrameRef, { html, css }, code)
    updateIFrame(expectedReferenceIFrameRef, { html, css }, code)
  }, [config.expected, code])

  // since curtainMode and diffMode is off by default, we don't render the iframe
  // this updates the newly added iframe's inner value if curtainMode or diffMode is changed

  const handleCompare = useCallback(async () => {
    const percentage = await getIframesMatchPercentage(
      actualIFrameRef,
      expectedIFrameRef
    )

    return percentage
  }, [])

  return {
    actualIFrameRef,
    expectedIFrameRef,
    expectedReferenceIFrameRef,
    handleCompare,
  }
}

// Note: Example configurations removed to clean up unused code
// These were causing unused variable warnings and can be added back if needed
