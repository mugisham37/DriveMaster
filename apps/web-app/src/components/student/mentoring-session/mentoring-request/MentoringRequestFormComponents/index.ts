import { useRef } from 'react'
import { useFormSubmission, type SubmissionStatus } from '@/hooks/useFormSubmission'

export function useMentoringRequest(
  links: { createMentorRequest?: string },
  onSuccess: () => void
) {
  const solutionCommentRef = useRef<HTMLTextAreaElement>(null)
  const trackObjectivesRef = useRef<HTMLTextAreaElement>(null)

  const { submit, status, error } = useFormSubmission({
    endpoint: links.createMentorRequest || '',
    method: 'POST',
    onSuccess,
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const formData = new FormData()
    if (solutionCommentRef.current?.value) {
      formData.append('solution_comment', solutionCommentRef.current.value)
    }
    if (trackObjectivesRef.current?.value) {
      formData.append('track_objectives', trackObjectivesRef.current.value)
    }

    submit(formData)
  }

  return {
    handleSubmit: handleFormSubmit,
    status,
    error,
    solutionCommentRef,
    trackObjectivesRef,
  }
}

export { SolutionCommentTextArea } from './SolutionCommentTextArea'
export { TrackObjectivesTextArea } from './TrackObjectivesTextArea'