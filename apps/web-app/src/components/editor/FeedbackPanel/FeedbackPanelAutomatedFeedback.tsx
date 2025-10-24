// i18n-key-prefix: feedbackPanelAutomatedFeedback
// i18n-namespace: components/editor/FeedbackPanel
import React from 'react'

import { FeedbackDetail } from './FeedbackDetail'
import { FeedbackPanelProps } from './FeedbackPanel'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export function AutomatedFeedback({
  iteration,
  open,
}: {
  iteration?: FeedbackPanelProps['iteration']
  open?: boolean
}): React.JSX.Element | null {
  const { t } = useAppTranslation('components/editor/FeedbackPanel')

  if (
    iteration &&
    (iteration.analyzerFeedback || iteration.representerFeedback)
  ) {
    return (
      <FeedbackDetail
        open={open ?? false}
        summary={t('feedbackDetail.automatedFeedback')}
      >
        <>
          {iteration.representerFeedback ? (
            <div className="representer-feedback">
              <div dangerouslySetInnerHTML={{ __html: iteration.representerFeedback.html || '' }} />
              <div className="feedback-author">
                By {iteration.representerFeedback.author.name}
                {iteration.representerFeedback.editor && (
                  <span> (edited by {iteration.representerFeedback.editor.name})</span>
                )}
              </div>
            </div>
          ) : null}
          {iteration.representerFeedback && iteration.analyzerFeedback && (
            <hr className="border-t-2 border-borderColor6 my-16" />
          )}
          {iteration.analyzerFeedback ? (
            <div className="analyzer-feedback">
              <div className="feedback-summary" dangerouslySetInnerHTML={{ __html: iteration.analyzerFeedback.summary || '' }} />
              {iteration.analyzerFeedback.comments.map((comment, index) => (
                <div key={index} className={`analyzer-comment analyzer-comment--${comment.type}`}>
                  <div dangerouslySetInnerHTML={{ __html: comment.html || '' }} />
                </div>
              ))}
            </div>
          ) : null}
        </>
      </FeedbackDetail>
    )
  } else return null
}
