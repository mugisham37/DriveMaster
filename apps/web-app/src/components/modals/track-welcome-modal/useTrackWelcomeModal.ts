
import { sendRequest } from '@/utils/send-request'
import { useMachine } from '@/lib/xstate-mock'
import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { machine } from './LHS/TrackWelcomeModal.machine'
import { TrackWelcomeModalLinks } from './TrackWelcomeModal.types'
import { SeniorityLevel } from '../welcome-modal/WelcomeModal'

export function useTrackWelcomeModal(
  links: TrackWelcomeModalLinks,
  userSeniority: SeniorityLevel,
  userJoinedDaysAgo: number
) {
  const [open, setOpen] = useState(true)

  const [
    shouldShowBootcampRecommendationView,
    setShouldShowBootcampRecommendationView,
  ] = useState(
    !userSeniority ||
      (userSeniority.includes('beginner') && userJoinedDaysAgo >= 7)
  )

  const hideBootcampRecommendationView = useCallback(() => {
    setShouldShowBootcampRecommendationView(false)
  }, [])

  const { error } = useMutation({
    mutationFn: () => {
      const { fetch } = sendRequest({
        endpoint: links.hideModal,
        method: 'PATCH',
        body: undefined,
      })

      return fetch
    },
    onSuccess: () => {
      setOpen(false)
    },
  })

  const {} = useMutation({
    mutationFn: () => {
      const { fetch } = sendRequest({
        endpoint: links.activateLearningMode,
        method: 'PATCH',
        body: undefined,
      })

      return fetch
    },
  })

  const {} = useMutation({
    mutationFn: () => {
      const { fetch } = sendRequest({
        endpoint: links.activatePracticeMode,
        method: 'PATCH',
        body: undefined,
      })

      return fetch
    },
  })

  const [currentState, send] = useMachine(machine)

  return {
    open,
    currentState,
    send,
    error,
    shouldShowBootcampRecommendationView,
    hideBootcampRecommendationView,
  }
}
