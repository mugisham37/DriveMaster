import { useCallback, useState } from 'react'
import { Iteration } from '../../../types'

interface UseIterationScrollingProps {
  iterations: Iteration[]
  on: boolean
}

export function useIterationScrolling({ iterations, on }: UseIterationScrollingProps) {
  const [currentIterationIdx, setCurrentIterationIdx] = useState(0)

  const scrollToIteration = useCallback((iterationIdx: number) => {
    const element = document.getElementById(`iteration-${iterationIdx}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleIterationClick = useCallback((idx: number) => {
    setCurrentIterationIdx(idx)
    if (on) {
      scrollToIteration(idx)
    }
  }, [on, scrollToIteration])

  const handleIterationScroll = useCallback((idx: number) => {
    if (on) {
      scrollToIteration(idx)
    }
  }, [on, scrollToIteration])

  const currentIteration = iterations[currentIterationIdx]

  return {
    scrollToIteration,
    currentIteration,
    handleIterationClick,
    handleIterationScroll,
  }
}

export default useIterationScrolling