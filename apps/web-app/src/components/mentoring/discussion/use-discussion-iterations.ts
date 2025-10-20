import { useState, useCallback } from 'react'
import { Iteration, MentorDiscussion } from '../../../types'

interface UseDiscussionIterationsProps {
  discussion?: MentorDiscussion | undefined
  iterations: readonly Iteration[]
}

export function useDiscussionIterations({ discussion, iterations: initialIterations }: UseDiscussionIterationsProps) {
  const [iterations, setIterations] = useState<Iteration[]>([...initialIterations])
  const [currentIterationIdx, setCurrentIterationIdx] = useState<number>(0)

  const addIteration = useCallback((iteration: Iteration) => {
    setIterations(prev => [...prev, iteration])
  }, [])

  const selectIteration = useCallback((idx: number) => {
    setCurrentIterationIdx(idx)
  }, [])

  const currentIteration = iterations[currentIterationIdx]
  const status = discussion?.status || 'pending'

  return {
    iterations,
    currentIteration,
    currentIterationIdx,
    addIteration,
    selectIteration,
    status,
  }
}

export default useDiscussionIterations