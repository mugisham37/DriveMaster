'use client'

import { Modal } from '@/components/common'
import { TrackIcon } from '@/components/common/TrackIcon'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'

interface Track {
  slug: string
  title: string
  iconUrl: string
  mode: 'learning' | 'practice'
}

interface PracticeModeModalProps {
  track: Track
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PracticeModeModal({ track, isOpen, onClose, onSuccess }: PracticeModeModalProps) {
  const isCurrentlyPracticeMode = track.mode === 'practice'
  const targetMode = isCurrentlyPracticeMode ? 'learning' : 'practice'
  
  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: `/api/tracks/${track.slug}/activate-${targetMode}-mode`,
    method: 'PATCH',
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
    successMessage: `${track.title} is now in ${targetMode} mode`
  })

  const handleSubmit = async () => {
    await submit({})
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="practice-mode-modal"
      ReactModalClassName="max-w-[500px]"
    >
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrackIcon 
            iconUrl={track.iconUrl}
            title={track.title}
            className="w-12 h-12"
          />
          <div>
            <h2 className="text-h2">
              Switch to {targetMode === 'practice' ? 'Practice' : 'Learning'} Mode
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Currently in {track.mode} mode
            </p>
          </div>
        </div>

        {targetMode === 'practice' ? (
          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GraphicalIcon icon="practice" className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                    Practice Mode
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                    Focus on solving exercises without guided learning. Perfect for experienced developers 
                    who want to practice their skills.
                  </p>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• Access to all unlocked exercises</li>
                    <li>• No concept explanations or learning materials</li>
                    <li>• Faster progression through exercises</li>
                    <li>• Focus on problem-solving and implementation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-2">What changes:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Concept exercises become optional</li>
                <li>• Practice exercises are unlocked immediately</li>
                <li>• Learning materials are hidden by default</li>
                <li>• You can switch back to learning mode anytime</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GraphicalIcon icon="learning" className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                    Learning Mode
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                    Structured learning path with concepts, explanations, and guided progression. 
                    Ideal for learning new languages or deepening your understanding.
                  </p>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    <li>• Guided learning path with concepts</li>
                    <li>• Detailed explanations and examples</li>
                    <li>• Progressive difficulty increase</li>
                    <li>• Comprehensive understanding focus</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-2">What changes:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Concept exercises become required</li>
                <li>• Practice exercises unlock after learning concepts</li>
                <li>• Learning materials are prominently displayed</li>
                <li>• Structured progression through the syllabus</li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-m btn-default"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <FormButton
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="btn-m btn-primary"
          >
            Switch to {targetMode === 'practice' ? 'Practice' : 'Learning'} Mode
          </FormButton>
        </div>
      </div>
    </Modal>
  )
}

export default PracticeModeModal