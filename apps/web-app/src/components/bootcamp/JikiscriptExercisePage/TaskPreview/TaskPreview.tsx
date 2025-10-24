import React, { useContext } from 'react'
import { wrapWithErrorBoundary } from '@/components/bootcamp/common/ErrorBoundary/wrapWithErrorBoundary'
import useTestStore from '../store/testStore'
import { StatePreview } from './StatePreview'
import { IOPreview } from './IOPreview'
import { useMountViewOrImage } from './useMountViewOrImage'
import { JikiscriptExercisePageContext } from '../JikiscriptExercisePageContextWrapper'

function TaskPreviewComponent() {
  const { exercise } = useContext(JikiscriptExercisePageContext)
  const { testSuiteResult, inspectedPreviewTaskTest } = useTestStore()

  const viewContainerRef = useMountViewOrImage({
    config: exercise.config as unknown as import('../../types/JikiscriptTypes').Config,
    taskTest: inspectedPreviewTaskTest as unknown as import('../../types/JikiscriptTypes').TaskTest | null,
    testSuiteResult,
    inspectedPreviewTaskTest: inspectedPreviewTaskTest as unknown as import('../../types/JikiscriptTypes').TaskTest | null,
  })

  if (testSuiteResult) {
    return null
  }

  return (
    <section data-ci="task-preview" className="c-scenario pending">
      {exercise.config.testsType === 'io' ? (
        <IOPreview inspectedPreviewTaskTest={inspectedPreviewTaskTest} />
      ) : (
        <StatePreview inspectedPreviewTaskTest={inspectedPreviewTaskTest} />
      )}
      <div ref={viewContainerRef} id="view-container" />
    </section>
  )
}

export const TaskPreview = wrapWithErrorBoundary(TaskPreviewComponent)
