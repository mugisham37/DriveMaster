import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loading } from '../common'
import { Iteration } from '../types'
import { IterationReport } from './iterations-list/IterationReport'
import { EmptyIterations } from './iterations-list/EmptyIterations'
import { usePaginatedRequestQuery } from '../../hooks/request-query'
import { SolutionChannel } from '../../channels/solutionChannel'
import { GithubSyncerSettings } from '../settings/github-syncer/GitHubSyncerForm'

export type Exercise = {
  title: string
  slug: string
  downloadCmd: string
  hasTestRunner: boolean
}

export type Track = {
  title: string
  slug: string
  iconUrl: string
  highlightjsLanguage: string
  indentSize: number
}

export type Links = {
  getMentoring: string
  automatedFeedbackInfo: string
  startExercise: string
  solvingExercisesLocally: string
  toolingHelp: string
  githubSyncerSettings: string
  syncIteration: string
}

export type IterationsListRequest = {
  endpoint: string
  options: {
    initialData: {
      iterations: readonly Iteration[]
    }
  }
}

const getCacheKey = (
  trackSlug: string,
  exerciseSlug: string
): string => {
  return `iterations-${trackSlug}-${exerciseSlug}`
}

export type IterationsListProps = {
  solutionUuid: string
  request: IterationsListRequest
  exercise: Exercise
  track: Track
  links: Links
  syncer: GithubSyncerSettings | null
}

export default function IterationsList({
  solutionUuid,
  request,
  exercise,
  track,
}: IterationsListProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean[]>([])

  const queryClient = useQueryClient()
  const CACHE_KEY = getCacheKey(track.slug, exercise.slug)

  useEffect(() => {
    queryClient.setQueryData([CACHE_KEY], request.options.initialData)
  }, [CACHE_KEY, queryClient, request.options.initialData])

  const { data: resolvedData } = usePaginatedRequestQuery<{
    iterations: readonly Iteration[]
  }>([CACHE_KEY], {
    ...request,
    options: { ...request.options, staleTime: 1000 },
  })



  useEffect(() => {
    const solutionChannel = SolutionChannel.getInstance()
    
    const unsubscribe = solutionChannel.subscribe((data: unknown) => {
      const response = data as { iterations: Iteration[] }
      queryClient.setQueryData([CACHE_KEY], {
        iterations: response.iterations,
      })
    })

    return unsubscribe
  }, [CACHE_KEY, solutionUuid, queryClient])

  useEffect(() => {
    if (
      !resolvedData ||
      !resolvedData.iterations ||
      resolvedData.iterations.length === 0
    ) {
      return
    }

    if (isOpen.length === 0) {
      setIsOpen(resolvedData.iterations.map((_: Iteration, i: number) => i === 0))

      return
    }

    const newIterationsLength = resolvedData.iterations.length - isOpen.length

    if (newIterationsLength > 0) {
      const newIsOpen = Array.from(Array(newIterationsLength)).map((_: undefined, i: number) =>
        i === 0 ? !isOpen.some((o) => o === true) : false
      )

      setIsOpen([...newIsOpen, ...isOpen])
    }
  }, [isOpen, isOpen.length, resolvedData])

  if (!resolvedData) {
    return <Loading />
  }

  if (resolvedData.iterations.length === 0) {
    return <EmptyIterations exerciseTitle={exercise.title} />
  }

  return (
    <div className="lg-container container">
      <section className="iterations">
        {resolvedData.iterations
          .slice()
          .sort((it1: Iteration, it2: Iteration) => {
            return it2.idx > it1.idx ? 1 : -1
          })
          .map((iteration: Iteration, index: number) => {
            return (
              <IterationReport
                key={index}
                iteration={iteration}
              />
            )
          })}
      </section>
    </div>
  )
}

export { getCacheKey }